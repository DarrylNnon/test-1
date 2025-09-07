import enum
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, Enum as SQLAlchemyEnum, ForeignKey, Table, Float,
    func, LargeBinary
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY as PG_ARRAY
from sqlalchemy.orm import declarative_base, Mapped, mapped_column, relationship

# Association Table for Organization <-> CompliancePlaybook
Base = declarative_base()
organization_playbook_association = Table(
    'organization_playbook_association', Base.metadata,
    Column('organization_id', UUID(as_uuid=True), ForeignKey('organizations.id'), primary_key=True),
    Column('playbook_id', UUID(as_uuid=True), ForeignKey('compliance_playbooks.id'), primary_key=True)
)

class UserRole(str, enum.Enum):
    admin = "admin"
    member = "member"
    
class TeamRole(str, enum.Enum):
    lead = "lead"
    member = "member"

class DeviceType(str, enum.Enum):
    ios = "ios"
    android = "android"
    
class AnalysisStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    failed = "failed"

class NegotiationStatus(str, enum.Enum):
    DRAFTING = "DRAFTING"
    INTERNAL_REVIEW = "INTERNAL_REVIEW"
    EXTERNAL_REVIEW = "EXTERNAL_REVIEW"
    SIGNED = "SIGNED"
    ARCHIVED = "ARCHIVED"

class SuggestionStatus(str, enum.Enum):
    suggested = "suggested"
    accepted = "accepted"
    rejected = "rejected"

class VersionStatus(str, enum.Enum):
    draft = "draft"
    pending_approval = "pending_approval"
    approved = "approved"
    rejected = "rejected"

class SubscriptionStatus(str, enum.Enum):
    trialing = "trialing"
    active = "active"
    past_due = "past_due"
    canceled = "canceled"
    incomplete = "incomplete"

