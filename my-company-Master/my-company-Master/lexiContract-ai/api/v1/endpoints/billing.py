import stripe
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from core import crud, models, schemas
from core.config import settings
from api.v1 import dependencies
from core.database import get_db

router = APIRouter()

# Set the Stripe API key at the module level
stripe.api_key = settings.STRIPE_SECRET_KEY

@router.post("/create-checkout-session", response_model=schemas.CreateCheckoutSessionResponse)
def create_checkout_session(
    request_data: schemas.CreateCheckoutSessionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    Creates a Stripe Checkout session for a user to purchase a subscription.
    """
    organization = current_user.organization
    stripe_customer_id = organization.stripe_customer_id

    # If the organization is not yet a Stripe customer, create one
    if not stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=organization.name,
            metadata={"organization_id": str(organization.id)},
        )
        stripe_customer_id = customer.id
        crud.update_organization_stripe_customer_id(db, organization_id=organization.id, stripe_customer_id=stripe_customer_id)

    try:
        checkout_session = stripe.checkout.Session.create(
            customer=stripe_customer_id,
            line_items=[{"price": request_data.price_id, "quantity": 1}],
            mode="subscription",
            success_url=f"{settings.FRONTEND_URL}/dashboard?checkout_success=true",
            cancel_url=f"{settings.FRONTEND_URL}/pricing?checkout_canceled=true",
            client_reference_id=str(organization.id),
        )
        return {"checkout_url": checkout_session.url}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/create-portal-session", response_model=schemas.CreatePortalSessionResponse)
def create_portal_session(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    Creates a Stripe Billing Portal session for a user to manage their subscription.
    """
    organization = current_user.organization
    stripe_customer_id = organization.stripe_customer_id

    if not stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization does not have a billing account.",
        )

    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=stripe_customer_id,
            return_url=f"{settings.FRONTEND_URL}/settings/billing",
        )
        return {"portal_url": portal_session.url}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/webhook", status_code=status.HTTP_200_OK, include_in_schema=False)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handles incoming webhooks from Stripe to update subscription statuses.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload, sig_header=sig_header, secret=settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e: # Invalid payload
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid payload: {e}")
    except stripe.error.SignatureVerificationError as e: # Invalid signature
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid signature: {e}")

    # Handle the event
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        organization_id = session.get("client_reference_id")
        stripe_customer_id = session.get("customer")
        stripe_subscription_id = session.get("subscription")

        if not organization_id:
            print("Error: checkout.session.completed event without client_reference_id")
            return {"status": "error", "detail": "Missing client_reference_id"}

        subscription = stripe.Subscription.retrieve(stripe_subscription_id)
        
        db_org = db.query(models.Organization).filter(models.Organization.id == organization_id).first()
        if db_org:
            db_org.stripe_customer_id = stripe_customer_id
            db_org.stripe_subscription_id = stripe_subscription_id
            db_org.plan_id = subscription.plan.id
            db_org.subscription_status = subscription.status
            db_org.current_period_end = datetime.fromtimestamp(subscription.current_period_end)
            db.commit()
            print(f"Checkout session completed for organization {organization_id}")

    elif event["type"] in ["customer.subscription.updated", "customer.subscription.deleted", "customer.subscription.trial_will_end"]:
        subscription = event["data"]["object"]
        stripe_customer_id = subscription.get("customer")
        
        db_org = crud.get_organization_by_stripe_customer_id(db, stripe_customer_id=stripe_customer_id)
        if db_org:
            db_org.plan_id = subscription.plan.id
            db_org.subscription_status = subscription.status
            db_org.current_period_end = datetime.fromtimestamp(subscription.current_period_end)
            db.commit()
            print(f"Subscription {subscription.status} for customer {stripe_customer_id}")

    return {"status": "ok"}