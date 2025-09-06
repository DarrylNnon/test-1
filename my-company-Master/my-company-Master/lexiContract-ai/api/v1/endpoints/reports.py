from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from core import crud, models, reporting
from api.v1 import dependencies

router = APIRouter()

@router.post(
    "/{report_id}/execute",
    response_model=List[Dict[str, Any]],
    summary="Execute a Custom Report",
    description="Executes the query defined in a custom report and returns the data.",
)
def execute_custom_report(
    report_id: uuid.UUID,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_active_subscriber),
):
    """
    Fetches a custom report by its ID, validates that it belongs to the user's organization,
    and executes it using the core reporting service.
    """
    report = crud.get_custom_report(db, report_id=report_id, organization_id=current_user.organization_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    return reporting.execute_report_query(db=db, report=report, organization_id=current_user.organization_id)