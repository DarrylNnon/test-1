'use client';

import { ReportConfig } from '@/types';

interface MetricsAndDimensionsProps {
  config: ReportConfig;
  setConfig: (config: ReportConfig) => void;
}

const MOCK_METRIC_FIELDS = ['id'];
const MOCK_GROUPBY_FIELDS = ['negotiation_status', 'created_at'];

export const MetricsAndDimensions = ({ config, setConfig }: MetricsAndDimensionsProps) => {
  const handleMetricChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // For now, we only support one metric
    setConfig({ ...config, metrics: [{ field: e.target.value, aggregation: 'count' }] });
  };

  const handleGroupByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfig({ ...config, groupBy: { field: e.target.value } });
  };

  return (
    <div className="p-4 border-b">
      <h3 className="font-semibold text-lg mb-2">Metrics & Dimensions</h3>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700">Metric</label>
          <select value={config.metrics[0]?.field || ''} onChange={handleMetricChange} className="w-full mt-1 p-2 border rounded-md bg-gray-50">
            <option value="id">Count of Contracts</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Group By</label>
          <select value={config.groupBy?.field || ''} onChange={handleGroupByChange} className="w-full mt-1 p-2 border rounded-md bg-gray-50">
            <option value="">None</option>
            {MOCK_GROUPBY_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};