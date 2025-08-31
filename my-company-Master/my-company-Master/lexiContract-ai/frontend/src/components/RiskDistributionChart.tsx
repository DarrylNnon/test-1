'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RiskDistributionChartProps {
  data: { category: string; count: number }[];
}

export default function RiskDistributionChart({ data }: RiskDistributionChartProps) {
  return (
    <div className="bg-white p-4 shadow rounded-lg">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Distribution</h3>
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
          <YAxis />
          <Tooltip wrapperClassName="!bg-white !border-gray-300 !shadow-lg" />
          <Legend />
          <Bar dataKey="count" fill="#8884d8" name="Number of Findings" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}