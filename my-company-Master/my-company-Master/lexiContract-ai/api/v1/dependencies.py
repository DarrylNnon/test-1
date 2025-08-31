from fastapi import Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from core import crud, models, schemas, security
from core.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

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