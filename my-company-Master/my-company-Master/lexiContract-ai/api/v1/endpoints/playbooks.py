from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from typing import List

from core import crud, models, schemas
from api.v1 import dependencies
from core.database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.CompliancePlaybook, status_code=status.HTTP_201_CREATED)
def create_playbook(
    playbook: schemas.CompliancePlaybookCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Create a new compliance playbook. Admin-only.
    """
    return crud.create_compliance_playbook(db=db, playbook=playbook)

@router.get("/", response_model=List[schemas.CompliancePlaybook])
def list_playbooks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Retrieve all compliance playbooks. Admin-only.
    """
    return crud.get_all_compliance_playbooks(db)

@router.get("/{playbook_id}", response_model=schemas.CompliancePlaybook)
def read_playbook(
    playbook_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Retrieve a single playbook by its ID. Admin-only.
    """
    db_playbook = crud.get_compliance_playbook_by_id(db, playbook_id=playbook_id)
    if db_playbook is None:
        raise HTTPException(status_code=404, detail="Playbook not found")
    return db_playbook

@router.patch("/{playbook_id}", response_model=schemas.CompliancePlaybook)
def update_playbook(
    playbook_id: uuid.UUID,
    playbook_update: schemas.CompliancePlaybookUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Update an existing playbook. Admin-only.
    Note: This only updates top-level fields. Rules must be managed separately if needed.
    """
    db_playbook = crud.update_compliance_playbook(db, playbook_id=playbook_id, playbook_update=playbook_update)
    if db_playbook is None:
        raise HTTPException(status_code=404, detail="Playbook not found")
    return db_playbook

@router.delete("/{playbook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_playbook(
    playbook_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Delete a playbook and all its associated rules. Admin-only.
    """
    deleted_playbook = crud.delete_compliance_playbook(db, playbook_id=playbook_id)
    if deleted_playbook is None:
        raise HTTPException(status_code=404, detail="Playbook not found")
    return

@router.get("/organization/available", response_model=List[schemas.CompliancePlaybook])
def list_available_industry_playbooks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Lists all available industry-specific playbooks that an organization can enable. Admin-only.
    """
    return crud.get_available_industry_playbooks(db)

@router.post("/organization/toggle", response_model=schemas.Organization)
def toggle_organization_playbook(
    toggle_request: schemas.OrganizationPlaybookToggle,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Enables or disables an industry-specific playbook for the admin's organization. Admin-only.
    """
    organization = current_user.organization
    if organization.plan_id != "enterprise":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature is only available for enterprise plans."
        )

    updated_org = crud.toggle_organization_playbook(db, organization=organization, playbook_id=toggle_request.playbook_id, enable=toggle_request.enable)

    if updated_org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playbook not found or is not an industry-specific playbook."
        )
    return updated_org