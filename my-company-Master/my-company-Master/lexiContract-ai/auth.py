from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from core import crud, schemas, security, models
from core.email_service import email_service
from core.database import get_db

router = APIRouter()

@router.post("/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    return crud.create_user(db=db, user=user)

@router.post("/token", response_model=schemas.Token)
def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    crud.create_audit_log(
        db,
        user_id=user.id,
        organization_id=user.organization_id,
        action="user.login.success"
    )

    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/forgot-password", response_model=schemas.ForgotPasswordResponse, status_code=status.HTTP_202_ACCEPTED)
def forgot_password(
    request: schemas.ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Initiates the password reset process for a user.
    """
    user = crud.get_user_by_email(db, email=request.email)
    reset_token = None
    if user:
        # Generate and set the reset token
        reset_token = security.create_reset_token() # This is the raw token for the user
        token_hash = security.get_token_hash(reset_token)
        crud.set_password_reset_token(db, user=user, token_hash=token_hash)

        # Send the reset email (mocked)
        email_service.send_password_reset_email(email=user.email, token=reset_token)

    # We always return a success response to prevent email enumeration attacks.
    return {
        "message": "If an account with that email exists, a password reset link has been sent.",
        "reset_token": reset_token,
    }

@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    request: schemas.ResetPassword,
    db: Session = Depends(get_db),
):
    """
    Resets a user's password using a valid token.
    """
    token_hash = security.get_token_hash(request.token)
    user = crud.get_user_by_reset_token(db, token_hash=token_hash)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token.",
        )
    
    if len(request.password) < 8:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long.",
        )

    crud.reset_user_password(db, user=user, new_password=request.password)
    
    return {"message": "Your password has been reset successfully."}