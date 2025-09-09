'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Contract } from '@/types';
import Link from 'next/link';

export default function SearchClient() {
  const { token, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const query = searchParams.get('q');

  const [results, setResults] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performSearch = async () => {
      if (!query || !token) {
        setResults([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Assuming a generic search endpoint exists
        const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(response.data);
      } catch (err) {
        console.error('Search failed:', err);
        setError('Failed to fetch search results. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      performSearch();
    }
  }, [query, token, authLoading]);

  if (loading || authLoading) {
    return <div className="text-center p-8">Searching...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        Search Results for: <span className="font-normal">"{query}"</span>
      </h2>
      {results.length > 0 ? (
        <ul className="space-y-4">
          {results.map((contract) => (
            <li key={contract.id} className="p-4 border rounded-md hover:bg-gray-50">
              <Link href={`/dashboard/contracts/${contract.id}`} className="block">
                <h3 className="font-medium text-indigo-600">{contract.filename}</h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{contract.analysis_summary || 'No summary available.'}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No results found for your query.</p>
      )}
    </div>
  );
}