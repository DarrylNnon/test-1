'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ComplianceDashboardSummary } from '@/types';
import ComplianceBarChart from '@/components/ComplianceBarChart';
import TopFlaggedContractsTable from '@/components/TopFlaggedContractsTable';

export default function ComplianceDashboardPage() {
  const [data, setData] = useState<ComplianceDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/compliance-analytics/summary');
        setData(response.data);
      } catch (err) {
        setError('Failed to load compliance dashboard. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="py-10">
      <header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">Compliance Insights</h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="px-4 py-8 sm:px-0">
            {loading && <div className="text-center p-6">Loading dashboard...</div>}
            {error && <div className="text-center p-6 text-red-500">{error}</div>}
            {data && (
              <div className="space-y-8">
                <ComplianceBarChart data={data.findings_by_category} />
                <TopFlaggedContractsTable data={data.top_flagged_contracts} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}