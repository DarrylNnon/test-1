import { KPI } from '@/types';

interface KPIsProps {
  data: KPI;
}

const KPICard: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
  </div>
);

const KPIs: React.FC<KPIsProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <KPICard title="Total Contracts" value={data.total_contracts} />
      <KPICard title="Contracts In Progress" value={data.contracts_in_progress} />
      <KPICard title="Average Cycle Time (Days)" value={data.average_cycle_time_days.toFixed(1)} />
    </div>
  );
};

export default KPIs;