from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from core import crud, schemas, models
from api.v1.dependencies import get_db, get_current_active_user
from core.prediction_service import prediction_service

router = APIRouter()

@router.get(
    "/dashboard",
    response_model=schemas.FullAnalyticsDashboard,
    summary="Get Full Analytics Dashboard",
    description="Retrieves an aggregated set of analytics data for the main dashboard.",
)
def get_full_analytics_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Provides a consolidated view of organizational analytics, including:
    - **KPIs**: Key performance indicators like total contracts and cycle times.
    - **Risk Distribution**: A breakdown of identified risks by category.
    - **Volume Over Time**: Contract creation volume on a monthly basis.
    """
    kpis = crud.get_analytics_kpis(db, organization_id=current_user.organization_id)
    risk_distribution = crud.get_risk_category_distribution(db, organization_id=current_user.organization_id)
    volume_over_time = crud.get_contract_volume_over_time(db, organization_id=current_user.organization_id)

    return schemas.FullAnalyticsDashboard(
        kpis=kpis,
        risk_distribution=risk_distribution,
        volume_over_time=volume_over_time,
    )

@router.get(
    "/contracts/{contract_id}/predictions",
    response_model=schemas.ContractPredictions,
    summary="Get Predictive Negotiation Analytics",
    description="Provides AI-powered predictions for negotiation timeline and clause success rates for a specific contract.",
)
def get_contract_predictions(
    contract_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Retrieves predictive analytics for a given contract.
    - **Predicted Timeline**: An estimate of the negotiation duration in days.
    - **Clause Success Rates**: The historical probability of key clauses being accepted.
    """
    db_contract = crud.get_contract_by_id(db, contract_id=contract_id, organization_id=current_user.organization_id)
    if not db_contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    timeline_prediction = prediction_service.predict_negotiation_timeline(contract=db_contract)
    clause_predictions = prediction_service.predict_clause_success_rates(contract=db_contract, db=db)

    return schemas.ContractPredictions(**timeline_prediction, key_clause_predictions=clause_predictions)