import enum
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Text, Table, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY as PG_ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class UserRole(str, enum.Enum):
    admin = "admin"
    member = "member"

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

class SignerStatus(str, enum.Enum):
    created = "created"
    sent = "sent"
    delivered = "delivered"
    signed = "signed"
    declined = "declined"

class SignatureStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    completed = "completed"
    voided = "voided"

class SuggestionStatus(str, enum.Enum):
    suggested = "suggested"
    accepted = "accepted"
    rejected = "rejected"

class SubscriptionStatus(str, enum.Enum):
    trialing = "trialing"
    active = "active"
    past_due = "past_due"
    canceled = "canceled"
    incomplete = "incomplete"

# Association Table for Organization <-> CompliancePlaybook
organization_playbook_association = Table(
    'organization_playbook_association', Base.metadata,
    Column('organization_id', UUID(as_uuid=True), ForeignKey('organizations.id'), primary_key=True),
    Column('playbook_id', UUID(as_uuid=True), ForeignKey('compliance_playbooks.id'), primary_key=True)
)

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    stripe_customer_id = Column(String, unique=True, index=True)
    stripe_subscription_id = Column(String, unique=True)
    subscription_status = Column(Enum(SubscriptionStatus), index=True)
    plan_id = Column(String)
    current_period_end = Column(DateTime(timezone=True))

    users = relationship("User", back_populates="organization")
    contracts = relationship("Contract", back_populates="organization")
    audit_logs = relationship("AuditLog", back_populates="organization")
    enabled_playbooks = relationship(
        "CompliancePlaybook",
        secondary=organization_playbook_association,
        back_populates="enabled_by_organizations")

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.member, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    reset_password_token = Column(String, nullable=True, index=True)
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    department = Column(String, nullable=True)

    organization = relationship("Organization", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")

class Contract(Base):
    __tablename__ = "contracts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    negotiation_status = Column(Enum(NegotiationStatus), default=NegotiationStatus.DRAFTING, nullable=False)
    signature_request_id = Column(String, nullable=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    organization_integration_id = Column(UUID(as_uuid=True), ForeignKey("organization_integrations.id"), nullable=True)
    external_id = Column(String, nullable=True, index=True)
    department = Column(String, nullable=True)
    sensitivity_level = Column(String, nullable=True)
    signature_status = Column(Enum(SignatureStatus), default=SignatureStatus.draft, nullable=False)
    docusign_envelope_id = Column(String, nullable=True, index=True)

    organization = relationship("Organization", back_populates="contracts")
    versions = relationship("ContractVersion", back_populates="contract", cascade="all, delete-orphan", order_by="ContractVersion.version_number")
    comments = relationship("UserComment", back_populates="contract", cascade="all, delete-orphan")
    signers = relationship("Signer", back_populates="contract", cascade="all, delete-orphan")

class ContractVersion(Base):
    __tablename__ = "contract_versions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    full_text = Column(Text, nullable=True)
    analysis_status = Column(Enum(AnalysisStatus), default=AnalysisStatus.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    contract = relationship("Contract", back_populates="versions")
    suggestions = relationship("AnalysisSuggestion", back_populates="version", cascade="all, delete-orphan")
    comments = relationship("UserComment", back_populates="version", cascade="all, delete-orphan")

class AnalysisSuggestion(Base):
    __tablename__ = "analysis_suggestions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_version_id = Column(UUID(as_uuid=True), ForeignKey("contract_versions.id"), nullable=False)
    start_index = Column(Integer, nullable=False)
    end_index = Column(Integer, nullable=False)
    original_text = Column(Text, nullable=False)
    suggested_text = Column(Text, nullable=True)
    comment = Column(Text, nullable=False)
    risk_category = Column(String, nullable=False)
    status = Column(Enum(SuggestionStatus), default=SuggestionStatus.suggested, nullable=False)
    negotiation_insight = Column(JSONB, nullable=True)

    version = relationship("ContractVersion", back_populates="suggestions")

class UserComment(Base):
    __tablename__ = "user_comments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_version_id = Column(UUID(as_uuid=True), ForeignKey("contract_versions.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    start_index = Column(Integer, nullable=False)
    end_index = Column(Integer, nullable=False)
    comment_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contract = relationship("Contract", back_populates="comments")
    version = relationship("ContractVersion", back_populates="comments")
    user = relationship("User")

class Integration(Base):
    __tablename__ = "integrations"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

class OrganizationIntegration(Base):
    __tablename__ = "organization_integrations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    integration_id = Column(Integer, ForeignKey("integrations.id"), nullable=False)
    is_enabled = Column(Boolean, default=True)
    credentials = Column(Text, nullable=True)
    metadata = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organization = relationship("Organization")
    integration = relationship("Integration")

class Clause(Base):
    __tablename__ = "clauses"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False, index=True)
    content = Column(Text, nullable=False)
    category = Column(String, nullable=True, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    created_by = relationship("User")

class ContractTemplate(Base):
    __tablename__ = "contract_templates"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    category = Column(String, nullable=True, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    created_by = relationship("User")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    action = Column(String, nullable=False, index=True)
    details = Column(JSONB, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user = relationship("User", back_populates="audit_logs")
    organization = relationship("Organization", back_populates="audit_logs")

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
    pattern = Column(Text, nullable=False)
    risk_category = Column(String, nullable=False)

    playbook_id = Column(UUID(as_uuid=True), ForeignKey("compliance_playbooks.id"), nullable=False)
    playbook = relationship("CompliancePlaybook", back_populates="rules")

    # --- Notification Service Models ---

class MilestoneType(str, enum.Enum):
    EFFECTIVE_DATE = "Effective Date"
    EXPIRATION_DATE = "Expiration Date"
    AUTO_RENEWAL_DATE = "Auto-Renewal Date"
    RENEWAL_NOTICE_DEADLINE = "Renewal Notice Deadline"
    TERMINATION_NOTICE_DEADLINE = "Termination Notice Deadline"

class ResponsibleParty(str, enum.Enum):
    OUR_COMPANY = "Our Company"
    COUNTERPARTY = "Counterparty"

class ObligationStatus(str, enum.Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    OVERDUE = "Overdue"

class ContractMilestone(Base):
    __tablename__ = "contract_milestones"
    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    milestone_type = Column(Enum(MilestoneType), nullable=False)
    milestone_date = Column(DateTime(timezone=True), nullable=False)
    description = Column(Text, nullable=True)
    created_by_ai = Column(Boolean, default=False, nullable=False)

class TrackedObligation(Base):
    __tablename__ = "tracked_obligations"
    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    obligation_text = Column(Text, nullable=False)
    responsible_party = Column(Enum(ResponsibleParty), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(ObligationStatus), default=ObligationStatus.PENDING, nullable=False)
    created_by_ai = Column(Boolean, default=False, nullable=False)

class NotificationType(str, enum.Enum):
    EMAIL = "Email"
    IN_APP = "InApp"

class NotificationStatus(str, enum.Enum):
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
    status = Column(Enum(NotificationStatus), default=NotificationStatus.PENDING, nullable=False)
    send_at = Column(DateTime(timezone=True), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    details = Column(Text, nullable=True)

    user = relationship("User")

class AccessPolicy(Base):
    __tablename__ = "access_policies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    subject_attributes = Column(JSONB, nullable=False)
    actions = Column(PG_ARRAY(String), nullable=False)
    resource_attributes = Column(JSONB, nullable=False)
    effect = Column(String, nullable=False, default='allow')

    organization = relationship("Organization")

class SuggestionOutcomeEvent(Base):
    __tablename__ = "suggestion_outcome_events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    suggestion_id = Column(UUID(as_uuid=True), ForeignKey("analysis_suggestions.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    outcome = Column(Enum(SuggestionStatus), nullable=False)
    processed = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    suggestion = relationship("AnalysisSuggestion")
    user = relationship("User")
    contract = relationship("Contract")

class NegotiationOutcome(Base):
    __tablename__ = "negotiation_outcomes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    original_clause_hash = Column(String, nullable=False, index=True)
    counter_offer_hash = Column(String, nullable=False, index=True)
    counter_offer_text = Column(Text, nullable=True)
    outcome = Column(Enum(SuggestionStatus), nullable=False)
    contract_type = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    count = Column(Integer, nullable=False, default=1)

    organization = relationship("Organization")

    __table_args__ = (
        UniqueConstraint('organization_id', 'original_clause_hash', 'counter_offer_hash', 'outcome', 'contract_type', 'industry', name='_outcome_uc'),
    )

class Signer(Base):
    __tablename__ = "signers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    signing_order = Column(Integer, nullable=False, default=1)
    status = Column(Enum(SignerStatus), default=SignerStatus.created, nullable=False)
    docusign_recipient_id = Column(String, nullable=True)

    contract = relationship("Contract", back_populates="signers")


class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key_hash = Column(String, nullable=False, unique=True, index=True)
    prefix = Column(String(8), nullable=False, index=True)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    organization = relationship("Organization")
    user = relationship("User")