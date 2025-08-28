'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import api from '@/lib/api';
import { Contract } from '@/types';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

function SearchResults() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const query = searchParams.get('q');

  const [results, setResults] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token && query) {
      const fetchResults = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await api.get(`/search?q=${encodeURIComponent(query)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setResults(response.data);
        } catch (err) {
          setError('Failed to fetch search results.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchResults();
    }
  }, [token, query]);

  return (
    <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Search Results for "{query}"
      </h1>
      <div className="mt-8">
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul role="list" className="divide-y divide-gray-200">
              {results.length > 0 ? (
                results.map((contract) => (
                  <li key={contract.id}>
                    <Link href={`/contracts/${contract.id}`} className="block hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-indigo-600 truncate">{contract.filename}</p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <StatusBadge status={contract.analysis_status} />
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              Uploaded on {new Date(contract.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                  No contracts found matching your search term.
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading search...</div>}>
      <SearchResults />
    </Suspense>
  );
}