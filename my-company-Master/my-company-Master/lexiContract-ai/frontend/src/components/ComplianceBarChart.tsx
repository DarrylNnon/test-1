'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FindingByCategory } from '@/types';

interface ComplianceBarChartProps {
  data: FindingByCategory[];
}

const ComplianceBarChart = ({ data }: ComplianceBarChartProps) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Findings by Risk Category</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis allowDecimals={false} />
          <Tooltip wrapperClassName="rounded-md border border-gray-200 bg-white shadow-sm" />
          <Legend />
          <Bar dataKey="count" fill="#4f46e5" name="Number of Findings" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ComplianceBarChart;