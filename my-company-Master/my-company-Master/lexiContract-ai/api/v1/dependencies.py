from fastapi import Depends, HTTPException, status, Query, Request, Header
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from core import crud, models, schemas, security
from core.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")
api_key_header_scheme = APIKeyHeader(name="Authorization", auto_error=False)


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, security.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

def get_current_user_ws(
    token: str = Query(...),
    db: Session = Depends(get_db)
) -> models.User:
    """
    Dependency to authenticate users for WebSocket connections using a token from query params.
    This is a synchronous function, but FastAPI handles it correctly for async endpoints.
    """
    # For WebSockets, we can't easily send a 401 status, but we can raise an
    # exception that will be caught and used to close the connection.
    # We reuse the logic from the standard get_current_user dependency.
    user = get_current_user(db, token)
    return user

def get_current_admin_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Dependency to ensure the current user is an admin."""
    if current_user.role != models.Role.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have sufficient privileges",
        )
    return current_user

def get_active_subscriber(current_user: models.User = Depends(get_current_user)) -> models.User:
    """
    Dependency to ensure the current user's organization has an active subscription.
    'active' and 'trialing' statuses are considered valid.
    """
    active_statuses = [models.SubscriptionStatus.active, models.SubscriptionStatus.trialing]
    # It's possible for subscription_status to be None for new orgs
    if getattr(current_user.organization, 'subscription_status', None) not in active_statuses:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature requires an active subscription. Please upgrade your plan.",
        )
    return current_user

def get_valid_api_key(
    api_key_header: str = Depends(api_key_header_scheme),
    request: Request = None,
    db: Session = Depends(get_db),
) -> models.ApiKey:
    """
    Dependency to authenticate requests using an API key.
    The key is expected in the 'Authorization' header, e.g., 'Authorization: Bearer <key>'.
    """
    unauthorized_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing API Key",
    )
    forbidden_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="API Key is inactive or invalid",
    )

    if not api_key_header:
        raise unauthorized_exception

    parts = api_key_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise unauthorized_exception
    
    raw_key = parts[1]
    key_hash = security.hash_api_key(raw_key)

    db_api_key = crud.get_api_key_by_hash(db, key_hash=key_hash)

    if not db_api_key or not db_api_key.is_active:
        raise forbidden_exception

    # Attach the key to the request state so the rate limiter can access it
    request.state.api_key = db_api_key

    crud.update_api_key_last_used(db, key_id=db_api_key.id)

    return db_api_key

async def verify_internal_secret(x_internal_secret: str = Header(...)):
    """Dependency to verify a shared secret for internal service-to-service communication."""
    if not security.compare_digest(x_internal_secret, security.settings.YJS_PERSISTENCE_SECRET):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid internal secret")
