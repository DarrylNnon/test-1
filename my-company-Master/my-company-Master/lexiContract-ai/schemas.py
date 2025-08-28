from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime
import uuid
from .models import UserRole, AnalysisStatus, SuggestionStatus, SubscriptionStatus

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

    model_config = ConfigDict(from_attributes=True)

# --- Contract Schemas ---
class ContractBase(BaseModel):
    filename: str

class Contract(ContractBase):
    id: uuid.UUID
    uploader_id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    analysis_status: AnalysisStatus
    full_text: Optional[str] = None
    signature_request_id: Optional[str] = None
    highlighted_snippet: Optional[str] = None # New field for search results

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
    status: SuggestionStatus

    model_config = ConfigDict(from_attributes=True)

# --- User Comment Schemas ---
class UserCommentCreate(BaseModel):
    start_index: int
    end_index: int
    comment_text: str

class UserComment(UserCommentCreate):
    id: uuid.UUID
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