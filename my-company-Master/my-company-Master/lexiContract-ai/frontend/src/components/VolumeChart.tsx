'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface VolumeChartProps {
  data: { month: string; count: number }[];
}

export default function VolumeChart({ data }: VolumeChartProps) {
  return (
    <div className="bg-white p-6 shadow rounded-lg">
      <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">Contract Volume Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="count" stroke="#82ca9d" name="Contracts per Month" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}