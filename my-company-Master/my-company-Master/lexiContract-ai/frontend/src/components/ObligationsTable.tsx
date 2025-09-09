import React, { useState } from 'react';
import { TrackedObligation, ObligationStatus } from '@/types';
import { api } from '@/lib/api';

interface ObligationsTableProps {
  obligations: TrackedObligation[];
  onObligationUpdate: (updatedObligation: TrackedObligation) => void;
}

export const ObligationsTable: React.FC<ObligationsTableProps> = ({ obligations, onObligationUpdate }) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleStatusChange = async (obligationId: string, newStatus: ObligationStatus) => {
    setLoadingId(obligationId);
    try {
      const response = await api.put(`/obligations/${obligationId}`, { status: newStatus });
      onObligationUpdate(response.data);
    } catch (error) {
      console.error('Failed to update obligation status:', error);
      // In a real app, show an error toast to the user
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Obligation</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsible Party</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {obligations.map((obligation) => (
            <tr key={obligation.id}>
              <td className="px-6 py-4 whitespace-pre-wrap text-sm text-gray-900">{obligation.obligation_text}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{obligation.responsible_party}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{obligation.due_date ? new Date(obligation.due_date + 'T00:00:00').toLocaleDateString() : 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <select
                  value={obligation.status}
                  onChange={(e) => handleStatusChange(obligation.id, e.target.value as ObligationStatus)}
                  disabled={loadingId === obligation.id}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  {Object.values(ObligationStatus).map(status => (<option key={status} value={status}>{status}</option>))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};