from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from typing import List

from core import crud, models, schemas
from api.v1 import dependencies
from core.database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.Clause, status_code=status.HTTP_201_CREATED)
def create_clause(
    clause: schemas.ClauseCreate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Create a new clause in the organization's library.
    - Requires admin privileges.
    """
    return crud.create_clause(db=db, clause=clause, user_id=current_admin.id, organization_id=current_admin.organization_id)

@router.get("/", response_model=List[schemas.Clause])
def list_clauses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    Retrieve all clauses for the user's organization.
    """
    return crud.get_clauses_by_organization(db, organization_id=current_user.organization_id)

@router.get("/{clause_id}", response_model=schemas.Clause)
def read_clause(
    clause_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    Retrieve a single clause by its ID.
    """
    db_clause = crud.get_clause_by_id(db, clause_id=clause_id, organization_id=current_user.organization_id)
    if db_clause is None:
        raise HTTPException(status_code=404, detail="Clause not found")
    return db_clause

@router.put("/{clause_id}", response_model=schemas.Clause)
def update_clause(
    clause_id: uuid.UUID,
    clause_update: schemas.ClauseUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Update an existing clause.
    - Requires admin privileges.
    """
    updated_clause = crud.update_clause(db, clause_id=clause_id, clause_update=clause_update, organization_id=current_admin.organization_id)
    if updated_clause is None:
        raise HTTPException(status_code=404, detail="Clause not found")
    return updated_clause

@router.delete("/{clause_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_clause(
    clause_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Delete a clause from the library.
    - Requires admin privileges.
    """
    deleted_clause = crud.delete_clause(db, clause_id=clause_id, organization_id=current_admin.organization_id)
    if deleted_clause is None:
        raise HTTPException(status_code=404, detail="Clause not found")
    return