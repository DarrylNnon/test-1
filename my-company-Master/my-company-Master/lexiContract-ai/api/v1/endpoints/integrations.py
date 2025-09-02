from fastapi import APIRouter, Depends, HTTPException, status, Request, Header, BackgroundTasks
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from uuid import UUID
import httpx

from api.v1 import dependencies
from core import crud, schemas, models
from core import crud, schemas, models, security, analyzer
from core.config import settings
from core.salesforce_client import SalesforceClient
from core.hubspot_client import HubSpotClient
from core.google_drive_client import GoogleDriveClient

router = APIRouter()

@router.get(
    "/",
    response_model=list[schemas.Integration],
    summary="List Available Integrations",
)
def list_available_integrations(db: Session = Depends(dependencies.get_db)):
    """
    Retrieve a list of all integrations the platform supports.
    """
    return crud.get_available_integrations(db)

@router.get(
    "/organization",
    response_model=list[schemas.OrganizationIntegration],
    summary="List Organization's Connected Integrations",
)
def list_organization_integrations(
    *,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Retrieve a list of all integrations connected by the current user's organization.
    """
    return crud.get_organization_integrations(db, organization_id=current_user.organization_id)

@router.post(
    "/organization/{integration_id}",
    response_model=schemas.OrganizationIntegration,
    status_code=status.HTTP_201_CREATED,
    summary="Connect a New Integration",
)
def connect_organization_integration(
    *,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
    integration_id: UUID,
    integration_in: schemas.OrganizationIntegrationCreate,
):
    """
    Create a new connection to an integration for the user's organization.
    The `credentials` field should contain the necessary auth info (e.g., API key).
    """
    # In a real app, you'd check if the integration exists and isn't already connected.
    return crud.create_organization_integration(db, obj_in=integration_in, organization_id=current_user.organization_id, integration_id=integration_id)

@router.delete("/organization/{org_integration_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Disconnect an Integration")
def disconnect_organization_integration(
    *,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
    org_integration_id: UUID,
):
    """
    Disconnect and remove an integration for the user's organization.
    """
    crud.remove_organization_integration(db, org_integration_id=org_integration_id, organization_id=current_user.organization_id)

# --- Salesforce Specific OAuth 2.0 Flow ---

@router.get(
    "/salesforce/auth",
    summary="Initiate Salesforce Connection",
    description="Redirects the user to Salesforce to authorize the integration.",
)
def salesforce_auth_redirect(
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    state = security.create_oauth_state_token(organization_id=str(current_user.organization_id))
    auth_url = (
        f"https://login.salesforce.com/services/oauth2/authorize?"
        f"response_type=code&"
        f"client_id={settings.SALESFORCE_CLIENT_ID}&"
        f"redirect_uri={settings.SALESFORCE_REDIRECT_URI}&"
        f"state={state}"
    )
    return RedirectResponse(url=auth_url)


@router.get(
    "/salesforce/callback",
    summary="Salesforce OAuth Callback",
    description="Handles the callback from Salesforce after user authorization. Do not call directly.",
)
async def salesforce_auth_callback(
    request: Request,
    db: Session = Depends(dependencies.get_db),
):
    code = request.query_params.get("code")
    state = request.query_params.get("state")

    organization_id_str = security.verify_oauth_state_token(state)
    if not organization_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired state token. Please try connecting again.")

    token_url = "https://login.salesforce.com/services/oauth2/token"
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": settings.SALESFORCE_CLIENT_ID,
        "client_secret": settings.SALESFORCE_CLIENT_SECRET,
        "redirect_uri": settings.SALESFORCE_REDIRECT_URI,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=payload)

    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to retrieve token from Salesforce: {response.text}")

    token_data = response.json()
    credentials = {"access_token": token_data["access_token"], "refresh_token": token_data["refresh_token"]}
    metadata = {"instance_url": token_data["instance_url"]}

    salesforce_integration = crud.get_integration_by_name(db, name="Salesforce")
    if not salesforce_integration:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Salesforce integration not found in system.")

    crud.upsert_organization_integration(db, organization_id=UUID(organization_id_str), integration_id=salesforce_integration.id, credentials=credentials, metadata=metadata)

    # Redirect user back to the frontend integrations page
    return RedirectResponse(url="/settings/integrations?success=salesforce")
    

@router.get(
    "/google-drive/files",
    summary="List Files from Google Drive",
    description="Lists files from the connected user's Google Drive, filtered for common document types.",
)
async def list_google_drive_files(
    q: str | None = None,
    page_token: str | None = None,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    try:
        gdrive_client = GoogleDriveClient(db, organization_id=current_user.organization_id)
        return await gdrive_client.list_files(page_token=page_token, search_query=q)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to list Google Drive files: {e}")

class GoogleDriveImportPayload(schemas.BaseModel):
    file_id: str
    file_name: str

@router.post(
    "/google-drive/import",
    response_model=schemas.Contract,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Import File from Google Drive",
    description="Imports a selected file from Google Drive, creates a contract record, and starts the analysis.",
)
async def import_google_drive_file(
    payload: GoogleDriveImportPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    try:
        gdrive_client = GoogleDriveClient(db, organization_id=current_user.organization_id)
        file_bytes = await gdrive_client.download_file(payload.file_id)

        contract = crud.create_contract_for_import(db=db, filename=payload.file_name, user_id=current_user.id, organization_id=current_user.organization_id, org_integration_id=gdrive_client.org_integration.id, external_id=payload.file_id)

        background_tasks.add_task(analyzer.analyze_contract, version_id=contract.versions[0].id, file_contents=file_bytes, filename=payload.file_name)
        
        return contract
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to import file from Google Drive: {e}")

# --- HubSpot Specific OAuth 2.0 Flow ---

@router.get(
    "/hubspot/auth",
    summary="Initiate HubSpot Connection",
    description="Redirects the user to HubSpot to authorize the integration.",
)
def hubspot_auth_redirect(
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    state = security.create_oauth_state_token(organization_id=str(current_user.organization_id))
    # Required scopes for reading/writing deals and reading files
    scopes = "crm.objects.deals.read crm.objects.deals.write files crm.schemas.deals.read"
    auth_url = (
        f"https://app.hubspot.com/oauth/authorize?"
        f"client_id={settings.HUBSPOT_CLIENT_ID}&"
        f"redirect_uri={settings.HUBSPOT_REDIRECT_URI}&"
        f"scope={scopes}&"
        f"state={state}"
    )
    return RedirectResponse(url=auth_url)


@router.get(
    "/hubspot/callback",
    summary="HubSpot OAuth Callback",
    description="Handles the callback from HubSpot after user authorization. Do not call directly.",
)
async def hubspot_auth_callback(
    request: Request,
    db: Session = Depends(dependencies.get_db),
):
    code = request.query_params.get("code")
    state = request.query_params.get("state")

    organization_id_str = security.verify_oauth_state_token(state)
    if not organization_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired state token. Please try connecting again.")

    token_url = "https://api.hubapi.com/oauth/v1/token"
    payload = {
        "grant_type": "authorization_code",
        "client_id": settings.HUBSPOT_CLIENT_ID,
        "client_secret": settings.HUBSPOT_CLIENT_SECRET,
        "redirect_uri": settings.HUBSPOT_REDIRECT_URI,
        "code": code,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=payload)

    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to retrieve token from HubSpot: {response.text}")

    token_data = response.json()
    credentials = {"access_token": token_data["access_token"], "refresh_token": token_data["refresh_token"]}

    hubspot_integration = crud.get_integration_by_name(db, name="HubSpot")
    if not hubspot_integration:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="HubSpot integration not found in system.")

    crud.upsert_organization_integration(db, organization_id=UUID(organization_id_str), integration_id=hubspot_integration.id, credentials=credentials, metadata={})

    return RedirectResponse(url="/settings/integrations?success=hubspot")

class HubSpotWebhookPayload(schemas.BaseModel):
    organization_id: UUID
    deal_id: str

@router.post(
    "/hubspot/webhook",
    status_code=status.HTTP_202_ACCEPTED,
    summary="HubSpot Webhook Receiver",
    description="Receives a payload from a HubSpot Workflow to initiate a contract review.",
)
async def hubspot_webhook(
    payload: HubSpotWebhookPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(dependencies.get_db),
):
    # Note: HubSpot webhook security can be enhanced by validating a signature
    # https://developers.hubspot.com/docs/api/webhooks/validating-requests
    background_tasks.add_task(
        create_contract_from_hubspot,
        db=db,
        organization_id=payload.organization_id,
        deal_id=payload.deal_id
    )
    return {"message": "Contract creation process initiated."}

async def create_contract_from_hubspot(*, db: Session, organization_id: UUID, deal_id: str):
    """Background task to create a contract from a HubSpot Deal."""
    print(f"Initiating contract creation from HubSpot Deal ID: {deal_id}")
    try:
        hs_client = HubSpotClient(db, organization_id=organization_id)
        deal_data = await hs_client.get_deal(deal_id)
        
        deal_name = deal_data.get("properties", {}).get("dealname", "Unknown Deal")
        filename = f"{deal_name} - Draft.txt"
        
        # In a real implementation, we would also fetch and download an associated file.
        contract = crud.create_contract_from_external_source(
            db, 
            organization_id=organization_id, 
            org_integration_id=hs_client.org_integration.id, 
            external_id=deal_id, 
            filename=filename
        )
        analyzer.schedule_analysis(contract.id, "This is a placeholder contract created from HubSpot.")
    except Exception as e:
        print(f"Error creating contract from HubSpot Deal {deal_id}: {e}")


class ContractStatusUpdate(schemas.BaseModel):
    status: str

@router.put(
    "/contracts/{contract_id}/status",
    response_model=schemas.Contract,
    summary="Update Contract Negotiation Status",
    description="Updates the negotiation status of a contract and triggers a sync to external systems like Salesforce if connected.",
)
def update_contract_status(
    *,
    db: Session = Depends(dependencies.get_db),
    background_tasks: BackgroundTasks,
    contract_id: UUID,
    status_in: ContractStatusUpdate,
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    contract = crud.get_contract(db, contract_id=contract_id)
    if not contract or contract.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    # Update the status in our database
    contract.negotiation_status = status_in.status
    db.commit()
    db.refresh(contract)

    # If linked to an external system, trigger a background sync
    if contract.external_id and contract.organization_integration_id:
        background_tasks.add_task(
            sync_status_to_external_system,
            db=db,
            contract_id=contract.id,
            new_status=status_in.status
        )

    return contract

async def sync_status_to_external_system(*, db: Session, contract_id: UUID, new_status: str):
    """Background task to sync a contract's status back to a connected external system (CRM)."""
    contract = crud.get_contract(db, contract_id=contract_id)
    if not contract or not contract.external_id or not contract.organization_integration:
        return

    integration_name = contract.organization_integration.integration.name

    try:
        if integration_name == "Salesforce":
            print(f"Syncing status '{new_status}' for contract {contract.id} to Salesforce Opportunity {contract.external_id}")
            sf_client = SalesforceClient(db, organization_id=contract.organization_id)
            await sf_client.update_opportunity(contract.external_id, {"LexiContract_Status__c": new_status})
        elif integration_name == "HubSpot":
            print(f"Syncing status '{new_status}' for contract {contract.id} to HubSpot Deal {contract.external_id}")
            hs_client = HubSpotClient(db, organization_id=contract.organization_id)
            await hs_client.update_deal(contract.external_id, {"properties": {"lexicontract_status": new_status}})
        elif integration_name == "HubSpot":
            print(f"Syncing status '{new_status}' for contract {contract.id} to HubSpot Deal {contract.external_id}")
            hs_client = HubSpotClient(db, organization_id=contract.organization_id)
            await hs_client.update_deal(contract.external_id, {"properties": {"lexicontract_status": new_status}})
    except Exception as e:
        print(f"Error syncing status to {integration_name} for contract {contract.id}: {e}")

class SalesforceWebhookPayload(schemas.BaseModel):
    organization_id: UUID
    opportunity_id: str

@router.post(
    "/salesforce/webhook",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Salesforce Webhook Receiver",
    description="Receives a payload from a Salesforce Apex trigger to initiate a contract review.",
)
async def salesforce_webhook(
    payload: SalesforceWebhookPayload,
    background_tasks: BackgroundTasks,
    x_webhook_secret: str = Header(...),
    db: Session = Depends(dependencies.get_db),
):
    # --- Webhook Security ---
    # In a real app, the secret would be unique per org and stored in OrganizationIntegration.metadata
    # For this example, we'll use a global secret from settings.
    # if not security.verify_password(x_webhook_secret, settings.SALESFORCE_WEBHOOK_SECRET):
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid webhook secret.")

    background_tasks.add_task(
        create_contract_from_salesforce,
        db=db,
        organization_id=payload.organization_id,
        opportunity_id=payload.opportunity_id
    )
    return {"message": "Contract creation process initiated."}

async def create_contract_from_salesforce(*, db: Session, organization_id: UUID, opportunity_id: str):
    """Background task to create a contract from a Salesforce Opportunity."""
    print(f"Initiating contract creation from Salesforce Opportunity ID: {opportunity_id}")
    sf_client = SalesforceClient(db, organization_id=organization_id)
    opportunity_data = await sf_client.get_opportunity(opportunity_id)
    
    # In a real implementation, we would download the associated file. Here we create a placeholder.
    filename = f"{opportunity_data.get('Name', 'Unknown Opp')} - Draft.txt"
    contract = crud.create_contract_from_external_source(db, organization_id=organization_id, org_integration_id=sf_client.org_integration.id, external_id=opportunity_id, filename=filename)
    analyzer.schedule_analysis(contract.id, "This is a placeholder contract created from Salesforce.")

def create_contract_from_external_source(db: Session, *, organization_id: UUID, org_integration_id: UUID, external_id: str, filename: str) -> models.Contract:
    """
    Creates a contract record originating from an external system like a CRM.
    """
    # Find the first user of the organization to assign as the uploader
    uploader = db.query(models.User).filter(models.User.organization_id == organization_id).first()
    if not uploader:
        raise ValueError("Cannot create contract: No users found in the organization.")

    db_contract = models.Contract(
        filename=filename,
        uploader_id=uploader.id,
        organization_id=organization_id,
        organization_integration_id=org_integration_id,
        external_id=external_id,
        analysis_status='pending'
    )
    db.add(db_contract)
    db.commit()
    db.refresh(db_contract)
    return db_contract