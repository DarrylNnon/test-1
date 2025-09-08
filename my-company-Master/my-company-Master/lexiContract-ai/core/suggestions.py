import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core import crud, models, schemas
from api.v1 import dependencies

router = APIRouter()

@router.post(
    "/suggestions/{suggestion_id}/status",
    response_model=schemas.AnalysisSuggestion,
    summary="Approve or Reject a Suggestion",
    description="Updates the status of an autonomous suggestion to 'accepted' or 'rejected'.",
)
def update_suggestion_status_endpoint(
    suggestion_id: uuid.UUID,
    update_data: schemas.AnalysisSuggestionUpdate,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    Updates the status of an analysis suggestion. This is the core endpoint for the
    human-in-the-loop approval workflow for autonomous redlines.
    """
    db_suggestion = crud.get_suggestion_by_id(db, suggestion_id=suggestion_id)

    if not db_suggestion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found")

    # Authorization check: Ensure the suggestion belongs to the user's organization
    if db_suggestion.version.contract.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this suggestion")

    updated_suggestion = crud.update_suggestion_status(db, db_suggestion=db_suggestion, status=update_data.status)

    return updated_suggestion
