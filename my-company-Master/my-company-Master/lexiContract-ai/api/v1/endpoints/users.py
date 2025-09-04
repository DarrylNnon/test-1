from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from typing import List

from core import crud, models, schemas
from api.v1 import dependencies
from core.database import get_db

router = APIRouter()

@router.get("/me", response_model=schemas.UserWithOrg)
def read_users_me(current_user: models.User = Depends(dependencies.get_current_user)):
    """
    Get current user with their organization details, including subscription status.
    """
    # The organization is eagerly loaded on the user object due to the SQLAlchemy relationship.
    return current_user

@router.post("/organization/invite", response_model=schemas.UserInviteResponse, status_code=status.HTTP_201_CREATED)
def invite_user_to_organization(
    user_invite: schemas.UserInvite,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Invites a new user to the admin's organization.
    - Creates a new user with 'invited' status.
    - Generates an activation token.
    - In a real app, this would trigger an email with the activation link.
    """
    existing_user = crud.get_user_by_email_and_org(db, email=user_invite.email, organization_id=current_user.organization_id)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists in this organization",
        )
    
    invited_user, activation_token = crud.invite_user(db=db, email=user_invite.email, organization_id=current_user.organization_id)
    
    # For E2E testing, we return the token. In production, this is a security risk.
    return schemas.UserInviteResponse(
        **invited_user.__dict__,
        activation_token=activation_token
    )

@router.get("/organization/users", response_model=List[schemas.User])
def list_organization_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Retrieve all users for the admin's organization.
    Only accessible by users with the 'admin' role.
    """
    users = crud.get_users_by_organization(db, organization_id=current_user.organization_id)
    return users

@router.patch("/organization/users/{user_id}", response_model=schemas.User)
def update_user_role(
    user_id: uuid.UUID,
    role_update: schemas.UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Updates the role of a user in the organization.
    Only accessible by admins. An admin cannot change their own role.
    """
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admins cannot change their own role.",
        )

    updated_user = crud.update_user_role(
        db=db,
        user_id=user_id,
        organization_id=current_user.organization_id,
        new_role=role_update.role,
    )
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found in this organization"
        )
    return updated_user

@router.post("/me/devices", response_model=schemas.UserDevice, status_code=status.HTTP_201_CREATED)
def register_user_device(
    device: schemas.UserDeviceCreate,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Register a device token for push notifications for the current user.
    This endpoint is intended for use by the mobile application.
    """
    return crud.upsert_user_device(db=db, user_id=current_user.id, device=device)

@router.delete("/organization/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user_from_organization(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Removes a user from the organization.
    Only accessible by admins. An admin cannot remove themselves.
    """
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admins cannot remove themselves.",
        )

    user_to_remove = crud.get_user_by_id_and_org(db, user_id=user_id, organization_id=current_user.organization_id)
    if not user_to_remove:
        # To make DELETE idempotent, we return success even if the user is already gone.
        return

    crud.delete_user(db=db, user=user_to_remove)
    return