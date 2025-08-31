'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface VolumeOverTimeChartProps {
  data: { month: string; count: number }[];
}

export default function VolumeOverTimeChart({ data }: VolumeOverTimeChartProps) {
  return (
    <div className="bg-white p-4 shadow rounded-lg">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Contract Volume Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip wrapperClassName="!bg-white !border-gray-300 !shadow-lg" />
          <Legend />
          <Line type="monotone" dataKey="count" stroke="#82ca9d" name="Contracts Created" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}