class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    users: Mapped[List["User"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    contracts: Mapped[List["Contract"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    clauses: Mapped[List["Clause"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    templates: Mapped[List["ContractTemplate"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    teams: Mapped[List["Team"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    integrations: Mapped[List["OrganizationIntegration"]] = relationship(back_populates="organization", cascade="all, delete-orphan")

    # --- NEW: Billing Fields ---
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String, unique=True)
    subscription_status: Mapped[Optional[SubscriptionStatus]] = mapped_column(Enum(SubscriptionStatus), index=True)
    plan_id: Mapped[Optional[str]] = mapped_column(String) # e.g., 'price_starter', 'price_pro'
    current_period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    developer_apps = relationship("DeveloperApp", back_populates="developer_org")
    installations = relationship("AppInstallation", back_populates="customer_org")
    sandbox_environments = relationship("SandboxEnvironment", back_populates="developer_org")

# V2 Compliance Module Relationship
    enabled_playbooks = relationship(
        "CompliancePlaybook",
        secondary=organization_playbook_association,
        back_populates="enabled_by_organizations")

# --- Contract Template Model ---
class ContractTemplate(Base):
    __tablename__ = "contract_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=False) # The template body with placeholders like {{variable_name}}
    category = Column(String, nullable=True, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization", back_populates="contract_templates")
    created_by = relationship("User")


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.member, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"))
    organization: Mapped["Organization"] = relationship(back_populates="users")
    
    # Relationships
    contracts: Mapped[List["Contract"]] = relationship(back_populates="uploader")
    comments: Mapped[List["UserComment"]] = relationship(back_populates="user")
    notifications: Mapped[List["Notification"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    clauses: Mapped[List["Clause"]] = relationship(back_populates="created_by")
    team_memberships: Mapped[List["TeamMembership"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    created_templates: Mapped[List["ContractTemplate"]] = relationship(back_populates="created_by")
    devices: Mapped[List["UserDevice"]] = relationship(back_populates="user", cascade="all, delete-orphan")

class Contract(Base):
    __tablename__ = "contracts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    analysis_status: Mapped[AnalysisStatus] = mapped_column(Enum(AnalysisStatus), default=AnalysisStatus.pending, nullable=False)
    full_text: Mapped[Optional[str]] = mapped_column(Text)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    negotiation_status = Column(Enum(NegotiationStatus), default=NegotiationStatus.DRAFTING, nullable=False)
    signature_request_id: Mapped[Optional[str]] = mapped_column(String)

    uploader_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"))
    team_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("teams.id"), nullable=True)

# --- Fields for CRM/External Integrations ---
    organization_integration_id = Column(UUID(as_uuid=True), ForeignKey("organization_integrations.id"), nullable=True)
    external_id = Column(String, nullable=True, index=True) # e.g., Salesforce Opportunity ID
    
    # Relationships
    uploader: Mapped["User"] = relationship(back_populates="contracts")
    organization: Mapped["Organization"] = relationship(back_populates="contracts")
    app_installations = relationship("AppInstallation", back_populates="installed_by")
    devices = relationship("UserDevice", back_populates="user")
    team: Mapped[Optional["Team"]] = relationship(back_populates="contracts")
    suggestions: Mapped[List["AnalysisSuggestion"]] = relationship(back_populates="contract", cascade="all, delete-orphan")
    comments: Mapped[List["UserComment"]] = relationship(back_populates="contract", cascade="all, delete-orphan")
    versions = relationship("ContractVersion", back_populates="contract", cascade="all, delete-orphan", order_by="ContractVersion.version_number")


class ContractVersion(Base):
    __tablename__ = "contract_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    full_text = Column(Text, nullable=True)
    analysis_status = Column(Enum(AnalysisStatus), default=AnalysisStatus.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # New fields for Autonomous Redlining
    parent_version_id = Column(UUID(as_uuid=True), ForeignKey("contract_versions.id"), nullable=True)
    version_status = Column(SQLAlchemyEnum(VersionStatus, name="versionstatus"), default=VersionStatus.draft, nullable=False)

    contract = relationship("Contract", back_populates="versions")
    uploader = relationship("User")
    suggestions = relationship("AnalysisSuggestion", back_populates="version", cascade="all, delete-orphan")
    comments = relationship("UserComment", back_populates="version", cascade="all, delete-orphan")

    # New relationship for Autonomous Redlining
    parent_version = relationship("ContractVersion", remote_side=[id], backref="child_versions")

# --- Marketplace & Partner Ecosystem ---

class DeveloperAppStatus(enum.Enum):
    development = "development"
    pending_review = "pending_review"
    published = "published"
    rejected = "rejected"
    archived = "archived"

class SandboxEnvironmentStatus(enum.Enum):
    provisioning = "provisioning"
    active = "active"
    suspended = "suspended"
    deleted = "deleted"

class DeveloperApp(Base):
    __tablename__ = "developer_apps"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text)
    developer_org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    client_id = Column(String, unique=True, index=True, nullable=False)
    client_secret_hash = Column(String, nullable=False)
    logo_url = Column(String, nullable=True)
    redirect_uris = Column(JSONB, nullable=False, default=[])
    scopes = Column(JSONB, nullable=False, default=[])
    status = Column(SQLAlchemyEnum(DeveloperAppStatus, name="developerappstatus"), nullable=False, default=DeveloperAppStatus.development)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    developer_org = relationship("Organization", back_populates="developer_apps")
    installations = relationship("AppInstallation", back_populates="app")

class AppInstallation(Base):
    __tablename__ = "app_installations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    app_id = Column(UUID(as_uuid=True), ForeignKey("developer_apps.id"), nullable=False)
    customer_org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    installed_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    installed_at = Column(DateTime(timezone=True), server_default=func.now())
    is_enabled = Column(Boolean, default=True, nullable=False)
    permissions = Column(JSONB, nullable=False, default={})

    app = relationship("DeveloperApp", back_populates="installations")
    customer_org = relationship("Organization", back_populates="installations")
    installed_by = relationship("User", back_populates="app_installations")

class SandboxEnvironment(Base):
    __tablename__ = "sandbox_environments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    developer_org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    subdomain = Column(String, unique=True, index=True, nullable=False)
    db_connection_string = Column(LargeBinary, nullable=False) # Will be encrypted
    status = Column(SQLAlchemyEnum(SandboxEnvironmentStatus, name="sandboxenvironmentstatus"), nullable=False, default=SandboxEnvironmentStatus.provisioning)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    developer_org = relationship("Organization", back_populates="sandbox_environments")


class AnalysisSuggestion(Base):
    __tablename__ = "analysis_suggestions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    contract_version_id = Column(UUID(as_uuid=True), ForeignKey("contract_versions.id"), nullable=False)
    start_index: Mapped[int] = mapped_column(Integer, nullable=False)
    end_index: Mapped[int] = mapped_column(Integer, nullable=False)
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_text: Mapped[Optional[str]] = mapped_column(Text)
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    risk_category: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[SuggestionStatus] = mapped_column(Enum(SuggestionStatus), default=SuggestionStatus.suggested, nullable=False)

    # New fields for Autonomous Redlining
    confidence_score = Column(Float, nullable=True)
    is_autonomous = Column(Boolean, default=False, nullable=False)

    contract_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("contracts.id"))
    contract: Mapped["Contract"] = relationship(back_populates="suggestions")
    version = relationship("ContractVersion", back_populates="suggestions")

class UserComment(Base):
    __tablename__ = "user_comments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    start_index: Mapped[int] = mapped_column(Integer, nullable=False)
    end_index: Mapped[int] = mapped_column(Integer, nullable=False)
    comment_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    contract_version_id = Column(UUID(as_uuid=True), ForeignKey("contract_versions.id"), nullable=False)

    contract_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("contracts.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

    contract: Mapped["Contract"] = relationship(back_populates="comments")
    user: Mapped["User"] = relationship(back_populates="comments")
    version = relationship("ContractVersion", back_populates="comments")

class CustomReport(Base):
    __tablename__ = "custom_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    configuration = Column(JSONB, nullable=False)

    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    organization = relationship("Organization")
    created_by = relationship("User", foreign_keys=[created_by_id])


class Team(Base):
    __tablename__ = "teams"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)

    organization = relationship("Organization", back_populates="teams")
    members = relationship("TeamMembership", back_populates="team", cascade="all, delete-orphan")
    contracts = relationship("Contract", back_populates="team")


class TeamMembership(Base):
    __tablename__ = "team_memberships"
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), primary_key=True)
    role = Column(Enum(TeamRole), default=TeamRole.member, nullable=False)

    user = relationship("User", back_populates="team_memberships")
    team = relationship("Team", back_populates="members")

class UserDevice(Base):
    __tablename__ = "user_devices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    device_token = Column(String, unique=True, nullable=False, index=True)
    device_type = Column(Enum(DeviceType), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="devices")

class Clause(Base):
    __tablename__ = "clauses"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String, nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="clauses")
    created_by: Mapped["User"] = relationship(back_populates="clauses")

class Integration(Base):
    __tablename__ = "integrations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True) # e.g., "salesforce", "hubspot"
    description: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True) # System-wide toggle

class OrganizationIntegration(Base):
    __tablename__ = "organization_integrations"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False) # Org-specific toggle
    encrypted_credentials: Mapped[Optional[bytes]] = mapped_column(LargeBinary) # Encrypted JSON blob of credentials
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    integration_id: Mapped[int] = mapped_column(ForeignKey("integrations.id"), nullable=False)

    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="integrations")
    integration: Mapped["Integration"] = relationship()

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    action: Mapped[str] = mapped_column(String, nullable=False, index=True) # e.g., "user.login", "contract.create"
    details: Mapped[Optional[dict]] = mapped_column(JSON) # e.g., {"contract_id": "...", "filename": "..."}

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship()

class CompliancePlaybook(Base):
    __tablename__ = "compliance_playbooks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    industry = Column(String, nullable=True, index=True) # e.g., "Healthcare", "Government"
    is_active = Column(Boolean, default=True, nullable=False)

    rules = relationship("PlaybookRule", back_populates="playbook", cascade="all, delete-orphan")
    enabled_by_organizations = relationship(
        "Organization",
        secondary=organization_playbook_association,
        back_populates="enabled_playbooks")

class PlaybookRule(Base):
    __tablename__ = "playbook_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    pattern = Column(Text, nullable=False)  # Regex pattern
    risk_category = Column(String, nullable=False)

    playbook_id = Column(UUID(as_uuid=True), ForeignKey("compliance_playbooks.id"), nullable=False)
    playbook = relationship("CompliancePlaybook", back_populates="rules")

    # --- Notification Service Models ---

class NotificationType(enum.Enum):
    EMAIL = "Email"
    IN_APP = "InApp"

class NotificationStatus(enum.Enum):
    PENDING = "Pending"
    SENT = "Sent"
    FAILED = "Failed"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    milestone_id = Column(Integer, ForeignKey("contract_milestones.id"), nullable=False)
    notification_type = Column(Enum(NotificationType), nullable=False, default=NotificationType.EMAIL)
    status = Column(Enum(NotificationStatus), nullable=False, default=NotificationStatus.PENDING)
    send_at = Column(DateTime(timezone=True), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    details = Column(Text, nullable=True)

    user = relationship("User")
    contract = relationship("Contract")
    milestone = relationship("ContractMilestone")

class AccessPolicy(Base):
    __tablename__ = "access_policies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    
    subject_attributes = Column(JSONB, nullable=False)
    actions = Column(PG_ARRAY(String), nullable=False)
    resource_attributes = Column(JSONB, nullable=False)
    effect = Column(String, nullable=False, default='allow') # V1 only supports 'allow'
    
    organization = relationship("Organization")

# --- Models for AI Negotiation Insights & Predictive Analytics ---

class NegotiationOutcomeEnum(enum.Enum):
    accepted = "accepted"
    rejected = "rejected"

class NegotiationOutcome(Base):
    __tablename__ = "negotiation_outcomes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)

    # Fields for Negotiation Insights
    original_clause_hash = Column(String, index=True, nullable=False)
    counter_offer_hash = Column(String, index=True, nullable=False)
    outcome = Column(SQLAlchemyEnum(NegotiationOutcomeEnum, name="negotiationoutcomeenum"), nullable=False)
    contract_type = Column(String, nullable=True)
    industry = Column(String, nullable=True) # User's org industry
    count = Column(Integer, default=1, nullable=False)

    # New Fields for Predictive Analytics
    negotiation_duration_days = Column(Integer, nullable=True)
    contract_value = Column(Integer, nullable=True)
    counterparty_industry = Column(String, nullable=True)
    clause_category = Column(String, index=True, nullable=True)