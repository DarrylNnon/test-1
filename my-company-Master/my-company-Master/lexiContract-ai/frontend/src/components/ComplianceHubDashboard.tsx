"use client";

import { ComplianceHubSummary } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ShieldAlert, FileWarning, TrendingUp } from 'lucide-react';

interface Props {
  summary: ComplianceHubSummary;
}

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <div className="flex items-center">
      <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

export default function ComplianceHubDashboard({ summary }: Props) {
  const totalFindings = summary.findings_by_category.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Compliance Hub</h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard title="Total Contracts Scanned" value={summary.total_contracts_scanned} icon={FileWarning} />
        <StatCard title="Total Compliance Findings" value={totalFindings} icon={ShieldAlert} />
        <StatCard title="Avg Findings per Contract" value={(totalFindings / (summary.total_contracts_scanned || 1)).toFixed(2)} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Findings by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summary.findings_by_category} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Top 5 Flagged Contracts</h2>
          <div className="flow-root">
            <ul role="list" className="-my-5 divide-y divide-gray-200">
              {summary.top_flagged_contracts.slice(0, 5).map((contract) => (
                <li key={contract.id} className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{contract.filename}</p>
                      <p className="text-sm text-gray-500 truncate">{contract.total_findings} findings</p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${contract.risk_score > 75 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        Risk: {contract.risk_score}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}