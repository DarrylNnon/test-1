export interface User {
  id: string;
  email: string;
  role: 'admin' | 'member';
  organization_id: string;
  organization?: Organization; // Optional, depending on API response
}

export interface Organization {
  id:string;
  name: string;
  users: User[];
  enabled_playbooks: CompliancePlaybook[];
  plan_id?: string;
}

export interface ContractVersion {
  id: string;
  contract_id: string;
  version_number: number;
  analysis_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: string;
  uploader_id: string;
  full_text?: string | null;
  suggestions: AnalysisSuggestion[];
  comments: UserComment[];
}

export interface Contract {
  id: string;
  filename: string;
  organization_id: string;
  created_at: string;
  negotiation_status: 'DRAFTING' | 'INTERNAL_REVIEW' | 'EXTERNAL_REVIEW' | 'SIGNED' | 'ARCHIVED';
  versions: ContractVersion[];
  // This is a frontend-only property for search results
  highlighted_snippet?: string | null;
}

// --- Post-Signature Management Types ---

export enum MilestoneType {
  EffectiveDate = "Effective Date",
  ExpirationDate = "Expiration Date",
  AutoRenewalDate = "Auto-Renewal Date",
  RenewalNoticeDeadline = "Renewal Notice Deadline",
  TerminationNoticeDeadline = "Termination Notice Deadline",
}

export enum ResponsibleParty {
  OurCompany = "Our Company",
  Counterparty = "Counterparty",
}

export enum ObligationStatus {
  Pending = "Pending",
  InProgress = "In Progress",
  Completed = "Completed",
  Overdue = "Overdue",
}

export interface ContractMilestone {
  id: number;
  milestone_type: MilestoneType;
  milestone_date: string; // Dates are strings from JSON
  description: string | null;
}

export interface TrackedObligation {
  id: number;
  obligation_text: string;
  responsible_party: ResponsibleParty;
  due_date: string | null; // Dates are strings from JSON
  status: ObligationStatus;
}

export interface RenewalContract {
  id: string;
  filename: string;
  expiration_date: string | null;
  renewal_notice_deadline: string | null;
  days_until_expiration: number | null;
}

export interface RenewalsDashboardData {
  upcoming_expirations: RenewalContract[];
}

export interface AnalysisSuggestion {
  id: string;
  start_index: number;
  end_index: number;
  original_text: string;
  suggested_text: string | null;
  comment: string;
  risk_category: string;
  status: 'suggested' | 'accepted' | 'rejected';
}

export interface UserComment {
  id: string;
  contract_version_id: string;
  user_id: string;
  user: { email: string };
  start_index: number;
  end_index: number;
  comment_text: string;
  created_at: string;
}

export interface PlaybookRule {
  id: string;
  name: string;
  description: string | null;
  pattern: string;
  risk_category: string;
  playbook_id: string;
}

export interface CompliancePlaybook {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  is_active: boolean;
  rules: PlaybookRule[];
}

export interface FindingByCategory {
  category: string;
  count: number;
}

export interface TopFlaggedContract {
  contract_id: string;
  filename: string;
  finding_count: number;
}

export interface ComplianceDashboardSummary {
  findings_by_category: FindingByCategory[];
  top_flagged_contracts: TopFlaggedContract[];
}

export interface ContractTemplate {
  id: string;
  title: string;
  description: string | null;
  content: string;
  category: string | null;
  organization_id: string;
  created_by: { email: string };
  created_at: string;
  updated_at: string;
}

export interface DraftContractResponse {
  draft_content: string;
}

export interface FinalizeDraftRequest {
  filename: string;
  content: string;
}