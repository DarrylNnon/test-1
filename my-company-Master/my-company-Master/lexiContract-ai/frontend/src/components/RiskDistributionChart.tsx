'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RiskDistributionChartProps {
  data: { category: string; count: number }[];
}

export default function RiskDistributionChart({ data }: RiskDistributionChartProps) {
  return (
    <div className="bg-white p-6 shadow rounded-lg">
      <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">Risk Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#8884d8" name="Number of Issues" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}