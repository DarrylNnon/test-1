from datetime import datetime, timedelta, timezone
import uuid
import difflib
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import json
import re
from . import models, schemas, security

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_organization_by_name(db: Session, name: str):
    return db.query(models.Organization).filter(models.Organization.name == name).first()

def create_user(db: Session, user: schemas.UserCreate):
    """
    Creates a user and their organization if it doesn't exist.
    The first user of an organization is automatically designated as an admin.
    """
    db_org = get_organization_by_name(db, name=user.organization_name)
    is_new_org = not db_org
    if is_new_org:
        db_org = models.Organization(name=user.organization_name)
        db.add(db_org)
        db.commit()
        db.refresh(db_org)

    hashed_password = security.get_password_hash(user.password)
    user_role = models.UserRole.admin if is_new_org else models.UserRole.member

    db_user = models.User(email=user.email, hashed_password=hashed_password, organization_id=db_org.id, role=user_role, is_active=True)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_contracts_by_organization(
    db: Session, organization_id: uuid.UUID, skip: int = 0, limit: int = 100
):
    return (
        db.query(models.Contract)
        .filter(models.Contract.organization_id == organization_id)
        .order_by(models.Contract.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_contract_by_id(db: Session, contract_id: uuid.UUID, organization_id: uuid.UUID):
    return (
        db.query(models.Contract)
        .filter(models.Contract.id == contract_id, models.Contract.organization_id == organization_id)
        .first()
    )

def update_contract_status(db: Session, contract_id: uuid.UUID, status: models.AnalysisStatus):
    db_contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if db_contract:
        db_contract.analysis_status = status
        db.commit()
        db.refresh(db_contract)
    return db_contract

def get_suggestion_by_id(db: Session, suggestion_id: uuid.UUID) -> Optional[models.AnalysisSuggestion]:
    """
    Retrieves an analysis suggestion by its ID.
    """
    # We use .options(joinedload(models.AnalysisSuggestion.contract)) to eagerly load
    # the related contract, which is needed for the authorization check in the API layer.
    # This avoids a second database query.
    return db.query(models.AnalysisSuggestion).filter(models.AnalysisSuggestion.id == suggestion_id).first()

def update_suggestion_status(
    db: Session, suggestion_id: uuid.UUID, contract_id: uuid.UUID, data: schemas.AnalysisSuggestionUpdate
) -> Optional[models.AnalysisSuggestion]:
    """
    Updates the status of a single analysis suggestion, ensuring it belongs to the correct contract.
    """
    db_suggestion = db.query(models.AnalysisSuggestion).filter(
        models.AnalysisSuggestion.id == suggestion_id,
        models.AnalysisSuggestion.contract_id == contract_id
    ).first()

    if db_suggestion:
        db_suggestion.status = data.status
        db.commit()
        db.refresh(db_suggestion)
    return db_suggestion

def create_clause(db: Session, clause: schemas.ClauseCreate, user_id: uuid.UUID, organization_id: uuid.UUID) -> models.Clause:
    db_clause = models.Clause(
        **clause.model_dump(),
        created_by_id=user_id,
        organization_id=organization_id
    )
    db.add(db_clause)
    db.commit()
    db.refresh(db_clause)
    return db_clause

def get_clauses_by_organization(db: Session, organization_id: uuid.UUID) -> List[models.Clause]:
    return (
        db.query(models.Clause)
        .options(joinedload(models.Clause.created_by))
        .filter(models.Clause.organization_id == organization_id)
        .order_by(models.Clause.title)
        .all()
    )

def get_clause_by_id(db: Session, clause_id: uuid.UUID, organization_id: uuid.UUID) -> Optional[models.Clause]:
    return (
        db.query(models.Clause)
        .options(joinedload(models.Clause.created_by))
        .filter(
            models.Clause.id == clause_id, models.Clause.organization_id == organization_id
        )
        .first()
    )

def update_clause(db: Session, clause_id: uuid.UUID, clause_update: schemas.ClauseUpdate, organization_id: uuid.UUID) -> Optional[models.Clause]:
    db_clause = get_clause_by_id(db, clause_id=clause_id, organization_id=organization_id)
    if db_clause:
        update_data = clause_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_clause, key, value)
        db.add(db_clause)
        db.commit()
        db.refresh(db_clause)
    return db_clause

def delete_clause(db: Session, clause_id: uuid.UUID, organization_id: uuid.UUID) -> Optional[models.Clause]:
    db_clause = get_clause_by_id(db, clause_id=clause_id, organization_id=organization_id)
    if db_clause:
        db.delete(db_clause)
        db.commit()
    return db_clause

def find_similar_clauses(db: Session, text_to_compare: str, organization_id: uuid.UUID, limit: int = 3) -> List[dict]:
    """
    Finds similar clauses from the library based on text content.
    Uses a simple sequence matching algorithm.
    """
    all_clauses = get_clauses_by_organization(db, organization_id=organization_id)
    if not all_clauses:
        return []

    results = []
    for clause in all_clauses:
        similarity = difflib.SequenceMatcher(None, text_to_compare, clause.content).ratio()
        if similarity > 0.5: # Set a threshold to avoid irrelevant results
            results.append({
                "clause": clause,
                "similarity_score": similarity
            })

    # Sort by score descending and take the top N results
    sorted_results = sorted(results, key=lambda x: x['similarity_score'], reverse=True)
    return sorted_results[:limit]

def set_password_reset_token(db: Session, user: models.User, token_hash: str) -> models.User:
    """
    Sets the password reset token hash and its expiration on a user.
    """
    token_lifetime_minutes = 60 # Token valid for 1 hour
    user.reset_password_token = token_hash
    user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=token_lifetime_minutes)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_password_reset_token(db: Session, token_hash: str) -> Optional[models.User]:
    """
    Retrieves a user by their password reset token hash.
    """
    return db.query(models.User).filter(models.User.reset_password_token == token_hash).first()

