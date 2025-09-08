export enum Role {
  Admin = "admin",
  Member = "member",
}

export interface Organization {
  id: string;
  name: string;
  enabled_playbooks: CompliancePlaybook[];
}

export interface User {
  id: string;
  email: string;
  organization_id: string;
  role: Role;
  is_active: boolean;
}

export interface UserWithOrg extends User {
  organization: Organization;
}

// --- Reporting Engine Types ---

export interface ReportFilter {
  id: string; // For UI keying
  field: string;
  operator: string;
  value: any;
}

export interface ReportConfig {
  dataSource: 'contracts' | 'analysis_suggestions';
  metrics: { field: string; aggregation: 'count' | 'avg' | 'sum' }[];
  groupBy?: { field: string } | null;
  filters: ReportFilter[];
  visualizationType: 'table' | 'bar_chart' | 'line_chart' | 'pie_chart';
}

export interface CustomReport {
  id: string;
  name: string;
  description?: string;
  configuration: ReportConfig;
  organization_id: string;
  created_by_id: string;
}

// --- Team Management Types ---

export enum TeamRole {
  Lead = 'lead',
  Member = 'member',
}

export interface TeamMember {
  user: User;
  role: TeamRole;
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
}

// A generic suggestion from the AI analysis
export interface AnalysisSuggestion {
  id: string;
  contract_version_id: string;
  risk_category: string;
  comment: string;
  original_text: string;
  suggestion_text: string;
}

// A comment made by a user
export interface UserComment {
  id: string;
  contract_version_id: string;
  author_id: string;
  author: User;
  comment_text: string;
  created_at: string;
  resolved: boolean;
}

/**
 * The result of comparing two clauses for similarity.
 * This is the missing type that caused the build to fail.
 */
export interface ClauseSimilarityResult {
  id: string;
  contract_id: string;
  version_a_id: string;
  version_b_id: string;
  clause_a_text: string;
  clause_b_text: string;
  similarity_score: number;
  diff_html: string;
}

// Payload for creating or updating a clause
export type ClausePayload = Pick<Clause, "title" | "content" | "category">;

// From the Clause Library feature
export interface Clause {
  id: string;
  organization_id: string;
  created_by_id: string;
  created_by: User;
  created_at: string;
  updated_at: string;
  title: string;
  content: string;
  category: string | null;
}

// Represents a single version of a contract document.
export interface ContractVersion {
  id: string;
  contract_id: string;
  version_number: number;
  file_path: string;
  created_at: string;
  analysis_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  analysis_summary: string | null;
  suggestions: AnalysisSuggestion[];
  comments: UserComment[];
}

// Represents a contract, which is a container for multiple versions.
export interface Contract {
  id: string;
  filename: string;
  uploader_id: string;
  organization_id: string;
  team_id: string | null;
  created_at: string;
  negotiation_status: 'drafting' | 'in_review' | 'negotiating' | 'signed' | 'archived';
  analysis_status: string;
  versions: ContractVersion[];
  analysis_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  analysis_summary: string | null;
  identified_risks: string[] | null;
}

// From the Advanced Analytics Dashboard feature

export interface KPI {
  total_contracts: number;
  contracts_in_progress: number;
  average_cycle_time_days: number;
}

export interface RiskDistribution {
  category: string;
  count: number;
}

export interface VolumeOverTime {
  month: string;
  count: number;
}

export interface AnalyticsData {
  kpis: KPI;
  risk_distribution: RiskDistribution[];
  volume_over_time: VolumeOverTime[];
}

// Represents a single entry in the audit log
export interface AuditLog {
  id: string;
  timestamp: string;
  user_email: string;
  action: string;
  details: string;
}

// From the Compliance Insights Dashboard feature

export interface FindingByCategory {
  category: string;
  count: number;
}

export interface TopFlaggedContract {
  contract_id: string;
  filename: string;
  finding_count: number;
  risk_score: number; // Added to support risk display in dashboard
}

export interface ComplianceDashboardSummary {
  findings_by_category: FindingByCategory[];
  top_flagged_contracts: TopFlaggedContract[];
  total_contracts_scanned: number; // Added to support stat card in dashboard
}

// From the Compliance & Audit Hub feature

export interface PlaybookSummary {
  enabled_count: number;
  total_count: number;
}

export interface AccessPolicySummary {
  policy_count: number;
}

export interface ComplianceHubSummary {
  playbook_summary: PlaybookSummary;
  recent_audit_logs: AuditLog[];
  access_policy_summary: AccessPolicySummary;
}

// From the Compliance Playbooks feature

export interface CompliancePlaybook {
  id: string;
  name: string;
  description: string;
  is_enabled: boolean;
  organization_id: string;
}