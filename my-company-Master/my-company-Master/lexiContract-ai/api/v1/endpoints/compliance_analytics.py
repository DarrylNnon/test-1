from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core import crud, models, schemas
from api.v1 import dependencies
from core.database import get_db

router = APIRouter()

@router.get("/summary", response_model=schemas.ComplianceDashboardSummary)
def get_compliance_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Retrieves aggregated data for the Compliance Insights Dashboard.
    This is an enterprise-only feature, enforced by the admin dependency.
    """
    organization_id = current_user.organization_id

    findings_by_category = crud.get_compliance_findings_by_category(db, organization_id=organization_id)
    top_flagged_contracts = crud.get_top_flagged_contracts(db, organization_id=organization_id)

    return schemas.ComplianceDashboardSummary(
        findings_by_category=findings_by_category,
        top_flagged_contracts=top_flagged_contracts,
    )