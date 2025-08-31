'use client';

interface KPICardProps {
  title: string;
  value: string | number;
  description: string;
}

export default function KPICard({ title, value, description }: KPICardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <dl>
          <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
          <dd>
            <div className="text-2xl font-semibold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{description}</div>
          </dd>
        </dl>
      </div>
    </div>
  );
}