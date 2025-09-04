'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { CustomReport } from '@/types';
import { Plus, BarChart2, Trash2, Edit } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState<CustomReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await api.get('/reports');
        setReports(response.data);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleDelete = async (reportId: string) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        await api.delete(`/reports/${reportId}`);
        setReports(reports.filter(r => r.id !== reportId));
      } catch (error) {
        console.error('Failed to delete report:', error);
        alert('Could not delete the report.');
      }
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading reports...</div>;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <Link href="/dashboard/reports/builder">
          <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <Plus size={20} className="-ml-1 mr-2" />
            Create New Report
          </span>
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <BarChart2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No reports yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new report.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map(report => (
            <div key={report.id} className="bg-white rounded-lg shadow p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 truncate">{report.name}</h2>
                <p className="text-sm text-gray-500 mt-1 h-10 overflow-hidden">{report.description || 'No description'}</p>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button onClick={() => handleDelete(report.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                {/* Edit functionality to be fully implemented next */}
                <Link href={`/dashboard/reports/builder?id=${report.id}`} className="text-gray-400 hover:text-indigo-600"><Edit size={18} /></Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}