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