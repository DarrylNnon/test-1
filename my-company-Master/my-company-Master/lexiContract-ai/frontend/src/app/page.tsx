'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { RenewalsDashboardData, RenewalContract } from '@/types';
import Link from 'next/link';

type FilterDays = 30 | 60 | 90;

const RenewalsDashboardPage = () => {
  const [data, setData] = useState<RenewalContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterDays>(90);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<RenewalsDashboardData>('/management/dashboard');
        setData(response.data.upcoming_expirations);
      } catch (err) {
        setError('Failed to load renewals data. Please try again.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(contract => 
      contract.days_until_expiration !== null && contract.days_until_expiration <= filter
    );
  }, [data, filter]);

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center py-10">Loading renewals...</div>;
    }

    if (error) {
      return <div className="text-red-500 text-center py-10">{error}</div>;
    }

    if (filteredData.length === 0) {
      return <div className="text-gray-500 text-center py-10">No contracts are up for renewal in the selected timeframe.</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires In</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiration Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Renewal Notice Deadline</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.map((contract) => (
              <tr key={contract.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contract.filename}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contract.days_until_expiration} days</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {contract.expiration_date ? new Date(contract.expiration_date + 'T00:00:00').toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {contract.renewal_notice_deadline ? new Date(contract.renewal_notice_deadline + 'T00:00:00').toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href={`/dashboard/contracts/${contract.id}`} className="text-indigo-600 hover:text-indigo-900">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Renewals Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage contracts that are approaching their expiration or renewal dates.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="sm:hidden">
          <label htmlFor="tabs" className="sr-only">Select a tab</label>
          <select id="tabs" name="tabs" className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500" defaultValue={filter} onChange={(e) => setFilter(Number(e.target.value) as FilterDays)}>
            <option value={30}>Next 30 Days</option>
            <option value={60}>Next 60 Days</option>
            <option value={90}>Next 90 Days</option>
          </select>
        </div>
        <div className="hidden sm:block">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {( [30, 60, 90] as FilterDays[] ).map((days) => (
                <button key={days} onClick={() => setFilter(days)} className={`${filter === days ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                  Next {days} Days
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenewalsDashboardPage;