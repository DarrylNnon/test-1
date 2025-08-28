from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, BackgroundTasks
from sqlalchemy.orm import Session
import uuid
from typing import List

from core import crud, models, schemas, analyzer, utils
from api.v1 import dependencies
from core.database import get_db

router = APIRouter()

@router.post("/upload", response_model=schemas.Contract, status_code=status.HTTP_201_CREATED)
async def upload_contract(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
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
        db=db, comment=comment, contract_id=contract_id, author_id=current_user.id
    )