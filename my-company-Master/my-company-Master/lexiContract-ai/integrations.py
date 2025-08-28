import json
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core import crud, models, schemas, security
from api.v1 import dependencies
from core.database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.Integration])
def list_available_integrations(db: Session = Depends(get_db)):
    """
    Lists all system-wide available integrations (e.g., Salesforce, HubSpot).
    """
    return crud.get_system_integrations(db)

@router.get("/organization", response_model=List[schemas.OrganizationIntegration])
def list_organization_integrations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Lists all integrations configured for the current user's organization.
    Admin-only endpoint.
    """
    return crud.get_organization_integrations(db, organization_id=current_user.organization_id)

@router.post("/organization/{integration_id}", response_model=schemas.OrganizationIntegration, status_code=status.HTTP_201_CREATED)
def connect_organization_integration(
    integration_id: int,
    data: schemas.OrganizationIntegrationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Connects a new integration for the organization, storing encrypted credentials.
    Admin-only endpoint.
    """
    # Check if this integration is already configured for the org
    existing_configs = crud.get_organization_integrations(db, organization_id=current_user.organization_id)
    if any(config.integration.id == integration_id for config in existing_configs):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Integration already configured for this organization.")

    try:
        return crud.create_organization_integration(
            db,
            integration_id=integration_id,
            organization_id=current_user.organization_id,
            data=data
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/organization/{org_integration_id}", status_code=status.HTTP_204_NO_CONTENT)
def disconnect_organization_integration(
    org_integration_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Disconnects an integration from the organization, securely deleting its credentials.
    Admin-only endpoint.
    """
    deleted_integration = crud.delete_organization_integration(
        db,
        org_integration_id=org_integration_id,
        organization_id=current_user.organization_id
    )
    if not deleted_integration:
        # To make DELETE idempotent, we don't raise a 404 if it's already gone.
        # A 404 would imply the client should retry, which is not the case.
        # We simply acknowledge the desired state (disconnected) is achieved.
        pass
    return