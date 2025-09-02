"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { AnalyticsData } from '@/types';
import KPIs from './KPIs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const AnalyticsClient = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          setLoading(true);
          const response = await api.get('/analytics/dashboard');
          setData(response.data);
        } catch (err) {
          setError('Failed to load analytics data.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user]);

  if (loading) return <div>Loading analytics...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return <div>No analytics data available.</div>;

  return (
    <div className="space-y-8">
      <KPIs kpis={data.kpis} />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Risk Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.risk_over_time}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#ef4444" name="Average Risk Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsClient;