from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.v1 import dependencies
from core import crud, schemas, models

router = APIRouter()

@router.get(
    "/dashboard",
    response_model=schemas.FullAnalyticsDashboard,
    summary="Get Advanced Analytics Dashboard Data",
    description="Provides aggregated data for the main analytics dashboard, including KPIs, risk distribution, and contract volume.",
)
def get_advanced_analytics_dashboard(
    *,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
) -> schemas.FullAnalyticsDashboard:
    """
    Retrieve consolidated data for the advanced analytics dashboard.
    """
    kpis = crud.get_analytics_kpis(db, organization_id=current_user.organization_id)
    risk_distribution = crud.get_risk_category_distribution(db, organization_id=current_user.organization_id)
    volume_over_time = crud.get_contract_volume_over_time(db, organization_id=current_user.organization_id)

    return schemas.FullAnalyticsDashboard(
        kpis=kpis, risk_distribution=risk_distribution, volume_over_time=volume_over_time
    )