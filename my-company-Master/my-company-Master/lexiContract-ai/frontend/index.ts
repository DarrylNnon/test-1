export enum Role {
  admin = "admin",
  member = "member",
}

export enum UserStatus {
  active = "active",
  invited = "invited",
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

export interface User {
  id: string;
  email: string;
  organization_id: string;
  role: Role;
  status: UserStatus;
}

export interface AnalysisSuggestion {
  id: string;
  contract_id: string;
  start_index: number;
  end_index: number;
  original_text: string;
  suggested_text: string | null;
  comment: string;
  risk_category: string;
  status: SuggestionStatus;
}

export interface Contract {
  id: string;
  filename: string;
  analysis_status: AnalysisStatus;
  full_text: string | null;
  suggestions: AnalysisSuggestion[];
}