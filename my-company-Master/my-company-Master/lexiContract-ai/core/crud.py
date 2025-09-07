from datetime import datetime, timedelta, timezone
import uuid
import difflib
import secrets
import hashlib
from sqlalchemy.orm import Session, joinedload, Query
from typing import List, Optional, Dict, Any, Type
import json
from sqlalchemy import func, extract
import re
from . import models, schemas, security
from .security import get_password_hash, hash_api_key

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

# --- Notification Service CRUD ---

def create_notification(db: Session, notification: schemas.NotificationCreate) -> models.Notification:
    """Creates a new notification."""
    db_notification = models.Notification(**notification.model_dump())
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification

def check_if_notification_exists(db: Session, user_id: uuid.UUID, milestone_id: int, details_substring: str) -> bool:
    """
    Checks if a notification already exists for a specific user, milestone,
    and containing a specific detail string (to differentiate windows like '90-day').
    """
    return db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.milestone_id == milestone_id,
        models.Notification.details.like(f"%{details_substring}%")
    ).first() is not None

def get_pending_notifications(db: Session) -> List[Type[models.Notification]]:
    """Retrieves all notifications with a 'Pending' status ready to be sent."""
    return db.query(models.Notification).options(
        joinedload(models.Notification.user),
        joinedload(models.Notification.contract),
        joinedload(models.Notification.milestone)
    ).filter(
        models.Notification.status == models.NotificationStatus.PENDING,
        models.Notification.send_at <= func.now()
    ).all()

