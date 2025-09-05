from fastapi import (
    APIRouter, Depends, HTTPException, status, File, UploadFile,
    BackgroundTasks, WebSocket, WebSocketDisconnect,
)
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
import uuid
from typing import List
import difflib

from core import crud, models, schemas, analyzer, utils
from api.v1 import dependencies
from core.database import get_db
from core.websockets import room_manager

router = APIRouter()

@router.get("/{contract_id}/diff", response_class=PlainTextResponse)
def get_contract_version_diff(
    contract_id: uuid.UUID,
    from_version_id: uuid.UUID,
    to_version_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    Computes and returns a unified diff between the text of two contract versions.
    """
    from_version = crud.get_contract_version_by_id(db, version_id=from_version_id)
    to_version = crud.get_contract_version_by_id(db, version_id=to_version_id)

    if not from_version or not to_version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or both versions not found")

    if from_version.contract_id != contract_id or to_version.contract_id != contract_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Versions do not belong to the specified contract")

    if from_version.contract.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this contract")

    from_text = (from_version.full_text or "").splitlines()
    to_text = (to_version.full_text or "").splitlines()

    diff = difflib.unified_diff(
        from_text,
        to_text,
        fromfile=f'Version {from_version.version_number}',
        tofile=f'Version {to_version.version_number}',
        lineterm='',
    )

    return "\n".join(diff)

@router.get("/", response_model=List[schemas.Contract])
def list_contracts(
    skip: int = 0,
    except WebSocketDisconnect:
        room_manager.disconnect(websocket, room_id)

@router.post("/{contract_id}/versions/{version_id}/comments", response_model=schemas.UserComment, status_code=status.HTTP_201_CREATED)
async def add_comment_to_contract(
    contract_id: uuid.UUID,
    version_id: uuid.UUID,
    comment: schemas.UserCommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_active_subscriber),
):
    """
    Adds a user-authored comment to a specific contract version and broadcasts it.
    """
    db_version = crud.get_contract_version_by_id(db, version_id=version_id)
    if not db_version or db_version.contract_id != contract_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract version not found")
    
    if db_version.contract.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this contract version")

    db_comment = crud.create_user_comment(
        db=db, comment=comment, contract_version_id=version_id, user_id=current_user.id
    )

    comment_schema = schemas.UserComment.from_orm(db_comment)
    await room_manager.broadcast(
        {"type": "new_comment", "payload": comment_schema.model_dump()},
        room_id=str(db_version.contract_id)
    )

    return db_comment

@router.patch("/{contract_id}/versions/{version_id}/suggestions/{suggestion_id}", response_model=schemas.AnalysisSuggestion)
async def update_suggestion_status(
    contract_id: uuid.UUID,
    version_id: uuid.UUID,
    suggestion_id: uuid.UUID,
    suggestion_update: schemas.AnalysisSuggestionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_active_subscriber),
):
    """
    Updates the status of an AI suggestion (e.g., accept/reject) and broadcasts it.
    """
    db_suggestion = crud.get_suggestion_by_id(db, suggestion_id=suggestion_id)
    if not db_suggestion or db_suggestion.contract_version_id != version_id or db_suggestion.version.contract_id != contract_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found")

    if db_suggestion.version.contract.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this suggestion")

    updated_suggestion = crud.update_suggestion_status(
        db=db, suggestion_id=suggestion_id, contract_version_id=version_id,
        data=suggestion_update
    )
    return updated_suggestion

@router.post("/upload", response_model=schemas.Contract, status_code=status.HTTP_201_CREATED)
async def upload_contract(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    Uploads a new contract, creating the parent contract record and its first version.
    Triggers a background task for AI analysis on the initial version.
    """
    # Read file contents to pass to the background task
    file_contents = await file.read()
    try:
        full_text = utils.extract_text_from_file(file_contents, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    db_contract = crud.create_contract_with_initial_version(
        db=db,
        filename=file.filename,
        full_text=full_text,
        user_id=current_user.id,
        organization_id=current_user.organization_id
    )

    # The initial version is always the first one.
    initial_version = db_contract.versions[0]

    # Add the analysis task to the background
    background_tasks.add_task(
        analyzer.analyze_contract,
        version_id=initial_version.id,
        file_contents=file_contents,
        filename=file.filename
    )

    return db_contract

@router.post("/{contract_id}/versions", response_model=schemas.ContractVersion, status_code=status.HTTP_201_CREATED)
async def upload_new_contract_version(
    contract_id: uuid.UUID,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    Uploads a new version of an existing contract.
    """
    db_contract = crud.get_contract_by_id(db, contract_id=contract_id, organization_id=current_user.organization_id)
    if not db_contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    file_contents = await file.read()
    try:
        full_text = utils.extract_text_from_file(file_contents, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    new_version = crud.create_new_contract_version(
        db=db,
        contract_id=contract_id,
        full_text=full_text,
        uploader_id=current_user.id
    )

    background_tasks.add_task(
        analyzer.analyze_contract,
        version_id=new_version.id,
        file_contents=file_contents,
        filename=file.filename
    )

    return new_version

@router.get("/{contract_id}/diff", response_class=PlainTextResponse)
def get_contract_version_diff(
    contract_id: uuid.UUID,
    from_version_id: uuid.UUID,
    to_version_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    Computes and returns a unified diff between the text of two contract versions.
    """
    # Fetch versions and perform authorization
    from_version = crud.get_contract_version_by_id(db, version_id=from_version_id)
    to_version = crud.get_contract_version_by_id(db, version_id=to_version_id)

    if not from_version or not to_version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or both versions not found")

    if from_version.contract_id != contract_id or to_version.contract_id != contract_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Versions do not belong to the specified contract")

    if from_version.contract.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this contract")

    from_text = (from_version.full_text or "").splitlines()
    to_text = (to_version.full_text or "").splitlines()

    diff = difflib.unified_diff(
        from_text,
        to_text,
        fromfile=f'Version {from_version.version_number}',
        tofile=f'Version {to_version.version_number}',
        lineterm='',
    )

    return "\n".join(diff)

@router.get("/{contract_id}/diff", response_class=PlainTextResponse)
def get_contract_version_diff(
    contract_id: uuid.UUID,
    from_version_id: uuid.UUID,
    to_version_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    Computes and returns a unified diff between the text of two contract versions.
    """
    from_version = crud.get_contract_version_by_id(db, version_id=from_version_id)
    to_version = crud.get_contract_version_by_id(db, version_id=to_version_id)

    if not from_version or not to_version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or both versions not found")

    if from_version.contract_id != contract_id or to_version.contract_id != contract_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Versions do not belong to the specified contract")

    if from_version.contract.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this contract")

    from_text = (from_version.full_text or "").splitlines()
    to_text = (to_version.full_text or "").splitlines()

    diff = difflib.unified_diff(
        from_text,
        to_text,
        fromfile=f'Version {from_version.version_number}',
        tofile=f'Version {to_version.version_number}',
        lineterm='',
    )

    return "\n".join(diff)

@router.put("/{contract_id}/team", response_model=schemas.Contract, summary="Assign Contract to Team")
def assign_contract_to_team(
    contract_id: uuid.UUID,
    assignment: schemas.ContractTeamAssignment,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Assigns a contract to a specific team.
    To unassign, provide a null `team_id`.
    Requires admin privileges.
    """
    db_contract = crud.get_contract_by_id(db, contract_id=contract_id, organization_id=current_user.organization_id)
    if not db_contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    if assignment.team_id:
        # Verify the team exists and belongs to the same organization
        db_team = crud.get_team(db, team_id=assignment.team_id, organization_id=current_user.organization_id)
        if not db_team:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    updated_contract = crud.assign_contract_to_team(db, db_contract=db_contract, team_id=assignment.team_id)
    return updated_contract


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

@router.post("/{contract_id}/versions/{version_id}/comments", response_model=schemas.UserComment, status_code=status.HTTP_201_CREATED)
async def add_comment_to_contract(
    contract_id: uuid.UUID,
    version_id: uuid.UUID,

# Verify user has access to this contract version
    db_version = crud.get_contract_version_by_id(db, version_id=version_id)
    if not db_version or db_version.contract_id != contract_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract version not found")
    
    # Authorization check
    if db_version.contract.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this contract version")


@router.get("/{contract_id}/export", response_model=str)
def export_contract(
    contract_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    Exports the contract with accepted/rejected suggestions applied.
    Returns the modified text content.
    """
    db_contract = crud.get_contract_by_id(
        db, contract_id=contract_id, organization_id=current_user.organization_id
    )
    if db_contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    if not db_contract.full_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contract full text not available for export.")

    # db_contract.suggestions is automatically loaded due to the relationship defined in models.py
    modified_text = utils.apply_suggestions_to_text(db_contract.full_text, db_contract.suggestions)

    # In a production scenario, you might return this as a FileResponse with appropriate headers
    return modified_text

    @router.post("/{contract_id}/comments", response_model=schemas.UserComment, status_code=status.HTTP_201_CREATED)
def add_comment_to_contract(
    contract_id: uuid.UUID,
    comment: schemas.UserCommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    Adds a user-authored comment to a specific contract.
    - Requires authentication.
    - Ensures the user belongs to the same organization as the contract.
    """
    # First, verify the user has access to this contract
    db_contract = crud.get_contract_by_id(
        db, contract_id=contract_id, organization_id=current_user.organization_id
    )
    if db_contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    # Create the comment
    return crud.create_user_comment(
        db=db, comment=comment, contract_version_id=version_id, user_id=current_user.id

    room_id=str(db_version.contract_id)

    @router.patch("/{contract_id}/versions/{version_id}/suggestions/{suggestion_id}", response_model=schemas.AnalysisSuggestion)
async def update_suggestion_status(
    contract_id: uuid.UUID,
    version_id: uuid.UUID,
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
    # Get the suggestion and its related version and contract for auth
    db_suggestion = crud.get_suggestion_by_id(db, suggestion_id=suggestion_id)
    if not db_suggestion or db_suggestion.contract_version_id != version_id or db_suggestion.version.contract_id != contract_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found")

    # Authorization check
    if db_suggestion.version.contract.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this suggestion")
