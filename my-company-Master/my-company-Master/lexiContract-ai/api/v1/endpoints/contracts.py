import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from core import crud, models, schemas
from api.v1 import dependencies

router = APIRouter()

@router.post("/upload", response_model=schemas.Contract, status_code=status.HTTP_201_CREATED)
async def upload_contract(
    file: UploadFile = File(...),
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Uploads a contract file, creates a new contract record and its initial version,
    and simulates triggering a background analysis task.
    """
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file name provided.")

    full_text = (await file.read()).decode("utf-8")

    contract = crud.create_contract_with_initial_version(
        db=db,
        filename=file.filename,
        full_text=full_text,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
    )
    
    print(f"Contract {contract.id} created. In a real system, an AI analysis job would be triggered now.")

    return contract

@router.get("/{contract_id}", response_model=schemas.ContractDetail)
def read_contract(
    contract_id: uuid.UUID,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Retrieve a single contract by its ID, including all its versions and suggestions.
    """
    db_contract = crud.get_contract_by_id(
        db, contract_id=contract_id, organization_id=current_user.organization_id
    )
    if not db_contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    return db_contract

@router.get("/", response_model=List[schemas.Contract])
def read_contracts(
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
    skip: int = 0,
    limit: int = 100,
):
    """
    Retrieve all contracts for the user's organization.
    """
    return crud.get_contracts_by_organization(
        db, organization_id=current_user.organization_id, skip=skip, limit=limit
    )