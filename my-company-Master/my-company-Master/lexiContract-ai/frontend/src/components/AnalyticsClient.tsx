'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { AnalyticsData } from '@/types';
import KPIs from './KPIs';
import RiskDistributionChart from './RiskDistributionChart';
import VolumeChart from './VolumeChart';

const AnalyticsClient = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setError("Authentication required.");
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/api/v1/analytics/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(response.data);
      } catch (err) {
        setError('Failed to fetch analytics data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) return <div className="text-center p-8">Loading analytics...</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
  if (!data) return <div className="text-center p-8">No analytics data available.</div>;

  return (
    <div className="space-y-8">
      <KPIs data={data.kpis} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RiskDistributionChart data={data.risk_distribution} />
        <VolumeChart data={data.volume_over_time} />
      </div>
    </div>
  );
};

export default AnalyticsClient;