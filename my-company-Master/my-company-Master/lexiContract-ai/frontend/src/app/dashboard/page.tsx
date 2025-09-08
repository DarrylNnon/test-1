'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getContracts } from '@/lib/api';
import { Contract } from '@/types';
import { FileText, PlusCircle } from 'lucide-react';
import { UploadContractModal } from '@/components/UploadContractModal';

const StatusBadge = ({ status }: { status: string }) => {
  const statusMap: { [key: string]: { text: string; bg: string; textColor: string } } = {
    DRAFTING: { text: 'Drafting', bg: 'bg-gray-100', textColor: 'text-gray-800' },
    INTERNAL_REVIEW: { text: 'Internal Review', bg: 'bg-blue-100', textColor: 'text-blue-800' },
    EXTERNAL_REVIEW: { text: 'External Review', bg: 'bg-yellow-100', textColor: 'text-yellow-800' },
    SIGNED: { text: 'Signed', bg: 'bg-green-100', textColor: 'text-green-800' },
    ARCHIVED: { text: 'Archived', bg: 'bg-gray-100', textColor: 'text-gray-500' },
    pending: { text: 'Pending Analysis', bg: 'bg-yellow-100', textColor: 'text-yellow-800' },
    in_progress: { text: 'Analyzing...', bg: 'bg-blue-100', textColor: 'text-blue-800' },
    completed: { text: 'Completed', bg: 'bg-green-100', textColor: 'text-green-800' },
    failed: { text: 'Failed', bg: 'bg-red-100', textColor: 'text-red-800' },
  };

  const { text, bg, textColor } = statusMap[status] || { text: status, bg: 'bg-gray-200', textColor: 'text-gray-800' };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${bg} ${textColor}`}>
      {text}
    </span>
  );
};

export default function DashboardPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const fetchContracts = () => {
    getContracts()
      .then(setContracts)
      .catch(() => setError('Could not load contracts.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (token) {
      fetchContracts();
    }
  }, [token]);

  const handleUploadSuccess = (newContract: Contract) => {
    setIsUploadModalOpen(false);
    // Redirect to the new contract's detail page
    router.push(`/contracts/${newContract.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Welcome, {user?.email?.split('@')[0]}
        </h1>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Upload Contract
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Recent Contracts</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading && <p className="p-4 text-center">Loading contracts...</p>}
          {error && <p className="p-4 text-center text-red-500">{error}</p>}
          {!loading && contracts.length === 0 && <p className="p-4 text-center">No contracts found.</p>}
          {contracts.map((contract) => (
            <Link href={`/contracts/${contract.id}`} key={contract.id} className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-6 h-6 mr-3 text-indigo-500" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{contract.filename}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Uploaded on {new Date(contract.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <StatusBadge status={contract.negotiation_status} />
                  <StatusBadge status={contract.analysis_status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <UploadContractModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}