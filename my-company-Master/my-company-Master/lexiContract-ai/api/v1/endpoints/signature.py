from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import uuid
from lxml import etree

from .... import core, models, schemas
from .. import dependencies
from ....core.docusign_client import DocuSignClient
from ....core.websockets import room_manager

router = APIRouter()

@router.post(
    "/contracts/{contract_id}/signature/initiate",
    response_model=schemas.Contract,
    summary="Initiate Signature Process",
    description="Creates and sends a DocuSign envelope for a contract.",
)
def initiate_signature_process(
    contract_id: uuid.UUID,
    request_data: schemas.InitiateSignatureRequest,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    # 1. Get the contract and authorize
    contract = core.crud.get_contract_by_id(db, contract_id=contract_id, organization_id=current_user.organization_id)
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    
    # 2. Get the latest version's text/document
    latest_version = contract.versions[-1] if contract.versions else None
    if not latest_version or not latest_version.full_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contract has no content to send for signature.")
    
    # A real implementation would generate a clean PDF. For now, we use the raw text.
    document_bytes = latest_version.full_text.encode('utf-8')

    # 3. Get the organization's DocuSign integration credentials
    org_integration = core.crud.get_organization_integration_by_name(db, organization_id=current_user.organization_id, integration_name="DocuSign")
    if not org_integration:
        raise HTTPException(status_code=status.HTTP_412_PRECONDITION_FAILED, detail="DocuSign integration is not configured for this organization.")

    # 4. Create Signer records in our DB
    db_signers = core.crud.create_signers_for_contract(db, contract_id=contract.id, signers=request_data.signers)

    try:
        # 5. Initialize the DocuSign client and send the envelope
        docusign_client = DocuSignClient(org_integration)
        email_subject = request_data.email_subject.format(contract_filename=contract.filename)

        envelope_summary = docusign_client.create_and_send_envelope(
            contract_filename=contract.filename,
            document_bytes=document_bytes,
            signers=[s.model_dump() for s in request_data.signers],
            email_subject=email_subject,
            email_body=request_data.email_body
        )
        
        envelope_id = envelope_summary.get('envelope_id')

        # 6. Update our contract and signer records with DocuSign info
        core.crud.update_contract_signature_status(db, contract=contract, status=models.SignatureStatus.sent, envelope_id=envelope_id)
        core.crud.link_signers_to_docusign_recipients(db, contract_id=contract.id, signers=db_signers)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to send DocuSign envelope: {e}")

    # Re-fetch the contract to return the updated state with signers
    updated_contract = core.crud.get_contract_by_id(db, contract_id=contract_id, organization_id=current_user.organization_id)
    return updated_contract


@router.post(
    "/signature/webhook/docusign",
    summary="DocuSign Connect Webhook",
    description="Receives real-time envelope status updates from DocuSign.",
    include_in_schema=False, # This is not for direct user interaction
)
async def docusign_webhook(
    request: Request,
    db: Session = Depends(dependencies.get_db),
):
    """
    This endpoint listens for webhook events from DocuSign Connect.
    It parses the XML payload and updates the status of contracts and signers.
    """
    payload = await request.body()
    try:
        # DocuSign Connect sends XML, so we parse it
        root = etree.fromstring(payload)
        ns = {'ds': root.nsmap.get(None)} # Handle default namespace

        envelope_id = root.findtext('.//ds:EnvelopeID', namespaces=ns)
        envelope_status = root.findtext('.//ds:Status', namespaces=ns)

        if not envelope_id:
            return {"status": "ok", "message": "No envelope ID found."}

        contract = core.crud.get_contract_by_envelope_id(db, envelope_id=envelope_id)
        if not contract:
            # It's possible to get webhooks for envelopes not in our system.
            # Acknowledge receipt to prevent DocuSign from retrying.
            return {"status": "ok", "message": "Contract for envelope not found."}

        # Update individual signer statuses
        recipient_statuses = root.findall('.//ds:RecipientStatus', namespaces=ns)
        for recipient in recipient_statuses:
            recipient_id = recipient.findtext('ds:RecipientId', namespaces=ns)
            status_text = recipient.findtext('ds:Status', namespaces=ns)
            core.crud.update_signer_status_by_signing_order(db, contract_id=contract.id, signing_order=int(recipient_id), new_status_str=status_text)

        # Update overall contract status if it's completed
        if envelope_status.lower() == 'completed':
            core.crud.update_contract_signature_status(db, contract=contract, status=models.SignatureStatus.completed)

        # Broadcast the update to any connected clients
        updated_contract = core.crud.get_contract_by_id(db, contract_id=contract.id, organization_id=contract.organization_id)
        await room_manager.broadcast(
            {"type": "signature_status_updated", "payload": schemas.Contract.from_orm(updated_contract).model_dump()},
            room_id=str(contract.id)
        )

    except etree.XMLSyntaxError as e:
        print(f"DocuSign Webhook XML Error: {e}")
    except Exception as e:
        print(f"Error processing DocuSign webhook: {e}")

    # Always return a 200 OK to DocuSign to acknowledge receipt
    return {"status": "ok"}