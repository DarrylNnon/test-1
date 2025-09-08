import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core import crud, models, schemas
from api.v1 import dependencies

router = APIRouter()

@router.get("/", response_model=List[schemas.Clause])
def read_clauses(
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Retrieve all clauses for the user's organization.
    """
    return crud.get_clauses_by_organization(db, organization_id=current_user.organization_id)

@router.post("/", response_model=schemas.Clause, status_code=status.HTTP_201_CREATED)
def create_clause(
    clause_in: schemas.ClauseCreate,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Create a new clause in the organization's library.
    """
    return crud.create_clause(db=db, clause=clause_in, user_id=current_user.id, organization_id=current_user.organization_id)

@router.put("/{clause_id}", response_model=schemas.Clause)
def update_clause(
    clause_id: uuid.UUID,
    clause_in: schemas.ClauseUpdate,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Update an existing clause.
    """
    db_clause = crud.get_clause_by_id(db, clause_id=clause_id, organization_id=current_user.organization_id)
    if not db_clause:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clause not found")
    
    return crud.update_clause(db=db, clause_id=clause_id, clause_update=clause_in, organization_id=current_user.organization_id)

@router.delete("/{clause_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_clause(
    clause_id: uuid.UUID,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Delete a clause from the library.
    """
    db_clause = crud.get_clause_by_id(db, clause_id=clause_id, organization_id=current_user.organization_id)
    if not db_clause:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clause not found")
    
    crud.delete_clause(db=db, clause_id=clause_id, organization_id=current_user.organization_id)
    return

@router.post("/find-similar", response_model=List[schemas.ClauseSimilarityResult])
def find_similar_clauses_endpoint(
    request: schemas.FindSimilarClausesRequest,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Find similar clauses in the library based on a provided text snippet.
    """
    return crud.find_similar_clauses(db, text_to_compare=request.text, organization_id=current_user.organization_id)