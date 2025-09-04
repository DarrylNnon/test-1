'use client';

import { ReportConfig } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ReportPreviewProps {
  config: ReportConfig;
  data: any[] | null;
  isLoading: boolean;
  error: string | null;
}

const ChartPlaceholder = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-full min-h-80 bg-gray-50 rounded-md">
    <p className="text-gray-500">{message}</p>
  </div>
);

export const ReportPreview = ({ config, data, isLoading, error }: ReportPreviewProps) => {
  if (isLoading) return <ChartPlaceholder message="Loading report data..." />;
  if (error) return <ChartPlaceholder message={error} />;
  if (!data || data.length === 0) return <ChartPlaceholder message="No data to display. Adjust your filters or groupings." />;

  const groupByField = config.groupBy?.field;
  const metricField = `${config.metrics[0]?.field}_${config.metrics[0]?.aggregation}`;

  const renderVisualization = () => {
    switch (config.visualizationType) {
      case 'bar_chart':
        if (!groupByField) return <ChartPlaceholder message="Please select a 'Group By' field to use a bar chart." />;
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={groupByField} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={metricField} fill="#8884d8" name={`Count of ${config.dataSource}`} />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'table':
        const headers = Object.keys(data[0]);
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map(header => (
                    <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, index) => (
                  <tr key={index}>
                    {headers.map(header => (
                      <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {String(row[header])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return <ChartPlaceholder message={`Visualization type '${config.visualizationType}' is not yet supported.`} />;
    }
  };

  return (
    <div>
      {renderVisualization()}
    </div>
  );
};