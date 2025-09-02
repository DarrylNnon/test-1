"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { AuditLog } from '@/types';

const AuditLogClient = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchLogs = async () => {
        try {
          setLoading(true);
          const response = await api.get('/audit/logs');
          setLogs(response.data);
        } catch (err) {
          setError('Failed to load audit logs.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchLogs();
    } else if (user) {
        setError('You do not have permission to view audit logs.');
        setLoading(false);
    }
  }, [user]);

  if (loading) return <div>Loading audit logs...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!logs.length) return <div>No audit logs available.</div>;

  return (
    <div className="overflow-x-auto bg-white shadow rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.user_email}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.action}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AuditLogClient;