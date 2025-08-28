'use client';

import { useState, useEffect } from 'react';
import useAuth from '@/hooks/useAuth';
import api from '@/lib/api';
import { AnalyticsData } from '@/types';
import KPIs from './KPIs';
import RiskDistributionChart from './RiskDistributionChart';
import VolumeChart from './VolumeChart';

export default function AnalyticsClient() {
  const { token, loading: authLoading } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const response = await api.get('/analytics/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchAnalytics();
    }
  }, [token, authLoading]);

  if (loading || authLoading) {
    return <div className="text-center p-8">Loading Analytics Dashboard...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  }

  if (!data) {
    return <div className="text-center p-8">No analytics data available.</div>;
  }

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <KPIs data={data.kpis} />
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RiskDistributionChart data={data.risk_distribution} />
        <VolumeChart data={data.volume_over_time} />
      </div>
    </main>
  );
}