export enum Role {
  admin = "admin",
  member = "member",
}

export enum AnalysisStatus {
  pending = "pending",
  in_progress = "in_progress",
  completed = "completed",
  failed = "failed",
}

export enum SuggestionStatus {
  suggested = "suggested",
  accepted = "accepted",
  rejected = "rejected",
}

export enum SubscriptionStatus {
  trialing = "trialing",
  active = "active",
  past_due = "past_due",
  canceled = "canceled",
  incomplete = "incomplete",
}

export interface Contract {
  id: string;
  filename: string;
  created_at: string;
  analysis_status: AnalysisStatus;
  full_text: string;
  highlighted_snippet?: string;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: SubscriptionStatus;
  plan_id?: string;
  current_period_end?: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  is_active: boolean;
  organization_id: string;
}

export interface UserWithOrg extends User {
  organization: Organization;
}

export interface Clause {
  id: string;
  title: string;
  content: string;
  category?: string;
  created_at: string;
  updated_at: string;
  created_by: User;
  organization_id: string;
}

export interface ClauseSimilarityResult extends Clause {
  similarity_score: number;
}

export interface Signer {
  name: string;
  email: string;
}

export interface UserComment {
  id: string;
  user_id: string;
  contract_id: string;
  created_at: string;
  start_index: number;
  end_index: number;
  comment_text: string;
}

export interface AnalysisSuggestion {
  id: string;
  contract_id: string;
  start_index: number;
  end_index: number;
  original_text: string;
  suggested_text?: string;
  comment: string;
  risk_category: string;
  status: SuggestionStatus;
}

export interface ContractTemplate {
  id: string;
  title: string;
  description?: string;
  content: string;
  category?: string;
  created_at: string;
  updated_at: string;
  created_by: User;
}

export interface AnalyticsData {
  kpis: {
    total_contracts: number;
    contracts_in_progress: number;
    average_cycle_time_days: number;
  };
  risk_distribution: { category: string; count: number }[];
  volume_over_time: { month: string; count: number }[];
}

export interface Integration {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
}

export interface OrganizationIntegration {
  id: string;
  is_enabled: boolean;
  integration: Integration;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  details?: { [key: string]: any };
  user: User;
}