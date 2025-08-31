'use client';

import useSWR from 'swr';
import api from '@/lib/api';
import KPICard from '@/components/analytics/KPICard';
import RiskDistributionChart from '@/components/analytics/RiskDistributionChart';
import VolumeOverTimeChart from '@/components/analytics/VolumeOverTimeChart';

// Define the data structure based on the backend schema
interface AnalyticsKPIs {
  total_contracts: number;
  contracts_in_progress: number;
  average_cycle_time_days: number;
}

interface RiskDistribution {
  category: string;
  count: number;
}

interface VolumeOverTime {
  month: string;
  count: number;
}

interface FullAnalyticsDashboard {
  kpis: AnalyticsKPIs;
  risk_distribution: RiskDistribution[];
  volume_over_time: VolumeOverTime[];
}

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function AnalyticsDashboardPage() {
  const { data, error, isLoading } = useSWR<FullAnalyticsDashboard>('/api/v1/analytics/dashboard', fetcher);

  if (error) return <div className="p-8 text-red-500">Failed to load analytics data. Please try again later.</div>;
  if (isLoading) return <div className="p-8">Loading Dashboard...</div>;
  if (!data) return <div className="p-8">No analytics data available.</div>;

  const { kpis, risk_distribution, volume_over_time } = data;

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Advanced Analytics Dashboard</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <KPICard title="Total Contracts" value={kpis.total_contracts} description="All contracts in the system." />
          <KPICard title="Contracts In Progress" value={kpis.contracts_in_progress} description="Currently in review or negotiation." />
          <KPICard title="Avg. Cycle Time" value={`${kpis.average_cycle_time_days.toFixed(1)} days`} description="From creation to signature." />
        </div>

        {/* Charts */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <RiskDistributionChart data={risk_distribution} />
          <VolumeOverTimeChart data={volume_over_time} />
        </div>
      </div>
    </div>
  );
}