"use client";

import { Kpi } from '@/types';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface KPIsProps {
  kpis: Kpi[];
}

const KPIs = ({ kpis }: KPIsProps) => {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((item) => (
        <div key={item.label} className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6">
          <dt>
            <p className="truncate text-sm font-medium text-gray-500">{item.label}</p>
          </dt>
          <dd className="flex items-baseline pb-6 sm:pb-7">
            <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
            {item.change && (
              <p className={`ml-2 flex items-baseline text-sm font-semibold ${item.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                {item.changeType === 'increase' ? <ArrowUp className="h-5 w-5 flex-shrink-0 self-center text-green-500" /> : <ArrowDown className="h-5 w-5 flex-shrink-0 self-center text-red-500" />}
                <span className="sr-only"> {item.changeType === 'increase' ? 'Increased' : 'Decreased'} by </span>
                {item.change}
              </p>
            )}
          </dd>
        </div>
      ))}
    </div>
  );
};

export default KPIs;