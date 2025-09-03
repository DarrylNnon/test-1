import { RiskDistribution } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RiskDistributionChartProps {
  data: RiskDistribution[];
}

const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#ef4444" name="Contracts" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RiskDistributionChart;