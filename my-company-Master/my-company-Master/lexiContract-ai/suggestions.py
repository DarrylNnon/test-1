import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.v1 import dependencies
from core import models, schemas, crud
from core.database import get_db

router = APIRouter()

@router.patch("/{suggestion_id}", response_model=schemas.AnalysisSuggestion)
def update_suggestion(
    suggestion_id: uuid.UUID,
    suggestion_update: schemas.AnalysisSuggestionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    Update the status of an analysis suggestion (e.g., accept or reject it).
    - Requires authentication.
    - Ensures the user belongs to the same organization as the contract.
    """
    db_suggestion = crud.get_suggestion_by_id(db, suggestion_id=suggestion_id)

    if db_suggestion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found")

    # Authorization check: Ensure the suggestion's contract belongs to the user's org
    if db_suggestion.contract.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this resource")

    updated_suggestion = crud.update_suggestion_status(
        db, suggestion_id=suggestion_id, status=suggestion_update.status
    )
    return updated_suggestion