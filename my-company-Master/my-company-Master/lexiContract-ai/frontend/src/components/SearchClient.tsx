'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import api from '@/lib/api';
import { Contract } from '@/types';
import Link from 'next/link';

export default function SearchClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get('query') || '';
  const { token } = useAuth();

  const [results, setResults] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query || !token) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/search/?query=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResults(response.data);
      } catch (err) {
        console.error("Search failed:", err);
        setError('Failed to fetch search results. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query, token]);

  return (
    <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-gray-900">Search Results for "{query}"</h1>

      {loading ? (
        <p className="mt-8 text-gray-600">Searching...</p>
      ) : error ? (
        <p className="mt-8 text-red-500">{error}</p>
      ) : results.length === 0 ? (
        <p className="mt-8 text-gray-600">No contracts found matching your query.</p>
      ) : (
        <div className="mt-8 space-y-6">
          {results.map((contract) => (
            <div key={contract.id} className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-lg leading-6 font-medium text-indigo-600">
                  <Link href={`/contracts/${contract.id}`} className="hover:underline">
                    {contract.filename}
                  </Link>
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Uploaded on {new Date(contract.created_at).toLocaleDateString()}
                </p>
              </div>
              {contract.highlighted_snippet && (
                <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                  <h3 className="text-sm font-medium text-gray-700">Snippet:</h3>
                  <p className="mt-1 text-sm text-gray-900" dangerouslySetInnerHTML={{ __html: contract.highlighted_snippet.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}