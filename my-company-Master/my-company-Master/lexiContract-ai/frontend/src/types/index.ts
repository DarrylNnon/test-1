export interface User {
  id: string;
  email: string;
  role: 'admin' | 'member';
  organization_id: string;
}

export interface Organization {
  id: string;
  name: string;
  subscription_plan: 'free' | 'standard' | 'enterprise';
  subscription_status: 'active' | 'inactive' | 'past_due';
}

export interface UserWithOrg extends User {
  organization: Organization;
}

export interface ComplianceFinding {
  category: string;
  count: number;
}

export interface FlaggedContract {
  id: string;
  filename: string;
  risk_score: number;
  total_findings: number;
}

export interface ComplianceHubSummary {
  total_contracts_scanned: number;
  findings_by_category: ComplianceFinding[];
  top_flagged_contracts: FlaggedContract[];
}

export interface Kpi {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease';
}

export interface ChartData {
  name: string;
  value: number;
}

export interface AnalyticsData {
  kpis: Kpi[];
  risk_over_time: ChartData[];
  negotiation_cycle_time: ChartData[];
}