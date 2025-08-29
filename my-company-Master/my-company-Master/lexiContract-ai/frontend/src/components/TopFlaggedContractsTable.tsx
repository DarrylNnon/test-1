'use client';

import Link from 'next/link';
import { TopFlaggedContract } from '@/types';

interface TopFlaggedContractsTableProps {
  data: TopFlaggedContract[];
}

const TopFlaggedContractsTable = ({ data }: TopFlaggedContractsTableProps) => {
  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Top Flagged Contracts</h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>These contracts have the highest number of compliance-related findings and may require priority review.</p>
        </div>
        <div className="mt-5 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                      Filename
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Findings
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.map((contract) => (
                    <tr key={contract.contract_id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                        {contract.filename}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{contract.finding_count}</td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                        <Link href={`/dashboard/contracts/${contract.contract_id}`} className="text-indigo-600 hover:text-indigo-900">
                          View<span className="sr-only">, {contract.filename}</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopFlaggedContractsTable;