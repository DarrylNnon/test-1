from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from .... import core
from .. import dependencies

router = APIRouter()


@router.post("/", response_model=core.schemas.AccessPolicy, status_code=status.HTTP_201_CREATED)
def create_policy(
    policy: core.schemas.AccessPolicyCreate,
    db: Session = Depends(dependencies.get_db),
    current_user: core.models.User = Depends(dependencies.get_current_active_admin_user),
):
    """
    Create a new access policy for the organization.
    Only organization admins can create policies.
    """
    return core.crud.create_organization_policy(db=db, policy=policy, organization_id=current_user.organization_id)


@router.get("/", response_model=List[core.schemas.AccessPolicy])
def list_policies(
    db: Session = Depends(dependencies.get_db),
    current_user: core.models.User = Depends(dependencies.get_current_active_user),
):
    """
    List all access policies for the current user's organization.
    """
    return core.crud.get_policies_by_organization(db, organization_id=current_user.organization_id)


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_policy(
    policy_id: uuid.UUID,
    db: Session = Depends(dependencies.get_db),
    current_user: core.models.User = Depends(dependencies.get_current_active_admin_user),
):
    """
    Delete an access policy.
    Only organization admins can delete policies.
    """
    deleted_policy = core.crud.delete_policy(db=db, policy_id=policy_id, organization_id=current_user.organization_id)
    if not deleted_policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found or not authorized")