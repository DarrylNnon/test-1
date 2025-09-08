import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core import crud, models, schemas
from api.v1 import dependencies

router = APIRouter()

@router.get(
    "/analytics/dashboard",
    response_model=schemas.FullAnalyticsDashboard,
    summary="Get Full Analytics Dashboard Data",
    description="Retrieves aggregated data for the main analytics dashboard, including KPIs, risk distribution, and contract volume.",
)
def get_full_analytics_dashboard(
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Provides a consolidated data object for the analytics dashboard.
    """
    org_id = current_user.organization_id
    
    kpis = crud.get_analytics_kpis(db=db, organization_id=org_id)
    risk_distribution = crud.get_risk_category_distribution(db=db, organization_id=org_id)
    volume_over_time = crud.get_contract_volume_over_time(db=db, organization_id=org_id)

    return schemas.FullAnalyticsDashboard(
        kpis=kpis,
        risk_distribution=risk_distribution,
        volume_over_time=volume_over_time,
    )