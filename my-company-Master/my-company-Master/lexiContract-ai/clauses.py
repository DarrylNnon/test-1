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
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Create a new clause in the organization's library.
    Only accessible by administrators to maintain quality control.
    """
    # Ensure the admin is part of an active subscription
    dependencies.get_active_subscriber(current_user)
    
    return crud.create_clause(
        db=db,
        clause=clause,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
    )

@router.get("/", response_model=List[schemas.Clause])
def list_clauses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_active_subscriber),
):
    """
    Retrieve all clauses for the user's organization.
    Accessible by any user with an active subscription.
    """
    return crud.get_clauses_by_organization(
        db, organization_id=current_user.organization_id
    )

@router.get("/{clause_id}", response_model=schemas.Clause)
def read_clause(
    clause_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_active_subscriber),
):
    """
    Retrieve a single clause by its ID.
    """
    db_clause = crud.get_clause_by_id(
        db, clause_id=clause_id, organization_id=current_user.organization_id
    )
    if db_clause is None:
        raise HTTPException(status_code=404, detail="Clause not found")
    return db_clause

@router.patch("/{clause_id}", response_model=schemas.Clause)
def update_clause(
    clause_id: uuid.UUID,
    clause_update: schemas.ClauseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Update an existing clause.
    Only accessible by administrators.
    """
    dependencies.get_active_subscriber(current_user)
    db_clause = crud.update_clause(
        db, clause_id=clause_id, clause_update=clause_update, organization_id=current_user.organization_id
    )
    if db_clause is None:
        raise HTTPException(status_code=404, detail="Clause not found")
    return db_clause

@router.delete("/{clause_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_clause(
    clause_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Delete a clause from the library.
    Only accessible by administrators.
    """
    dependencies.get_active_subscriber(current_user)
    deleted_clause = crud.delete_clause(db, clause_id=clause_id, organization_id=current_user.organization_id)
    if deleted_clause is None:
        raise HTTPException(status_code=404, detail="Clause not found")
    return

@router.post("/find-similar", response_model=List[schemas.ClauseSimilarityResult])
def find_similar_clauses(
    request: schemas.FindSimilarClausesRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_active_subscriber),
):
    """
    Finds clauses in the library that are similar to the provided text.
    This is used in the contract review UI to show deviations from standard language.
    """
    similar_clauses_data = crud.find_similar_clauses(
        db,
        text_to_compare=request.text,
        organization_id=current_user.organization_id
    )
    
    # Format the data to match the response model
    response = []
    for item in similar_clauses_data:
        response.append(schemas.ClauseSimilarityResult(**item['clause'].__dict__, similarity_score=item['similarity_score']))
    return response
