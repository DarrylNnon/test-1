from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core import crud, models, schemas
from api.v1 import dependencies
from core.database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.AuditLog])
def list_audit_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    """
    Retrieve audit logs for the organization. Admin-only.
    """
    return crud.get_audit_logs_by_organization(
        db, organization_id=current_user.organization_id, skip=skip, limit=limit
    )