def update_notification_status(db: Session, notification_id: int, status: schemas.NotificationStatus) -> Optional[models.Notification]:
    """Updates the status of a notification and sets the sent_at timestamp if 'Sent'."""
    db_notification = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if db_notification:
        db_notification.status = status
        if status == schemas.NotificationStatus.SENT:
            db_notification.sent_at = datetime.datetime.now(datetime.timezone.utc)
        db.commit()
        db.refresh(db_notification)
    return db_notification

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
    # Eagerly load the versions for each contract
    return (
        db.query(models.Contract)
        .options(joinedload(models.Contract.versions))
        .filter(models.Contract.organization_id == organization_id)
        .order_by(models.Contract.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

# --- Aggregation functions for Advanced Analytics Dashboard ---

def get_analytics_kpis(db: Session, *, organization_id: UUID) -> schemas.AnalyticsKPIs:
    """
    Aggregates Key Performance Indicators (KPIs) for the analytics dashboard.
    """
    total_contracts = db.query(func.count(models.Contract.id)).filter(models.Contract.organization_id == organization_id).scalar() or 0
    
    # Note: 'negotiation_status' comes from the Contract Negotiation Workflow feature.
    contracts_in_progress = (
        db.query(func.count(models.Contract.id))
        .filter(
            models.Contract.organization_id == organization_id,
            models.Contract.negotiation_status.in_(['Drafting', 'Internal Review', 'External Review'])
        )
        .scalar() or 0
    )

    # Placeholder for cycle time. A real implementation would calculate the
    # average time between contract creation and 'Signed' status.
    average_cycle_time_days = 8.5

    return schemas.AnalyticsKPIs(
        total_contracts=total_contracts,
        contracts_in_progress=contracts_in_progress,
        average_cycle_time_days=average_cycle_time_days,
    )

def get_risk_category_distribution(db: Session, *, organization_id: UUID) -> list[schemas.RiskDistribution]:
    """
    Gets the count of analysis suggestions grouped by risk category.
    """
    # This assumes AnalysisSuggestion has a 'risk_category' field.
    results = (
        db.query(models.AnalysisSuggestion.risk_category, func.count(models.AnalysisSuggestion.id).label("count"))
        .join(models.ContractVersion, models.ContractVersion.id == models.AnalysisSuggestion.contract_version_id)
        .join(models.Contract, models.Contract.id == models.ContractVersion.contract_id)
        .filter(models.Contract.organization_id == organization_id, models.AnalysisSuggestion.risk_category.isnot(None))
        .group_by(models.AnalysisSuggestion.risk_category)
        .order_by(func.count(models.AnalysisSuggestion.id).desc())
        .all()
    )
    return [schemas.RiskDistribution(category=row.risk_category, count=row.count) for row in results]

def get_contract_volume_over_time(db: Session, *, organization_id: UUID) -> list[schemas.VolumeOverTime]:
    """
    Gets the number of contracts created per month.
    """
    results = db.query(
        func.to_char(models.Contract.created_at, 'YYYY-MM').label('month'),
        func.count(models.Contract.id).label('count')
    ).filter(models.Contract.organization_id == organization_id).group_by('month').order_by('month').all()
    return [schemas.VolumeOverTime(month=row.month, count=row.count) for row in results]

def get_contract_by_id(db: Session, contract_id: uuid.UUID, organization_id: uuid.UUID):
    # Eagerly load all versions and their nested suggestions and comments for the detail view
    return (
        db.query(models.Contract)
        .options(
            joinedload(models.Contract.versions)
            .joinedload(models.ContractVersion.suggestions),
            joinedload(models.Contract.versions)
            .joinedload(models.ContractVersion.comments)
            .joinedload(models.UserComment.user)
        )
        .filter(models.Contract.id == contract_id, models.Contract.organization_id == organization_id)
        .first()
    )

def create_contract_with_initial_version(db: Session, filename: str, full_text: str, user_id: uuid.UUID, organization_id: uuid.UUID) -> models.Contract:

def get_custom_report(db: Session, report_id: uuid.UUID, organization_id: uuid.UUID) -> Optional[models.CustomReport]:
    return db.query(models.CustomReport).filter(
        models.CustomReport.id == report_id,
        models.CustomReport.organization_id == organization_id
    ).first()

def get_custom_reports_by_organization(db: Session, organization_id: uuid.UUID, skip: int = 0, limit: int = 100) -> List[models.CustomReport]:
    return db.query(models.CustomReport).filter(
        models.CustomReport.organization_id == organization_id
    ).order_by(models.CustomReport.name).offset(skip).limit(limit).all()

def create_custom_report(db: Session, report: schemas.CustomReportCreate, user_id: uuid.UUID, organization_id: uuid.UUID) -> models.CustomReport:
    db_report = models.CustomReport(
        **report.model_dump(),
        created_by_id=user_id,
        organization_id=organization_id
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

def update_custom_report(db: Session, db_report: models.CustomReport, report_in: schemas.CustomReportUpdate) -> models.CustomReport:
    report_data = report_in.model_dump(exclude_unset=True)
    for key, value in report_data.items():
        setattr(db_report, key, value)
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

def delete_custom_report(db: Session, db_report: models.CustomReport):
    db.delete(db_report)
    db.commit()
    return db_report

# --- Team Management CRUD ---

def create_team(db: Session, team: schemas.TeamCreate, organization_id: UUID) -> models.Team:
    db_team = models.Team(name=team.name, organization_id=organization_id)
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    return db_team

def get_team(db: Session, team_id: UUID, organization_id: UUID) -> Optional[models.Team]:
    return db.query(models.Team).options(joinedload(models.Team.members).joinedload(models.TeamMembership.user)).filter(
        models.Team.id == team_id,
        models.Team.organization_id == organization_id
    ).first()

def get_teams_by_organization(db: Session, organization_id: UUID) -> List[models.Team]:
    return db.query(models.Team).options(joinedload(models.Team.members).joinedload(models.TeamMembership.user)).filter(
        models.Team.organization_id == organization_id
    ).order_by(models.Team.name).all()

def update_team(db: Session, db_team: models.Team, team_in: schemas.TeamCreate) -> models.Team:
    db_team.name = team_in.name
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    return db_team

def delete_team(db: Session, db_team: models.Team):
    db.delete(db_team)
    db.commit()
    return db_team

def add_team_member(db: Session, team_id: UUID, user_id: UUID, role: schemas.TeamRole) -> models.TeamMembership:
    db_membership = models.TeamMembership(team_id=team_id, user_id=user_id, role=role)
    db.add(db_membership)
    db.commit()
    db.refresh(db_membership)
    return db_membership

def get_team_member(db: Session, team_id: UUID, user_id: UUID) -> Optional[models.TeamMembership]:
    return db.query(models.TeamMembership).filter(
        models.TeamMembership.team_id == team_id,
        models.TeamMembership.user_id == user_id
    ).first()

def remove_team_member(db: Session, db_membership: models.TeamMembership):
    db.delete(db_membership)
    db.commit()
    return db_membership

def assign_contract_to_team(db: Session, db_contract: models.Contract, team_id: Optional[UUID]) -> models.Contract:
    """Assigns a contract to a team, or unassigns it if team_id is None."""
    db_contract.team_id = team_id
    db.add(db_contract)
    db.commit()
    db.refresh(db_contract)
    return db_contract

def upsert_user_device(db: Session, user_id: uuid.UUID, device: schemas.UserDeviceCreate) -> models.UserDevice:
    """
    Creates a new user device or updates the user_id if the device token already exists.
    This handles cases where a user logs out and another logs in on the same device.
    """
    db_device = db.query(models.UserDevice).filter(models.UserDevice.device_token == device.token).first()
    if db_device:
        # Token exists, update user_id and type if necessary
        db_device.user_id = user_id
        db_device.device_type = device.type
    else:
        # New device token
        db_device = models.UserDevice(
            user_id=user_id,
            device_token=device.token,
            device_type=device.type
        )
        db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

def create_contract_for_import(db: Session, *, filename: str, user_id: UUID, organization_id: UUID, org_integration_id: UUID, external_id: str) -> models.Contract:
    """
    Creates a new Contract and its initial ContractVersion for a file imported from an external source.
    The text content is not required at creation time.
    """
    db_contract = models.Contract(
        filename=filename,
        organization_id=organization_id,
        organization_integration_id=org_integration_id,
        external_id=external_id
    )
    db.add(db_contract)
    db.flush()

    initial_version = models.ContractVersion(
        contract_id=db_contract.id,
        version_number=1,
        uploader_id=user_id,
        analysis_status=models.AnalysisStatus.pending
    )
    db.add(initial_version)
    db.commit()
    db.refresh(db_contract)
    return db_contract

def create_new_contract_version(db: Session, contract_id: uuid.UUID, full_text: str, uploader_id: uuid.UUID) -> Optional[models.ContractVersion]:
    """
    Creates a new version for an existing contract.
    """
    # Get the highest existing version number for this contract to determine the new version number
    highest_version = db.query(func.max(models.ContractVersion.version_number)).filter(models.ContractVersion.contract_id == contract_id).scalar() or 0

    new_version = models.ContractVersion(
        contract_id=contract_id,
        version_number=highest_version + 1,
        full_text=full_text,
        uploader_id=uploader_id,
        analysis_status=models.AnalysisStatus.pending
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_version)
    return new_version

def get_contract_version_by_id(db: Session, version_id: uuid.UUID) -> Optional[models.ContractVersion]:
    return db.query(models.ContractVersion).filter(models.ContractVersion.id == version_id).first()

def update_contract_version_status(db: Session, version_id: uuid.UUID, status: models.AnalysisStatus):
    db_version = db.query(models.ContractVersion).filter(models.ContractVersion.id == version_id).first()
    if db_version:
        db_version.analysis_status = status
        db.commit()
        db.refresh(db_version)
    return db_version

def update_contract_version_analysis(db: Session, version_id: uuid.UUID, full_text: str, suggestions: List[schemas.AnalysisSuggestionCreate]) -> models.ContractVersion:
    """
    Updates a contract version with the full text and a new set of analysis suggestions.
    This function deletes old suggestions and creates new ones to ensure idempotency.
    """
    db_version = db.query(models.ContractVersion).filter(models.ContractVersion.id == version_id).first()
    if not db_version:
        return None

# --- Developer Portal & Marketplace CRUD ---

def generate_client_credentials():
    """Generates a secure client_id and client_secret."""
    client_id = f"lc_client_{secrets.token_urlsafe(16)}"
    client_secret = secrets.token_urlsafe(32)
    return client_id, client_secret

def create_developer_app(db: Session, app: schemas.DeveloperAppCreate, developer_org_id: UUID):
    client_id, client_secret = generate_client_credentials()
    client_secret_hash = hash_api_key(client_secret) # Reusing the same secure hashing

    db_app = models.DeveloperApp(
        name=app.name,
        description=app.description,
        developer_org_id=developer_org_id,
        client_id=client_id,
        client_secret_hash=client_secret_hash,
        redirect_uris=app.redirect_uris,
        scopes=app.scopes
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app, client_secret # Return the raw secret only on creation

def get_developer_apps_by_org(db: Session, org_id: UUID):
    return db.query(models.DeveloperApp).filter(models.DeveloperApp.developer_org_id == org_id).all()

def get_developer_app(db: Session, app_id: UUID, org_id: UUID):
    return db.query(models.DeveloperApp).filter(models.DeveloperApp.id == app_id, models.DeveloperApp.developer_org_id == org_id).first()

def regenerate_client_secret(db: Session, db_app: models.DeveloperApp):
    _client_id, new_client_secret = generate_client_credentials()
    db_app.client_secret_hash = hash_api_key(new_client_secret)
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app, new_client_secret

def get_developer_app_by_client_id(db: Session, client_id: str) -> Optional[models.DeveloperApp]:
    return db.query(models.DeveloperApp).filter(models.DeveloperApp.client_id == client_id).first()

def create_app_installation(db: Session, app_id: UUID, customer_org_id: UUID, installed_by_user_id: UUID, permissions: dict) -> models.AppInstallation:
    db_installation = models.AppInstallation(
        app_id=app_id,
        customer_org_id=customer_org_id,
        installed_by_user_id=installed_by_user_id,
        permissions=permissions,
        is_enabled=True
    )
    db.add(db_installation)
    db.commit()
    db.refresh(db_installation)
    return db_installation

def get_published_apps(db: Session, skip: int = 0, limit: int = 100):
    """Gets all developer apps with a 'published' status."""
    return db.query(models.DeveloperApp).filter(models.DeveloperApp.status == models.DeveloperAppStatus.published).offset(skip).limit(limit).all()

def get_sandbox_by_org(db: Session, org_id: UUID) -> Optional[models.SandboxEnvironment]:
    return db.query(models.SandboxEnvironment).filter(models.SandboxEnvironment.developer_org_id == org_id).first()

def create_sandbox_environment(db: Session, developer_org_id: UUID) -> models.SandboxEnvironment:
    """
    Creates a new SandboxEnvironment record in a 'provisioning' state.
    """
    subdomain = f"dev-org-{str(developer_org_id)[:8]}.sandbox.lexicontract.ai"
    
    # Encrypt placeholder data for the non-nullable connection string field.
    # This will be updated by the background provisioning job.
    placeholder_creds = encrypt_data('{"status": "provisioning"}')

    db_sandbox = models.SandboxEnvironment(
        developer_org_id=developer_org_id,
        subdomain=subdomain,
        status=models.SandboxEnvironmentStatus.provisioning,
        db_connection_string=placeholder_creds
    )
    db.add(db_sandbox)
    db.commit()
    db.refresh(db_sandbox)
    return db_sandbox

def update_sandbox_environment(db: Session, sandbox_id: UUID, status: models.SandboxEnvironmentStatus, connection_string_bytes: Optional[bytes] = None) -> Optional[models.SandboxEnvironment]:
    db_sandbox = db.query(models.SandboxEnvironment).filter(models.SandboxEnvironment.id == sandbox_id).first()
    if not db_sandbox:
        return None
    db_sandbox.status = status
    if connection_string_bytes:
        db_sandbox.db_connection_string = connection_string_bytes
    db.commit()
    db.refresh(db_sandbox)
    return db_sandbox

    # Update contract text and status
    db_version.full_text = full_text
    db_version.analysis_status = models.AnalysisStatus.completed

    # Delete existing suggestions for this version
    db.query(models.AnalysisSuggestion).filter(models.AnalysisSuggestion.contract_version_id == version_id).delete(synchronize_session=False)

    # Create new suggestions
    for suggestion_in in suggestions:
        db_suggestion = models.AnalysisSuggestion(
            **suggestion_in.model_dump(),
            contract_version_id=version_id
        )
        db.add(db_suggestion)

    db.commit()
    db.refresh(db_version)
    return db_version

def create_new_contract_version_with_parent(db: Session, original_version: models.ContractVersion, new_text: str) -> models.ContractVersion:
    """
    Creates a new, AI-generated contract version that is a child of an existing version.
    It determines the next version number based on the highest existing for the contract.
    """
    highest_version = db.query(func.max(models.ContractVersion.version_number)).filter(
        models.ContractVersion.contract_id == original_version.contract_id
    ).scalar() or 0

    new_version = models.ContractVersion(
        contract_id=original_version.contract_id,
        version_number=highest_version + 1,
        full_text=new_text,
        uploader_id=original_version.uploader_id, # Attributed to the same user
        analysis_status=models.AnalysisStatus.completed, # The analysis is implicitly done
        parent_version_id=original_version.id,
        version_status=models.VersionStatus.pending_approval
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_version)
    return new_version

def copy_suggestions_to_new_version(db: Session, suggestions: list[models.AnalysisSuggestion], new_version_id: uuid.UUID):
    """
    Copies a list of suggestions to a new contract version and marks them as autonomous.
    """
    for original_suggestion in suggestions:
        new_suggestion = models.AnalysisSuggestion(
            contract_version_id=new_version_id,
            contract_id=original_suggestion.contract_id,
            start_index=original_suggestion.start_index,
            end_index=original_suggestion.end_index,
            original_text=original_suggestion.original_text,
            suggested_text=original_suggestion.suggested_text,
            comment=original_suggestion.comment,
            risk_category=original_suggestion.risk_category,
            is_autonomous=True # Mark as an autonomous change
        )
        db.add(new_suggestion)
    db.commit()

def get_suggestion_by_id(db: Session, suggestion_id: uuid.UUID) -> Optional[models.AnalysisSuggestion]:
    """
    Retrieves an analysis suggestion by its ID.
    """
    # Eagerly load up to the contract for authorization checks
    return db.query(models.AnalysisSuggestion).options(
        joinedload(models.AnalysisSuggestion.version)
        .joinedload(models.ContractVersion.contract)
    ).filter(models.AnalysisSuggestion.id == suggestion_id).first()

def update_suggestion_status(
    db: Session, suggestion_id: uuid.UUID, contract_version_id: uuid.UUID, data: schemas.AnalysisSuggestionUpdate
) -> Optional[models.AnalysisSuggestion]:
    """
    Updates the status of a single analysis suggestion, ensuring it belongs to the correct contract version.
    """
    db_suggestion = db.query(models.AnalysisSuggestion).filter(
        models.AnalysisSuggestion.id == suggestion_id,
        models.AnalysisSuggestion.contract_version_id == contract_version_id
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
    contract_version_id: uuid.UUID,
    user_id: uuid.UUID,
) -> models.UserComment:
    db_comment = models.UserComment(
        **comment.model_dump(), contract_version_id=contract_version_id, user_id=user_id
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

def get_integration_by_name(db: Session, *, name: str) -> models.Integration | None:
    """Gets an integration from the catalog by its unique name."""
    return db.query(models.Integration).filter(models.Integration.name == name).first()

def upsert_organization_integration(db: Session, *, organization_id: UUID, integration_id: UUID, credentials: dict, metadata: dict) -> models.OrganizationIntegration:
    """
    Creates or updates an organization's integration with new credentials and metadata.
    """
    db_obj = db.query(models.OrganizationIntegration).filter(
        models.OrganizationIntegration.organization_id == organization_id,
        models.OrganizationIntegration.integration_id == integration_id
    ).first()

    encrypted_creds = security.encrypt_data(credentials)

    if db_obj:
        # Update existing integration
        db_obj.credentials = encrypted_creds
        db_obj.metadata = metadata
        db_obj.is_enabled = True
    else:
        # Create new integration
        db_obj = models.OrganizationIntegration(organization_id=organization_id, integration_id=integration_id, credentials=encrypted_creds, metadata=metadata, is_enabled=True)
        db.add(db_obj)
    
    db.commit()
    db.refresh(db_obj)
    return db_obj

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

def get_clause_acceptance_stats(db: Session, clause_category: str) -> dict:
    """
    Aggregates the number of accepted vs. rejected outcomes for a given clause category.
    """
    results = db.query(
        models.NegotiationOutcome.outcome,
        func.sum(models.NegotiationOutcome.count).label('total_count')
    ).filter(
        models.NegotiationOutcome.clause_category == clause_category,
    ).group_by(
        models.NegotiationOutcome.outcome
    ).all()

    # The .name attribute accesses the string value of the enum member
    return {row.outcome.name: row.total_count for row in results}

# --- Analytics CRUD ---

def get_analytics_kpis(db: Session, organization_id: uuid.UUID) -> dict:
    total_contracts = db.query(func.count(models.Contract.id)).filter(
        models.Contract.organization_id == organization_id
    ).scalar()
    
    contracts_in_progress = db.query(func.count(models.ContractVersion.id)).join(models.Contract).filter(
        models.Contract.organization_id == organization_id,
        models.ContractVersion.analysis_status.in_([models.AnalysisStatus.pending, models.AnalysisStatus.in_progress])
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
    ).join(models.ContractVersion, models.AnalysisSuggestion.contract_version_id == models.ContractVersion.id)\
     .join(models.Contract, models.ContractVersion.contract_id == models.Contract.id)\
     .filter(
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

# --- Compliance Playbook CRUD ---

def create_compliance_playbook(db: Session, playbook: schemas.CompliancePlaybookCreate) -> models.CompliancePlaybook:
    """Creates a new compliance playbook with its associated rules."""
    db_playbook = models.CompliancePlaybook(
        name=playbook.name,
        description=playbook.description,
        is_active=playbook.is_active
    )
    for rule_in in playbook.rules:
        db_rule = models.PlaybookRule(**rule_in.model_dump())
        db_playbook.rules.append(db_rule)
    
    db.add(db_playbook)
    db.commit()
    db.refresh(db_playbook)
    return db_playbook

def get_all_compliance_playbooks(db: Session) -> List[models.CompliancePlaybook]:
    """Retrieves all compliance playbooks with their rules."""
    return db.query(models.CompliancePlaybook).options(joinedload(models.CompliancePlaybook.rules)).all()

def get_active_compliance_playbooks(db: Session) -> List[models.CompliancePlaybook]:
    """Retrieves all active compliance playbooks with their rules."""
    return (
        db.query(models.CompliancePlaybook)
        .options(joinedload(models.CompliancePlaybook.rules))
        .filter(models.CompliancePlaybook.is_active == True)
        .all()
    )

def get_compliance_playbook_by_id(db: Session, playbook_id: uuid.UUID) -> Optional[models.CompliancePlaybook]:
    """Retrieves a single compliance playbook by its ID."""
    return db.query(models.CompliancePlaybook).options(joinedload(models.CompliancePlaybook.rules)).filter(models.CompliancePlaybook.id == playbook_id).first()

def update_compliance_playbook(db: Session, playbook_id: uuid.UUID, playbook_update: schemas.CompliancePlaybookUpdate) -> Optional[models.CompliancePlaybook]:
    """Updates a compliance playbook's top-level fields (name, description, is_active)."""
    db_playbook = get_compliance_playbook_by_id(db, playbook_id)
    if db_playbook:
        update_data = playbook_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_playbook, key, value)
        db.commit()
        db.refresh(db_playbook)
    return db_playbook

def delete_compliance_playbook(db: Session, playbook_id: uuid.UUID) -> Optional[models.CompliancePlaybook]:
    """Deletes a compliance playbook and all its associated rules."""
    db_playbook = get_compliance_playbook_by_id(db, playbook_id)
    if db_playbook:
        db.delete(db_playbook)
        db.commit()
    return db_playbook

def get_playbooks_for_organization(db: Session, organization_id: uuid.UUID) -> List[models.CompliancePlaybook]:
    """
    Retrieves all playbooks applicable to a given organization.
    This includes:
    1. All active, non-industry-specific playbooks (industry is NULL).
    2. All active, industry-specific playbooks that the organization has explicitly enabled.
    """
    # Get general playbooks (not specific to any industry)
    general_playbooks = (
        db.query(models.CompliancePlaybook)
        .options(joinedload(models.CompliancePlaybook.rules))
        .filter(models.CompliancePlaybook.is_active == True, models.CompliancePlaybook.industry == None)
        .all()
    )

    # Get playbooks explicitly enabled by the organization
    organization = (
        db.query(models.Organization)
        .options(joinedload(models.Organization.enabled_playbooks).joinedload(models.CompliancePlaybook.rules))
        .filter(models.Organization.id == organization_id)
        .first()
    )
    enabled_playbooks = organization.enabled_playbooks if organization else []

    # Combine and deduplicate
    final_playbooks = {playbook.id: playbook for playbook in general_playbooks}
    for playbook in enabled_playbooks:
        if playbook.is_active:  # Only include active playbooks
            final_playbooks[playbook.id] = playbook

    return list(final_playbooks.values())

def get_available_industry_playbooks(db: Session) -> List[models.CompliancePlaybook]:
    """Retrieves all active, industry-specific playbooks that organizations can opt into."""
    return db.query(models.CompliancePlaybook).filter(models.CompliancePlaybook.is_active == True, models.CompliancePlaybook.industry != None).all()

def toggle_organization_playbook(db: Session, organization: models.Organization, playbook_id: uuid.UUID, enable: bool) -> Optional[models.Organization]:
    """Enables or disables an industry-specific playbook for an organization."""
    playbook = db.query(models.CompliancePlaybook).filter(models.CompliancePlaybook.id == playbook_id, models.CompliancePlaybook.industry != None).first()
    if not playbook:
        return None  # Playbook not found or is not an industry playbook

    if enable and playbook not in organization.enabled_playbooks:
        organization.enabled_playbooks.append(playbook)
    elif not enable and playbook in organization.enabled_playbooks:
        organization.enabled_playbooks.remove(playbook)

    db.commit()
    db.refresh(organization)
    return organization

# --- Compliance Insights Dashboard CRUD ---

def get_compliance_findings_by_category(db: Session, organization_id: uuid.UUID) -> List[dict]:
    """
    Aggregates compliance-related analysis suggestions by risk category for a given organization.
    Only includes categories from compliance playbooks (e.g., HIPAA, FAR, Data Privacy), not general AI suggestions.
    """
    # Define what counts as a compliance category to filter out general suggestions
    compliance_categories = ["HIPAA", "FAR", "Data Privacy", "Security", "Compliance"]
    results = (
        db.query(
            models.AnalysisSuggestion.risk_category,
            func.count(models.AnalysisSuggestion.id).label('count')
        )
        .join(models.ContractVersion, models.AnalysisSuggestion.contract_version_id == models.ContractVersion.id)
        .join(models.Contract, models.ContractVersion.contract_id == models.Contract.id)
        .filter(
            models.Contract.organization_id == organization_id,
            models.AnalysisSuggestion.risk_category.in_(compliance_categories)
        )
        .group_by(models.AnalysisSuggestion.risk_category)
        .order_by(func.count(models.AnalysisSuggestion.id).desc())
        .all()
    )
    return [{"category": row.risk_category, "count": row.count} for row in results]

def get_top_flagged_contracts(db: Session, organization_id: uuid.UUID, limit: int = 5) -> List[dict]:
    """
    Finds the contracts with the highest number of compliance-related findings.
    """
    compliance_categories = ["HIPAA", "FAR", "Data Privacy", "Security", "Compliance"]
    results = (
        db.query(
            models.Contract.id,
            models.Contract.filename,
            func.count(models.AnalysisSuggestion.id).label('finding_count')
        )
        .join(models.ContractVersion).join(models.AnalysisSuggestion)
        .filter(
            models.Contract.organization_id == organization_id,
            models.AnalysisSuggestion.risk_category.in_(compliance_categories)
        )
        .group_by(models.Contract.id, models.Contract.filename)
        .order_by(func.count(models.AnalysisSuggestion.id).desc())
        .limit(limit)
        .all()
    )
    return [{"contract_id": row.id, "filename": row.filename, "finding_count": row.finding_count} for row in results]

    # --- Google Drive Specific OAuth 2.0 Flow ---

@router.get(
    "/google-drive/auth",
    summary="Initiate Google Drive Connection",
    description="Redirects the user to Google to authorize the integration.",
)
def google_drive_auth_redirect(
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    state = security.create_oauth_state_token(organization_id=str(current_user.organization_id))
    # This scope provides read-only access to files, which is all we need for import.
    scope = "https://www.googleapis.com/auth/drive.readonly"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={settings.GOOGLE_REDIRECT_URI}&"
        f"response_type=code&"
        f"scope={scope}&"
        f"access_type=offline&" # Required to get a refresh token
        f"prompt=consent&" # Ensures the user is prompted for consent every time
        f"state={state}"
    )
    return RedirectResponse(url=auth_url)

@router.get(
    "/google-drive/callback",
    summary="Google Drive OAuth Callback",
    description="Handles the callback from Google after user authorization. Do not call directly.",
)
async def google_drive_auth_callback(
    request: Request,
    db: Session = Depends(dependencies.get_db),
):
    code = request.query_params.get("code")
    state = request.query_params.get("state")

    organization_id_str = security.verify_oauth_state_token(state)
    if not organization_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired state token. Please try connecting again.")

    token_url = "https://oauth2.googleapis.com/token"
    payload = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=payload)

    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to retrieve token from Google: {response.text}")

    token_data = response.json()
    credentials = {"access_token": token_data["access_token"], "refresh_token": token_data["refresh_token"]}
    google_drive_integration = crud.get_integration_by_name(db, name="Google Drive")
    crud.upsert_organization_integration(db, organization_id=UUID(organization_id_str), integration_id=google_drive_integration.id, credentials=credentials, metadata={})
    return RedirectResponse(url="/settings/integrations?success=google-drive")