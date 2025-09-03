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
  user_id: string;
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