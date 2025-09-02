from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from core import crud, models, schemas
from api.v1 import dependencies
from core.database import get_db

router = APIRouter()

@router.get("/contracts/{contract_id}/milestones", response_model=List[schemas.ContractMilestone])
def list_contract_milestones(
    contract_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Retrieve all key milestones for a specific contract.
    """
    db_contract = crud.get_contract_by_id(db, contract_id=contract_id, organization_id=current_user.organization_id)
    if not db_contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    return crud.get_milestones_by_contract(db, contract_id=contract_id)


@router.get("/contracts/{contract_id}/obligations", response_model=List[schemas.TrackedObligation])
def list_contract_obligations(
    contract_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Retrieve all tracked obligations for a specific contract.
    """
    db_contract = crud.get_contract_by_id(db, contract_id=contract_id, organization_id=current_user.organization_id)
    if not db_contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    return crud.get_obligations_by_contract(db, contract_id=contract_id)


@router.put("/obligations/{obligation_id}", response_model=schemas.TrackedObligation)
def update_obligation(
    obligation_id: int,
    update_data: schemas.TrackedObligationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Update the status of a tracked obligation.
    """
    db_obligation = crud.get_obligation_by_id(db, obligation_id=obligation_id)
    if not db_obligation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obligation not found")

    # Authorization check: Ensure the obligation belongs to the user's organization
    if db_obligation.contract.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this resource")

    return crud.update_obligation_status(db, db_obligation=db_obligation, update_data=update_data)