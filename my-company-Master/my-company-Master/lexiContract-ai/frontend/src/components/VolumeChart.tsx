import { VolumeOverTime } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface VolumeChartProps {
  data: VolumeOverTime[];
}

const VolumeChart: React.FC<VolumeChartProps> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Volume Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="count" stroke="#3b82f6" name="New Contracts" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VolumeChart;