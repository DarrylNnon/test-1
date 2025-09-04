'use client';

import { ReportConfig, ReportFilter } from '@/types';
import { X } from 'lucide-react';

interface FilterBuilderProps {
  config: ReportConfig;
  setConfig: (config: ReportConfig) => void;
  availableFields: { label: string; value: string }[];
}

const MOCK_OPERATORS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'is_null'];

export const FilterBuilder = ({ config, setConfig, availableFields }: FilterBuilderProps) => {
  const addFilter = () => {
    if (availableFields.length === 0) return;
    const newFilter: ReportFilter = {
      id: crypto.randomUUID(),
      field: availableFields[0].value,
      operator: MOCK_OPERATORS[0],
      value: '',
    };
    setConfig({ ...config, filters: [...config.filters, newFilter] });
  };

  const updateFilter = (id: string, newValues: Partial<Omit<ReportFilter, 'id'>>) => {
    const newFilters = config.filters.map(f =>
      f.id === id ? { ...f, ...newValues } : f
    );
    setConfig({ ...config, filters: newFilters });
  };

  const removeFilter = (id: string) => {
    const newFilters = config.filters.filter(f => f.id !== id);
    setConfig({ ...config, filters: newFilters });
  };

  return (
    <div className="p-4 border-b">
      <h3 className="font-semibold text-lg mb-2">Filters</h3>
      <div className="space-y-2">
        {config.filters.map(filter => (
          <div key={filter.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded-md">
            <select value={filter.field} onChange={e => updateFilter(filter.id, { field: e.target.value })} className="col-span-4 p-2 border rounded-md text-sm capitalize">
              {availableFields.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <select value={filter.operator} onChange={e => updateFilter(filter.id, { operator: e.target.value })} className="col-span-3 p-2 border rounded-md text-sm">
              {MOCK_OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            <input
              type="text"
              value={filter.value}
              onChange={e => updateFilter(filter.id, { value: e.target.value })}
              className="col-span-4 p-2 border rounded-md text-sm"
              placeholder="Value"
              disabled={filter.operator === 'is_null'}
            />
            <button onClick={() => removeFilter(filter.id)} className="col-span-1 text-gray-400 hover:text-red-500">
              <X size={18} />
            </button>
          </div>
        ))}
        <button onClick={addFilter} className="w-full text-sm py-2 px-4 border border-dashed rounded-md hover:bg-gray-100 text-gray-600">
          + Add Filter
        </button>
      </div>
    </div>
  );
};