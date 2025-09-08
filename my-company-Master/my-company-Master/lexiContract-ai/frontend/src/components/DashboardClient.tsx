'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Contract, SubscriptionStatus } from '@/types';
import Link from 'next/link';

export default function DashboardClient() {
  const { user, token } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const subscriptionStatus = user?.organization?.subscription_status;
  const hasActiveSubscription = [SubscriptionStatus.active, SubscriptionStatus.trialing].includes(subscriptionStatus as SubscriptionStatus);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setLoading(true);
        const response = await api.get('/contracts/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setContracts(response.data);
      } catch (err) {
        setError('Failed to load contracts.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchContracts();
    }
  }, [token]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/contracts/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      setContracts([response.data, ...contracts]);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'An unexpected error occurred.';
      setUploadError(`Upload failed: ${detail}`);
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Your Contracts</h1>
          <div>
            <label
              htmlFor="file-upload"
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                !hasActiveSubscription || uploading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {uploading ? 'Uploading...' : 'Upload Contract'}
            </label>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              onChange={handleFileUpload}
              disabled={!hasActiveSubscription || uploading}
            />
          </div>
        </div>

        {!hasActiveSubscription && (
            <div className="mb-6 p-4 text-center bg-yellow-50 border-l-4 border-yellow-400">
                <h3 className="text-md font-medium text-yellow-800">Subscription Inactive</h3>
                <p className="mt-1 text-sm text-yellow-700">
                    You cannot upload new contracts. Please <Link href="/pricing" className="font-bold text-indigo-600 hover:text-indigo-800">upgrade your plan</Link>.
                </p>
            </div>
        )}

        {uploadError && <p className="text-red-500 mb-4">{uploadError}</p>}

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {loading ? (
              <li><p className="p-4">Loading contracts...</p></li>
            ) : error ? (
              <li><p className="p-4 text-red-500">{error}</p></li>
            ) : contracts.length > 0 ? (
              contracts.map((contract) => (
                <li key={contract.id}>
                  <Link href={`/contracts/${contract.id}`} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">{contract.filename}</p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            contract.analysis_status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>{contract.analysis_status}</p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between"><div className="sm:flex"><p className="flex items-center text-sm text-gray-500">Uploaded on {new Date(contract.created_at).toLocaleDateString()}</p></div></div>
                    </div>
                  </Link>
                </li>
              ))
            ) : (<li><p className="p-4 text-gray-500">No contracts uploaded yet. Get started by uploading your first contract.</p></li>)}
          </ul>
        </div>
      </div>
    </main>
  );
}