from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID, uuid4
from .models import UserRole, AnalysisStatus, SuggestionStatus, SubscriptionStatus, NegotiationStatus

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

# --- Analysis Suggestion Schemas ---
class AnalysisSuggestionCreate(BaseModel):
    start_index: int
    end_index: int
    original_text: str
    suggested_text: Optional[str] = None
    comment: str
    risk_category: str

class AnalysisSuggestion(AnalysisSuggestionCreate):
    id: uuid.UUID
    contract_version_id: uuid.UUID
    status: SuggestionStatus

    model_config = ConfigDict(from_attributes=True)

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

# Schemas for CustomReport
class CustomReportBase(BaseModel):
    name: str
    description: Optional[str] = None
    configuration: Dict[str, Any]

class CustomReportCreate(CustomReportBase):
    pass

class CustomReportUpdate(CustomReportBase):
    pass

class CustomReport(CustomReportBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_by_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

# Schemas for Reporting Engine
class ReportExecuteRequest(BaseModel):
    configuration: Dict[str, Any]

class ContractTeamAssignment(BaseModel):
    team_id: Optional[uuid.UUID] = None

# --- Mobile App Schemas ---
from .models import DeviceType

class UserDeviceCreate(BaseModel):
    token: str
    type: DeviceType

class UserDevice(BaseModel):
    id: uuid.UUID
    device_token: str
    device_type: DeviceType

# --- Team Management Schemas ---
from .models import TeamRole

class TeamMemberBase(BaseModel):
    user_id: uuid.UUID
    role: TeamRole = TeamRole.member

class TeamMemberCreate(TeamMemberBase):
    pass

class TeamMember(BaseModel):
    user: User
    role: TeamRole

    model_config = ConfigDict(from_attributes=True)

class TeamBase(BaseModel):
    name: str

class TeamCreate(TeamBase):
    pass

class Team(TeamBase):
    id: uuid.UUID
    members: List[TeamMember] = []
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

# --- Developer Portal & Marketplace Schemas ---

class DeveloperAppBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=50)
    description: Optional[str] = Field(None, max_length=300)
    redirect_uris: List[str] = []
    scopes: List[str] = []

class DeveloperAppCreate(DeveloperAppBase):
    pass

class DeveloperAppUpdate(DeveloperAppBase):
    pass

class DeveloperApp(DeveloperAppBase):
    id: UUID
    client_id: str
    developer_org_id: UUID
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DeveloperAppWithSecret(DeveloperApp):
    client_secret: str # This is only shown once upon creation

class AppInstallationBase(BaseModel):
    app_id: UUID
    customer_org_id: UUID
    is_enabled: bool = True
    permissions: dict = {}

class AppInstallation(AppInstallationBase):
    id: UUID
    installed_by_user_id: UUID
    installed_at: datetime

    class Config:
        from_attributes = True

class SandboxEnvironment(BaseModel):
    id: UUID
    developer_org_id: UUID
    subdomain: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class OAuthToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: str
    scope: str




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

# --- Analytics Schemas ---
class AnalyticsKPIs(BaseModel):
    total_contracts: int
    contracts_in_progress: int
    average_cycle_time_days: float

class RiskCategoryDistribution(BaseModel):
    category: str
    count: int

class ContractVolumeOverTime(BaseModel):
    month: str
    count: int

class FullAnalyticsDashboard(BaseModel):
    kpis: AnalyticsKPIs
    risk_distribution: List[RiskCategoryDistribution]
    volume_over_time: List[ContractVolumeOverTime]

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

    model_config = ConfigDict(from_attributes=True)

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

class ClausePrediction(BaseModel):
    clause_category: str
    predicted_success_rate: float

class ContractPredictions(BaseModel):
    predicted_timeline_days: int
    timeline_confidence_score: float
    key_clause_predictions: List[ClausePrediction]


class ComplianceDashboardSummary(BaseModel):
    findings_by_category: List[FindingByCategory]
    top_flagged_contracts: List[TopFlaggedContract]

# Resolve forward references for circular dependencies
UserWithOrg.model_rebuild()
Organization.model_rebuild()
Contract.model_rebuild()
ContractVersion.model_rebuild()