def reset_user_password(db: Session, user: models.User, new_password_hash: str) -> models.User:
    """
    Updates a user's password and clears the reset token fields.
    """
    user.hashed_password = new_password_hash
    user.reset_password_token = None
    user.reset_token_expires_at = None
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def create_user_comment(
    db: Session,
    comment: schemas.UserCommentCreate,
    contract_id: uuid.UUID,
    user_id: uuid.UUID,
) -> models.UserComment:
    db_comment = models.UserComment(
        **comment.model_dump(), contract_id=contract_id, user_id=user_id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

def get_organization_by_stripe_customer_id(db: Session, stripe_customer_id: str) -> Optional[models.Organization]:
    """
    Retrieves an organization by its Stripe customer ID.
    """
    return db.query(models.Organization).filter(models.Organization.stripe_customer_id == stripe_customer_id).first()

def update_organization_stripe_customer_id(db: Session, organization_id: uuid.UUID, stripe_customer_id: str) -> models.Organization:
    """
    Updates an organization with its Stripe customer ID.
    """
    db_org = db.query(models.Organization).filter(models.Organization.id == organization_id).first()
    if db_org:
        db_org.stripe_customer_id = stripe_customer_id
        db.commit()
        db.refresh(db_org)
    return db_org

def get_contracts_by_ids(db: Session, contract_ids: List[uuid.UUID], organization_id: uuid.UUID) -> List[models.Contract]:
    """
    Retrieves a list of contracts by their IDs, ensuring they belong to the correct organization.
    """
    return db.query(models.Contract).filter(
        models.Contract.id.in_(contract_ids),
        models.Contract.organization_id == organization_id
    ).all()

# --- Contract Template CRUD ---

def create_contract_template(db: Session, template: schemas.ContractTemplateCreate, user_id: uuid.UUID, organization_id: uuid.UUID) -> models.ContractTemplate:
    db_template = models.ContractTemplate(
        **template.model_dump(),
        created_by_id=user_id,
        organization_id=organization_id
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

def get_contract_templates_by_organization(db: Session, organization_id: uuid.UUID) -> List[models.ContractTemplate]:
    return (
        db.query(models.ContractTemplate)
        .options(joinedload(models.ContractTemplate.created_by))
        .filter(models.ContractTemplate.organization_id == organization_id)
        .order_by(models.ContractTemplate.title)
        .all()
    )

def get_contract_template_by_id(db: Session, template_id: uuid.UUID, organization_id: uuid.UUID) -> Optional[models.ContractTemplate]:
    return (
        db.query(models.ContractTemplate)
        .options(joinedload(models.ContractTemplate.created_by))
        .filter(
            models.ContractTemplate.id == template_id, models.ContractTemplate.organization_id == organization_id
        )
        .first()
    )

def update_contract_template(db: Session, template_id: uuid.UUID, template_update: schemas.ContractTemplateUpdate, organization_id: uuid.UUID) -> Optional[models.ContractTemplate]:
    db_template = get_contract_template_by_id(db, template_id=template_id, organization_id=organization_id)
    if db_template:
        update_data = template_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_template, key, value)
        db.add(db_template)
        db.commit()
        db.refresh(db_template)
    return db_template

def delete_contract_template(db: Session, template_id: uuid.UUID, organization_id: uuid.UUID) -> Optional[models.ContractTemplate]:
    db_template = get_contract_template_by_id(db, template_id=template_id, organization_id=organization_id)
    if db_template:
        db.delete(db_template)
        db.commit()
    return db_template

# --- Analytics CRUD ---

def get_analytics_kpis(db: Session, organization_id: uuid.UUID) -> dict:
    total_contracts = db.query(func.count(models.Contract.id)).filter(models.Contract.organization_id == organization_id).scalar()
    
    contracts_in_progress = db.query(func.count(models.Contract.id)).filter(
        models.Contract.organization_id == organization_id,
        models.Contract.analysis_status.in_([models.AnalysisStatus.pending, models.AnalysisStatus.in_progress])
    ).scalar()

    # Calculate average cycle time for completed contracts
    # This is a simplified calculation: (updated_at - created_at) for completed contracts
    avg_cycle_time_interval = db.query(
        func.avg(models.Contract.updated_at - models.Contract.created_at)
    ).filter(
        models.Contract.organization_id == organization_id,
        models.Contract.analysis_status == models.AnalysisStatus.completed
    ).scalar()

    avg_cycle_time_days = avg_cycle_time_interval.days if avg_cycle_time_interval else 0.0

    return {
        "total_contracts": total_contracts or 0,
        "contracts_in_progress": contracts_in_progress or 0,
        "average_cycle_time_days": round(avg_cycle_time_days, 2)
    }

def get_risk_category_distribution(db: Session, organization_id: uuid.UUID) -> List[dict]:
    results = db.query(
        models.AnalysisSuggestion.risk_category,
        func.count(models.AnalysisSuggestion.id).label('count')
    ).join(models.Contract).filter(
        models.Contract.organization_id == organization_id
    ).group_by(
        models.AnalysisSuggestion.risk_category
    ).order_by(
        func.count(models.AnalysisSuggestion.id).desc()
    ).all()
    return [{"category": row.risk_category, "count": row.count} for row in results]

def get_contract_volume_over_time(db: Session, organization_id: uuid.UUID) -> List[dict]:
    results = db.query(
        func.to_char(models.Contract.created_at, 'YYYY-MM').label('month'),
        func.count(models.Contract.id).label('count')
    ).filter(
        models.Contract.organization_id == organization_id
    ).group_by('month').order_by('month').all()
    return [{"month": row.month, "count": row.count} for row in results]

# --- Integration CRUD ---

def get_integration_by_name(db: Session, name: str) -> Optional[models.Integration]:
    """Gets a system integration by its unique name."""
    return db.query(models.Integration).filter(models.Integration.name == name).first()

def create_system_integration(db: Session, name: str, description: str) -> models.Integration:
    """Creates a new system-wide available integration."""
    db_integration = models.Integration(name=name, description=description)
    db.add(db_integration)
    db.commit()
    db.refresh(db_integration)
    return db_integration

def get_system_integrations(db: Session) -> List[models.Integration]:
    """Lists all system-wide available integrations."""
    return db.query(models.Integration).filter(models.Integration.is_active == True).all()

def get_organization_integrations(db: Session, organization_id: uuid.UUID) -> List[models.OrganizationIntegration]:
    """Lists all configured integrations for a specific organization."""
    return (
        db.query(models.OrganizationIntegration)
        .options(joinedload(models.OrganizationIntegration.integration))
        .filter(models.OrganizationIntegration.organization_id == organization_id)
        .all()
    )

def get_organization_integration_by_id(db: Session, org_integration_id: uuid.UUID, organization_id: uuid.UUID) -> Optional[models.OrganizationIntegration]:
    """Gets a specific organization integration configuration."""
    return (
        db.query(models.OrganizationIntegration)
        .filter(
            models.OrganizationIntegration.id == org_integration_id,
            models.OrganizationIntegration.organization_id == organization_id
        )
        .first()
    )

def create_organization_integration(db: Session, integration_id: int, organization_id: uuid.UUID, data: schemas.OrganizationIntegrationCreate) -> models.OrganizationIntegration:
    """Creates a new integration configuration for an organization, encrypting credentials."""
    credentials_json = json.dumps(data.credentials)
    encrypted_credentials = security.encrypt_data(credentials_json)

    db_org_integration = models.OrganizationIntegration(
        organization_id=organization_id,
        integration_id=integration_id,
        is_enabled=data.is_enabled,
        encrypted_credentials=encrypted_credentials
    )
    db.add(db_org_integration)
    db.commit()
    db.refresh(db_org_integration)
    return db_org_integration

def delete_organization_integration(db: Session, org_integration_id: uuid.UUID, organization_id: uuid.UUID) -> Optional[models.OrganizationIntegration]:
    """Deletes an organization's integration configuration."""
    db_org_integration = get_organization_integration_by_id(db, org_integration_id, organization_id)
    if db_org_integration:
        db.delete(db_org_integration)
        db.commit()
    return db_org_integration

# --- Audit Log CRUD ---

def create_audit_log(db: Session, *, user_id: uuid.UUID, organization_id: uuid.UUID, action: str, details: Optional[dict] = None):
    """Creates a new audit log entry."""
    db_log = models.AuditLog(
        user_id=user_id,
        organization_id=organization_id,
        action=action,
        details=details
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

def get_audit_logs_by_organization(db: Session, *, organization_id: uuid.UUID, skip: int = 0, limit: int = 100) -> List[models.AuditLog]:
    """Retrieves audit logs for a specific organization, with the newest entries first."""
    return (
        db.query(models.AuditLog)
        .options(joinedload(models.AuditLog.user))
        .filter(models.AuditLog.organization_id == organization_id)
        .order_by(models.AuditLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )