from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from core import crud, models, schemas
from api.v1 import dependencies
from core.database import get_db

router = APIRouter()

@router.post("/finalize", response_model=schemas.Contract, status_code=status.HTTP_201_CREATED)
def finalize_drafted_contract(
    request: schemas.FinalizeDraftRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_active_subscriber),
):
    """
    Creates a new contract record from a finalized draft content.
    This is the last step in the AI-powered drafting wizard.
    The analysis task for the new contract will be triggered automatically
    by the background worker observing new contract versions.
    """
    new_contract = crud.create_contract_with_initial_version(
        db=db,
        filename=request.filename,
        full_text=request.content,
        user_id=current_user.id,
        organization_id=current_user.organization_id
    )
    return new_contract