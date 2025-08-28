from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core import crud, models, schemas
from api.v1 import dependencies
from core.database import get_db

router = APIRouter()

@router.get("/dashboard", response_model=schemas.FullAnalyticsDashboard)
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_active_subscriber),
):
    """
    Retrieve aggregated analytics data for the organization's dashboard.
    """
    org_id = current_user.organization_id

    kpis_data = crud.get_analytics_kpis(db, organization_id=org_id)
    risk_dist_data = crud.get_risk_category_distribution(db, organization_id=org_id)
    volume_data = crud.get_contract_volume_over_time(db, organization_id=org_id)

    return schemas.FullAnalyticsDashboard(
        kpis=schemas.AnalyticsKPIs(**kpis_data),
        risk_distribution=[schemas.RiskCategoryDistribution(**row) for row in risk_dist_data],
        volume_over_time=[schemas.ContractVolumeOverTime(**row) for row in volume_data]
    )