from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .... import core, models, schemas
from .. import dependencies

router = APIRouter()

@router.get(
    "/hub-summary",
    response_model=schemas.ComplianceHubSummary,
    summary="Get Compliance Hub Summary",
    description="Retrieves an aggregated summary of compliance data for the organization's hub dashboard.",
)
def get_compliance_hub_summary(
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Provides a single endpoint to fetch all data required for the Compliance & Audit Hub.
    This is restricted to organization administrators.
    """
    org_id = current_user.organization_id
    
    playbook_summary = core.crud.get_playbook_summary(db, organization_id=org_id)
    recent_logs = core.crud.get_audit_logs_by_organization(db, organization_id=org_id, limit=5)
    policy_summary = core.crud.get_access_policy_summary(db, organization_id=org_id)

    return schemas.ComplianceHubSummary(
        playbook_summary=playbook_summary,
        recent_audit_logs=recent_logs,
        access_policy_summary=policy_summary,
    )