interface KPIsProps {
  data: {
    total_contracts: number;
    contracts_in_progress: number;
    average_cycle_time_days: number;
  };
}

export default function KPIs({ data }: KPIsProps) {
  const stats = [
    { name: 'Total Contracts', stat: data.total_contracts },
    { name: 'Contracts In Progress', stat: data.contracts_in_progress },
    { name: 'Avg. Review Cycle', stat: `${data.average_cycle_time_days} days` },
  ];

  return (
    <div>
      <h3 className="text-base font-semibold leading-6 text-gray-900">Key Performance Indicators</h3>
      <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {stats.map((item) => (
          <div key={item.name} className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">{item.name}</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{item.stat}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}