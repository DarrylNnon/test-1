from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core import models, schemas
from api.v1 import dependencies
from core.database import get_db

router = APIRouter()

class SubscriptionUpdateRequest(schemas.BaseModel):
    status: models.SubscriptionStatus

@router.patch("/update-subscription", response_model=schemas.Organization)
def update_subscription_status_for_testing(
    update_request: SubscriptionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    FOR TESTING PURPOSES ONLY. Manually updates the subscription status of the current user's organization.
    """
    organization = current_user.organization
    organization.subscription_status = update_request.status
    db.commit()
    db.refresh(organization)
    return organization