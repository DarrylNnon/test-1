from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from core import crud, schemas
from core.models import User, SandboxEnvironmentStatus
from api.v1.dependencies import get_db, get_current_active_user
from core.sandbox_service import provision_new_environment

router = APIRouter()

@router.post("/apps", response_model=schemas.DeveloperAppWithSecret, status_code=status.HTTP_201_CREATED)
def create_developer_app(
    app_in: schemas.DeveloperAppCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a new developer application. The client_secret is only returned on creation.
    """
    db_app, client_secret = crud.create_developer_app(db=db, app=app_in, developer_org_id=current_user.organization_id)
    
    app_with_secret = schemas.DeveloperAppWithSecret(
        **schemas.DeveloperApp.from_orm(db_app).model_dump(),
        client_secret=client_secret
    )
    return app_with_secret

@router.get("/apps", response_model=List[schemas.DeveloperApp])
def list_developer_apps(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    List all developer applications for the current user's organization.
    """
    return crud.get_developer_apps_by_org(db=db, org_id=current_user.organization_id)

@router.get("/apps/{app_id}", response_model=schemas.DeveloperApp)
def get_developer_app(
    app_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get a specific developer application by ID.
    """
    db_app = crud.get_developer_app(db=db, app_id=app_id, org_id=current_user.organization_id)
    if not db_app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")
    return db_app

@router.post("/apps/{app_id}/regenerate-secret", response_model=schemas.DeveloperAppWithSecret)
def regenerate_secret(
    app_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    db_app = crud.get_developer_app(db=db, app_id=app_id, org_id=current_user.organization_id)
    if not db_app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")
    
    updated_app, new_secret = crud.regenerate_client_secret(db=db, db_app=db_app)
    return schemas.DeveloperAppWithSecret(**schemas.DeveloperApp.from_orm(updated_app).model_dump(), client_secret=new_secret)

@router.post("/sandboxes", response_model=schemas.SandboxEnvironment, status_code=status.HTTP_202_ACCEPTED)
def create_sandbox_environment(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Requests the provisioning of a new sandbox environment for the developer's organization.
    This is an asynchronous operation. The initial status will be 'provisioning'.
    """
    existing_sandbox = crud.get_sandbox_by_org(db, org_id=current_user.organization_id)
    if existing_sandbox and existing_sandbox.status in [SandboxEnvironmentStatus.active, SandboxEnvironmentStatus.provisioning]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A sandbox environment for this organization is already active or being provisioned."
        )

    db_sandbox = crud.create_sandbox_environment(db=db, developer_org_id=current_user.organization_id)
    
    # Add the long-running provisioning task to the background
    background_tasks.add_task(provision_new_environment, db_sandbox.id, db_sandbox.developer_org_id)
    
    return db_sandbox

@router.get("/sandboxes/me", response_model=schemas.SandboxEnvironment)
def get_my_sandbox_environment(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retrieves the current sandbox environment for the developer's organization.
    """
    db_sandbox = crud.get_sandbox_by_org(db, org_id=current_user.organization_id)
    if not db_sandbox:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No sandbox environment found for this organization.")
    return db_sandbox