from fastapi import (
    APIRouter, Depends, HTTPException, status, File, UploadFile,
    BackgroundTasks, WebSocket, WebSocketDisconnect, Query
)
from sqlalchemy.orm import Session
import uuid
from typing import List

from core import crud, models, schemas, analyzer
from api.v1 import dependencies
from core.database import get_db
from core.websockets import manager
from core.websockets import room_manager, user_manager

router = APIRouter()

@router.post("/upload", response_model=schemas.Contract, status_code=status.HTTP_201_CREATED)
async def upload_contract(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_active_subscriber),
):
    """
    Uploads a contract file for analysis.
    - Stores the file (conceptually, e.g., in S3).
    - Creates a contract record in the database.
    - Triggers a background task for AI analysis.
    """
    # In a real app, you'd upload to S3 and get a key.
    # For now, we'll use the filename as a placeholder key.
    s3_object_key = f"contracts/{current_user.organization_id}/{uuid.uuid4()}-{file.filename}"

    contract_create = schemas.ContractCreate(filename=file.filename, s3_object_key=s3_object_key)
    db_contract = crud.create_contract(
        db=db,
        contract=contract_create,
        user_id=current_user.id,
        organization_id=current_user.organization_id
    )

    # Read file contents to pass to the background task
    file_contents = await file.read()

    # Add the analysis task to the background
    background_tasks.add_task(
        analyzer.analyze_contract,
        contract_id=db_contract.id,
        file_contents=file_contents,
        filename=file.filename
    )

    return db_contract

@router.get("/", response_model=List[schemas.Contract])
def list_contracts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    Retrieve all contracts for the user's organization.
    """
    contracts = crud.get_contracts_by_organization(
        db, organization_id=current_user.organization_id, skip=skip, limit=limit
    )
    return contracts

@router.get("/{contract_id}", response_model=schemas.Contract)
def read_contract(
    contract_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    Retrieve a single contract by its ID.
    """
    db_contract = crud.get_contract_by_id(
        db, contract_id=contract_id, organization_id=current_user.organization_id
    )
    if db_contract is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    return db_contract

@router.websocket("/{contract_id}/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    contract_id: uuid.UUID,
    current_user: models.User = Depends(dependencies.get_current_user_ws),
    db: Session = Depends(get_db),
):
    """
    Handles WebSocket connections for real-time collaboration on a contract.
    Authenticates user via a token in the query parameters.
    """
    # Verify user has access to the contract
    contract = crud.get_contract_by_id(
        db, contract_id=contract_id, organization_id=current_user.organization_id
    )
    if not contract:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Not Found or Access Denied")
        return

    room_id = str(contract_id)
    await room_manager.connect(websocket, room_id)
    try:
        while True:
            # Keep connection alive to receive broadcasts.
            await websocket.receive_text()
    except WebSocketDisconnect:
        room_manager.disconnect(websocket, room_id)

@router.post("/{contract_id}/send-for-signature", status_code=status.HTTP_202_ACCEPTED)
async def send_for_signature(
    contract_id: uuid.UUID,
    signature_request: schemas.SignatureRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_active_subscriber),
):
    """
    Initiates the e-signature process for a finalized contract.
    """
    db_contract = crud.get_contract_by_id(
        db, contract_id=contract_id, organization_id=current_user.organization_id
    )
    if db_contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    if not db_contract.full_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contract text is not available for signing.")

    if db_contract.signature_status not in [None, 'none', 'failed']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Contract is already out for signature with status: {db_contract.signature_status}")

    # In a real app, we'd generate the final document from redlines here.
    # For now, we'll use the stored full_text.
    document_to_sign = db_contract.full_text

    # Call the mock e-signature service
    request_id = signature_service.send_for_signature(
        document_content=document_to_sign,
        signers=[signer.model_dump() for signer in signature_request.signers]
    )

    # Update the contract record with the signature request ID and status
    crud.update_contract_signature_status(db, contract_id=contract_id, request_id=request_id, status="sent")

    return {"message": "Signature request sent successfully.", "signature_request_id": request_id}

