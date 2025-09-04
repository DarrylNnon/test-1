'use client';

import { ReportConfig } from '@/types';

interface DataSourceSelectorProps {
  config: ReportConfig;
  setConfig: (config: ReportConfig) => void;
}

export const DataSourceSelector = ({ config, setConfig }: DataSourceSelectorProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // When changing data source, reset the fields to avoid invalid configurations
    setConfig({
      ...config,
      dataSource: e.target.value,
      metrics: [{ field: 'id', aggregation: 'count' }],
      groupBy: null,
      filters: [],
    });
  };

  return (
    <div className="p-4 border-b">
      <h3 className="font-semibold text-lg mb-2">Data Source</h3>
      <select value={config.dataSource} onChange={handleChange} className="w-full p-2 border rounded-md bg-gray-50 focus:ring-indigo-500 focus:border-indigo-500">
        <option value="contracts">Contracts</option>
        <option value="analysis_suggestions">AI Suggestions (Risks)</option>
      </select>
    </div>
  );
};