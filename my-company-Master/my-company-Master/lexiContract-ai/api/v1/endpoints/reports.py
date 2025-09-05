from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from uuid import UUID

from core import crud, schemas
from core.models import User
from api.v1 import dependencies
from core import reporting_engine

router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
    dependencies=[Depends(dependencies.get_current_active_user)]
)

@router.post("/execute", response_model=List[Dict[str, Any]], summary="Execute a Report Query")
def execute_report(
    request: schemas.ReportExecuteRequest,
    db: Session = Depends(dependencies.get_db),
    current_user: User = Depends(dependencies.get_current_active_user),
):
    """
    Executes a report configuration and returns the resulting data.
    This is used for live previews in the report builder UI.
    """
    try:
        data = reporting_engine.execute_report_query(config=request.configuration, organization_id=current_user.organization_id, db=db)
        return data
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        # In production, we would log this error.
        print(f"Error executing report: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An internal error occurred while executing the report.")

@router.post("/", response_model=schemas.CustomReport, status_code=status.HTTP_201_CREATED)
def create_report(
    report: schemas.CustomReportCreate,
    db: Session = Depends(dependencies.get_db),
    current_user: User = Depends(dependencies.get_current_active_user),
):
    """
    Create a new custom report definition.
    """
    return crud.create_custom_report(db=db, report=report, user_id=current_user.id, organization_id=current_user.organization_id)

@router.get("/", response_model=List[schemas.CustomReport])
def read_reports(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(dependencies.get_db),
    current_user: User = Depends(dependencies.get_current_active_user),
):
    """
    Retrieve all custom reports for the user's organization.
    """
    return crud.get_custom_reports_by_organization(db, organization_id=current_user.organization_id, skip=skip, limit=limit)

@router.get("/{report_id}", response_model=schemas.CustomReport)
def read_report(
    report_id: UUID,
    db: Session = Depends(dependencies.get_db),
    current_user: User = Depends(dependencies.get_current_active_user),
):
    """
    Retrieve a single custom report by its ID.
    """
    db_report = crud.get_custom_report(db, report_id=report_id, organization_id=current_user.organization_id)
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return db_report

@router.put("/{report_id}", response_model=schemas.CustomReport)
def update_report(
    report_id: UUID,
    report_in: schemas.CustomReportUpdate,
    db: Session = Depends(dependencies.get_db),
    current_user: User = Depends(dependencies.get_current_active_user),
):
    db_report = read_report(report_id, db, current_user) # Reuse the read function to get and check ownership
    return crud.update_custom_report(db=db, db_report=db_report, report_in=report_in)

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: UUID,
    db: Session = Depends(dependencies.get_db),
    current_user: User = Depends(dependencies.get_current_active_user),
):
    db_report = read_report(report_id, db, current_user) # Reuse the read function to get and check ownership
    crud.delete_custom_report(db=db, db_report=db_report)
    return