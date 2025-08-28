from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from typing import List

from core import crud, models, schemas, ai_services
from api.v1 import dependencies
from core.database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.ContractTemplate, status_code=status.HTTP_201_CREATED)
def create_contract_template(
    template: schemas.ContractTemplateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Create a new contract template in the organization's library.
    Only accessible by administrators.
    """
    dependencies.get_active_subscriber(current_user)
    return crud.create_contract_template(
        db=db,
        template=template,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
    )

@router.get("/", response_model=List[schemas.ContractTemplate])
def list_contract_templates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_active_subscriber),
):
    """
    Retrieve all contract templates for the user's organization.
    Accessible by any user with an active subscription.
    """
    return crud.get_contract_templates_by_organization(
        db, organization_id=current_user.organization_id
    )

@router.get("/{template_id}", response_model=schemas.ContractTemplate)
def read_contract_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_active_subscriber),
):
    """
    Retrieve a single contract template by its ID.
    """
    db_template = crud.get_contract_template_by_id(
        db, template_id=template_id, organization_id=current_user.organization_id
    )
    if db_template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return db_template

@router.patch("/{template_id}", response_model=schemas.ContractTemplate)
def update_contract_template(
    template_id: uuid.UUID,
    template_update: schemas.ContractTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Update an existing contract template.
    Only accessible by administrators.
    """
    dependencies.get_active_subscriber(current_user)
    db_template = crud.update_contract_template(
        db, template_id=template_id, template_update=template_update, organization_id=current_user.organization_id
    )
    if db_template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return db_template

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contract_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_admin_user),
):
    """
    Delete a contract template from the library.
    Only accessible by administrators.
    """
    dependencies.get_active_subscriber(current_user)
    deleted_template = crud.delete_contract_template(db, template_id=template_id, organization_id=current_user.organization_id)
    if deleted_template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return

@router.post("/{template_id}/draft", response_model=schemas.DraftContractResponse)
async def draft_contract_from_template(
    template_id: uuid.UUID,
    draft_request: schemas.DraftContractRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_active_subscriber),
):
    """
    Generates a new contract draft by filling a template with user-provided variables.
    This uses the AI service to perform the generation.
    """
    db_template = crud.get_contract_template_by_id(
        db, template_id=template_id, organization_id=current_user.organization_id
    )
    if db_template is None:
        raise HTTPException(status_code=404, detail="Template not found")

    draft_content = await ai_services.ai_service.generate_contract_from_template(
        template_content=db_template.content,
        variables=draft_request.variables
    )

    return schemas.DraftContractResponse(draft_content=draft_content)