@router.post("/{contract_id}/comments", response_model=schemas.UserComment, status_code=status.HTTP_201_CREATED)
async def add_comment_to_contract(
    contract_id: uuid.UUID,
    comment: schemas.UserCommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_active_subscriber),
):
    """
    Adds a user-authored comment to a specific contract and broadcasts it.
    """
    # Verify user has access to the contract
    db_contract = crud.get_contract_by_id(
        db, contract_id=contract_id, organization_id=current_user.organization_id
    )
    if db_contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    # Create the comment
    db_comment = crud.create_user_comment(
        db=db, comment=comment, contract_id=contract_id, author_id=current_user.id
    )

    # Broadcast the new comment to all clients in the room
    comment_schema = schemas.UserComment.from_orm(db_comment)
    await room_manager.broadcast(
        {"type": "new_comment", "payload": comment_schema.model_dump()},
        room_id=str(contract_id)
    )

    return db_comment

@router.patch("/{contract_id}/suggestions/{suggestion_id}", response_model=schemas.AnalysisSuggestion)
async def update_suggestion_status(
    contract_id: uuid.UUID,
    suggestion_id: uuid.UUID,
    suggestion_update: schemas.AnalysisSuggestionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_active_subscriber),
):
    """
    Updates the status of an AI suggestion (e.g., accept/reject) and broadcasts it.
    """
    # Verify user has access to the contract
    db_contract = crud.get_contract_by_id(
        db, contract_id=contract_id, organization_id=current_user.organization_id
    )
    if db_contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    # Update the suggestion status in the database
    updated_suggestion = crud.update_suggestion_status(
        db=db, suggestion_id=suggestion_id, contract_id=contract_id,
        data=suggestion_update
    )
    if updated_suggestion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found on this contract")

    # Broadcast the update to all clients in the room
    suggestion_schema = schemas.AnalysisSuggestion.from_orm(updated_suggestion)
    await room_manager.broadcast(
        {"type": "suggestion_update", "payload": suggestion_schema.model_dump()},
        room_id=str(contract_id)
    )

    return updated_suggestion

@router.post("/signature-webhook", status_code=status.HTTP_200_OK, include_in_schema=False)
async def signature_webhook(
    payload: schemas.SignatureEvent,
    db: Session = Depends(get_db),
):
    """
    Handles incoming webhooks from the e-signature provider.
    This endpoint is unauthenticated but should be secured in production
    (e.g., by verifying a signature header).
    """
    print(f"Received signature webhook for request_id: {payload.signature_request_id} with event: {payload.event_type}")

    # Find the contract associated with this signature request
    db_contract = crud.get_contract_by_signature_request_id(db, request_id=payload.signature_request_id)

    if not db_contract:
        # It's important not to return a 404 here, as it might cause the webhook
        # provider to retry. We acknowledge receipt and log the issue.
        print(f"Warning: Received webhook for unknown signature_request_id: {payload.signature_request_id}")
        return {"status": "ok", "detail": "request_id not found"}

    new_status = "signed" if payload.event_type == 'all_signed' else payload.event_type

    # Update the contract status in the database
    crud.update_contract_signature_status(db, contract_id=db_contract.id, request_id=db_contract.signature_request_id, status=new_status)

    # Broadcast the status update to connected clients
    await room_manager.broadcast(
        {"type": "signature_status_update", "payload": {"contract_id": str(db_contract.id), "status": new_status}},
        room_id=str(db_contract.id)
    )
    
    # Create notification for contract owner
    notification = crud.create_notification(
        db=db,
        recipient_id=db_contract.uploader_id,
        type="contract_signed",
        message=f"Contract '{db_contract.filename}' has been fully signed."
    )
    
    # Send real-time notification to the contract owner
    notification_schema = schemas.Notification.from_orm(notification)
    await user_manager.send_to_user(
        {"type": "new_notification", "payload": notification_schema.model_dump()},
        user_id=str(db_contract.uploader_id)
    )

    return {"status": "ok"}