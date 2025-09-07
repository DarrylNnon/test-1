from fastapi import APIRouter, Depends, HTTPException, status, Form, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
import secrets
import time
from urllib.parse import urlencode

from core import crud, schemas, models, security
from api.v1.dependencies import get_db, get_current_active_user
from core.config import settings

router = APIRouter()

# In-memory store for auth codes. In a production, multi-node environment, this MUST be replaced with Redis or a similar shared store.
auth_codes_store = {}

@router.get("/authorize", summary="OAuth Authorize", description="Initiates the OAuth 2.0 authorization flow.")
def oauth_authorize(
    response_type: str,
    client_id: str,
    redirect_uri: str,
    scope: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    The user is redirected here by the third-party application.
    This endpoint validates the request and redirects the user to our own frontend consent screen.
    """
    if response_type != "code":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid response_type. Only 'code' is supported.")

    app = crud.get_developer_app_by_client_id(db, client_id=client_id)
    if not app or redirect_uri not in app.redirect_uris:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid client_id or redirect_uri.")

    # Redirect to our frontend consent page, passing all necessary parameters.
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": scope or "",
        "state": state or ""
    }
    consent_url = f"{settings.FRONTEND_URL}/oauth/consent?{urlencode(params)}"
    return RedirectResponse(url=consent_url)

class ConsentForm:
    def __init__(
        self,
        client_id: str = Form(...),
        redirect_uri: str = Form(...),
        scope: str = Form(...),
        state: str = Form(...),
        action: str = Form(...) # 'allow' or 'deny'
    ):
        self.client_id = client_id
        self.redirect_uri = redirect_uri
        self.scope = scope
        self.state = state
        self.action = action

@router.post("/consent", summary="Handle User Consent", description="Endpoint for the frontend consent page to post the user's decision.")
def oauth_consent(
    form: ConsentForm = Depends(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Handles the user's decision from our frontend consent screen.
    If allowed, generates an authorization code and redirects back to the third-party app.
    """
    app = crud.get_developer_app_by_client_id(db, client_id=form.client_id)
    if not app or form.redirect_uri not in app.redirect_uris:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid client_id or redirect_uri.")

    redirect_params = {"state": form.state}
    if form.action == "deny":
        redirect_params["error"] = "access_denied"
        return RedirectResponse(url=f"{form.redirect_uri}?{urlencode(redirect_params)}")

    # Generate and store the authorization code
    auth_code = secrets.token_urlsafe(32)
    auth_codes_store[auth_code] = {
        "client_id": form.client_id,
        "user_id": current_user.id,
        "org_id": current_user.organization_id,
        "scope": form.scope,
        "expires_at": time.time() + 600  # 10-minute expiry
    }

    redirect_params["code"] = auth_code
    return RedirectResponse(url=f"{form.redirect_uri}?{urlencode(redirect_params)}")

@router.post("/token", response_model=schemas.OAuthToken, summary="OAuth Token Exchange", description="Exchanges an authorization code for an access token.")
def oauth_token(
    grant_type: str = Form(...),
    code: str = Form(...),
    redirect_uri: str = Form(...),
    client_id: str = Form(...),
    client_secret: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    This endpoint is called by the third-party application's backend.
    It validates the authorization code and client credentials, then issues tokens.
    """
    if grant_type != "authorization_code":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid grant_type.")

    app = crud.get_developer_app_by_client_id(db, client_id=client_id)
    if not app or not security.verify_password(client_secret, app.client_secret_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid client credentials.")

    code_data = auth_codes_store.pop(code, None)
    if not code_data or code_data["client_id"] != client_id or code_data["expires_at"] < time.time():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired authorization code.")

    # Create the installation record in our database
    crud.create_app_installation(
        db=db,
        app_id=app.id,
        customer_org_id=code_data["org_id"],
        installed_by_user_id=code_data["user_id"],
        permissions={"scopes": code_data["scope"].split()}
    )

    # Create access and refresh tokens
    token_data = {"sub": str(code_data["user_id"]), "org_id": str(code_data["org_id"]), "app_id": str(app.id), "scope": code_data["scope"]}
    access_token = security.create_oauth_access_token(data=token_data)
    refresh_token = security.create_oauth_refresh_token(data=token_data)

    return schemas.OAuthToken(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=security.OAUTH_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        scope=code_data["scope"]
    )