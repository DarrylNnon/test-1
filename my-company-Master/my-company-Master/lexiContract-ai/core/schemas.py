from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid, enum
from .models import UserRole, AnalysisStatus, SuggestionStatus, SubscriptionStatus, NegotiationStatus, SignatureStatus, SignerStatus

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    organization_name: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None

class User(UserBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    role: UserRole
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class UserInDB(User):
    hashed_password: str

class UserWithOrg(User):
    organization: "Organization"

    model_config = ConfigDict(from_attributes=True)

# --- Organization Schemas ---
class OrganizationBase(BaseModel):
    name: str

class OrganizationCreate(OrganizationBase):
    pass

class Organization(OrganizationBase):
    id: uuid.UUID
    created_at: datetime
    users: List[User] = []

    # --- NEW: Billing Fields ---
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    subscription_status: Optional[SubscriptionStatus] = None
    plan_id: Optional[str] = None
    current_period_end: Optional[datetime] = None

    # V2 Compliance Module Field
    enabled_playbooks: List["CompliancePlaybook"] = []

    model_config = ConfigDict(from_attributes=True)

# --- ContractVersion Schemas ---
class ContractVersionBase(BaseModel):
    full_text: Optional[str] = None

class ContractVersion(ContractVersionBase):
    id: uuid.UUID
    contract_id: uuid.UUID
    version_number: int
    analysis_status: AnalysisStatus
    created_at: datetime
    uploader_id: uuid.UUID
    suggestions: List["AnalysisSuggestion"] = []
    comments: List["UserComment"] = []

    model_config = ConfigDict(from_attributes=True)

# --- Contract Schemas ---
class ContractBase(BaseModel):
    filename: str

class Contract(ContractBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    negotiation_status: NegotiationStatus
    signature_request_id: Optional[str] = None
    highlighted_snippet: Optional[str] = None # New field for search results
    signature_status: SignatureStatus
    docusign_envelope_id: Optional[str] = None
    signers: List["Signer"] = []
    versions: List[ContractVersion] = []

    model_config = ConfigDict(from_attributes=True)

# --- Analysis Suggestion Schemas ---
class AnalysisSuggestionCreate(BaseModel):
    start_index: int
    end_index: int
    original_text: str
    suggested_text: Optional[str] = None
    comment: str
    risk_category: str
    negotiation_insight: Optional[Dict[str, Any]] = None


class AnalysisSuggestion(AnalysisSuggestionCreate):
    id: uuid.UUID
    contract_version_id: uuid.UUID
    status: SuggestionStatus

    model_config = ConfigDict(from_attributes=True)

class AnalysisSuggestionUpdate(BaseModel):
    status: SuggestionStatus


# --- User Comment Schemas ---
class UserCommentCreate(BaseModel):
    start_index: int
    end_index: int
    comment_text: str

class UserComment(UserCommentCreate):
    id: uuid.UUID
    contract_version_id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Notification Schemas ---
class Notification(BaseModel):
    id: uuid.UUID
    message: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Notification Service Schemas ---

class NotificationType(str, enum.Enum):
    EMAIL = "Email"
    IN_APP = "InApp"

class NotificationStatus(str, enum.Enum):
    PENDING = "Pending"
    SENT = "Sent"
    FAILED = "Failed"

class NotificationBase(BaseModel):
    details: Optional[str] = None

class NotificationCreate(NotificationBase):
    user_id: uuid.UUID
    contract_id: uuid.UUID
    milestone_id: int
    send_at: datetime

class Notification(NotificationBase):
    id: int
    user_id: uuid.UUID
    contract_id: uuid.UUID
    milestone_id: int
    notification_type: NotificationType
    status: NotificationStatus
    send_at: datetime
    sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Clause Library Schemas ---
class ClauseBase(BaseModel):
    title: str
    content: str
    category: Optional[str] = None

class ClauseCreate(ClauseBase):
    pass

class ClauseUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None

class Clause(ClauseBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_by_id: uuid.UUID
    created_by: User
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FindSimilarClausesRequest(BaseModel):
    text: str

class ClauseSimilarityResult(Clause):
    similarity_score: float

# --- Schemas for PlaybookRule ---

class PlaybookRuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    pattern: str
    risk_category: str

class PlaybookRuleCreate(PlaybookRuleBase):
    pass

class PlaybookRule(PlaybookRuleBase):
    id: uuid.UUID
    playbook_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

# --- Schemas for CompliancePlaybook ---

class CompliancePlaybookBase(BaseModel):
    name: str
    description: Optional[str] = None
    industry: Optional[str] = None
    is_active: bool = True

class CompliancePlaybookCreate(CompliancePlaybookBase):
    rules: List[PlaybookRuleCreate] = []

class CompliancePlaybookUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None
    is_active: Optional[bool] = None

class CompliancePlaybook(CompliancePlaybookBase):
    id: uuid.UUID
    rules: List[PlaybookRule] = []

    model_config = ConfigDict(from_attributes=True)

class OrganizationPlaybookToggle(BaseModel):
    playbook_id: uuid.UUID
    enable: bool

# --- Contract Template Schemas ---
class ContractTemplateBase(BaseModel):
    title: str
    description: Optional[str] = None
    content: str # The template body with placeholders like {{variable_name}}
    category: Optional[str] = None

class ContractTemplateCreate(ContractTemplateBase):
    pass

class ContractTemplateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None

class ContractTemplate(ContractTemplateBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_by_id: uuid.UUID
    created_by: User
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- AI Drafting Schemas ---
class DraftContractRequest(BaseModel):
    variables: Dict[str, str]

class FinalizeDraftRequest(BaseModel):
    filename: str
    content: str

class DraftContractResponse(BaseModel):
    draft_content: str

# --- Integration Schemas ---
class IntegrationBase(BaseModel):
    name: str
    description: str
    is_active: bool

class Integration(IntegrationBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class OrganizationIntegrationBase(BaseModel):
    is_enabled: bool

class OrganizationIntegrationCreate(OrganizationIntegrationBase):
    credentials: Dict[str, str] # Raw credentials from user, e.g., {"api_key": "..."}

class OrganizationIntegration(OrganizationIntegrationBase):
    id: uuid.UUID
    integration: Integration


class DocuSignCredentials(BaseModel):
    integration_key: str  # Also known as Client ID
    user_id: str  # The API Username (GUID) from DocuSign
    rsa_private_key: str  # The full private key as a string

    model_config = ConfigDict(from_attributes=True)

# --- API Key Schemas ---
class ApiKeyBase(BaseModel):
    name: str

class ApiKeyCreate(ApiKeyBase):
    pass

class ApiKey(ApiKeyBase):
    id: uuid.UUID
    prefix: str
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime] = None
    user_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

class NewApiKeyResponse(ApiKey):
    raw_key: str # Only returned on creation

# --- Public API Schemas ---
# These schemas control the data exposed via the public API,
# ensuring no internal or sensitive fields are leaked.

class PublicSuggestion(BaseModel):
    id: uuid.UUID
    original_text: str
    suggested_text: Optional[str] = None
    comment: str
    risk_category: str
    status: SuggestionStatus

    model_config = ConfigDict(from_attributes=True)

class PublicContract(BaseModel):
    id: uuid.UUID
    filename: str
    created_at: datetime
    negotiation_status: NegotiationStatus
    signature_status: SignatureStatus
    analysis_status: AnalysisStatus # Status of the latest version

    model_config = ConfigDict(from_attributes=True)

class PublicContractDetail(PublicContract):
    suggestions: List[PublicSuggestion] = []

# --- Compliance Hub Schemas ---
class PlaybookSummary(BaseModel):
    enabled_count: int
    total_count: int

class AccessPolicySummary(BaseModel):
    policy_count: int

class ComplianceHubSummary(BaseModel):
    playbook_summary: PlaybookSummary
    recent_audit_logs: List[AuditLog]
    access_policy_summary: AccessPolicySummary


# --- Search Schemas ---
class SearchResult(BaseModel):
    contract_id: uuid.UUID
    version_id: uuid.UUID
    filename: str
    snippet: str
    score: float


# --- Token ---
class Token(BaseModel):
    access_token: str
    token_type: str

# --- Billing Schemas ---
class CreateCheckoutSessionRequest(BaseModel):
    price_id: str

class CreateCheckoutSessionResponse(BaseModel):
    checkout_url: str

class CreatePortalSessionResponse(BaseModel):
    portal_url: str

class StripeWebhookEvent(BaseModel):
    """
    A Pydantic model for the basic structure of a Stripe webhook event.
    This is not used for validation but for type hinting and clarity.
    """
    id: str
    object: str
    type: str

# --- Compliance Insights Dashboard Schemas ---

class FindingByCategory(BaseModel):
    category: str
    count: int

class TopFlaggedContract(BaseModel):
    contract_id: uuid.UUID
    filename: str
    finding_count: int

# Schemas for Advanced Analytics Dashboard

class AnalyticsKPIs(BaseModel):
    total_contracts: int
    contracts_in_progress: int
    average_cycle_time_days: float


class RiskDistribution(BaseModel):
    category: str
    count: int


class VolumeOverTime(BaseModel):
    month: str
    count: int


class FullAnalyticsDashboard(BaseModel):
    kpis: AnalyticsKPIs
    risk_distribution: list[RiskDistribution]
    volume_over_time: list[VolumeOverTime]

class ComplianceDashboardSummary(BaseModel):
    findings_by_category: List[FindingByCategory]
    top_flagged_contracts: List[TopFlaggedContract]

# Resolve forward references for circular dependencies
Contract.model_rebuild()
ContractVersion.model_rebuild()
AnalysisSuggestion.model_rebuild()
UserWithOrg.model_rebuild()
Organization.model_rebuild()

# --- E-Signature Schemas ---
class SignerBase(BaseModel):
    name: str
    email: EmailStr
    signing_order: int = 1

class SignerCreate(SignerBase):
    pass

class Signer(SignerBase):
    id: uuid.UUID
    contract_id: uuid.UUID
    status: SignerStatus
    model_config = ConfigDict(from_attributes=True)

class InitiateSignatureRequest(BaseModel):
    signers: List[SignerCreate]
    email_subject: str = "Please Sign: {contract_filename}"
    email_body: str = "Please review and sign the attached document."