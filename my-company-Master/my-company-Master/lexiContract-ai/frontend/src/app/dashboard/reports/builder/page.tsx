'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from 'use-debounce';

// NOTE: In a real app, these would be imported from a shared types file and an API client.
// For now, we define them here for clarity.

interface Filter {
  id: number;
  column: string;
  operator: string;
  value: string;
}

interface ReportDefinition {
  model: string;
  columns: string[];
  filters: Omit<Filter, 'id'>[];
}

const AVAILABLE_MODELS: Record<string, { columns: string[] }> = {
  Contract: {
    columns: ['id', 'filename', 'negotiation_status', 'signature_status', 'created_at', 'updated_at'],
  },
  TrackedObligation: {
    columns: ['id', 'obligation_text', 'responsible_party', 'due_date', 'status'],
  },
  ContractMilestone: {
    columns: ['id', 'milestone_type', 'milestone_date', 'description'],
  },
};

const OPERATORS = [
  'equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_in', 'is_not_in'
];

// Mock API functions - these would live in lib/api.ts
async function executeReportPreview(definition: ReportDefinition): Promise<any[]> {
  // This function would call the backend's execute endpoint.
  // For this example, we'll simulate a call.
  console.log("Executing report preview with definition:", definition);
  // In a real app:
  // const response = await fetch('/api/v1/reports/preview', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  //   body: JSON.stringify(definition),
  // });
  // if (!response.ok) throw new Error('Failed to fetch preview');
  // return response.json();
  return new Promise(resolve => setTimeout(() => resolve([{ "id": "mock-uuid-123", "status": "SIGNED" }]), 500));
}

async function saveReport(name: string, description: string, definition: ReportDefinition): Promise<any> {
    console.log("Saving report:", { name, description, definition });
    // In a real app:
    // const response = await fetch('/api/v1/reports', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    //   body: JSON.stringify({ name, description, definition }),
    // });
    // if (!response.ok) throw new Error('Failed to save report');
    // return response.json();
    return { id: "new-report-id", name, definition };
}

export default function ReportBuilderPage() {
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [model, setModel] = useState<string>('Contract');
  const [columns, setColumns] = useState<string[]>(['id', 'filename', 'negotiation_status']);
  const [filters, setFilters] = useState<Filter[]>([]);

  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [debouncedDefinition] = useDebounce({ model, columns, filters }, 500);

  const fetchPreview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const definition: ReportDefinition = {
        model: debouncedDefinition.model,
        columns: debouncedDefinition.columns,
        filters: debouncedDefinition.filters.map(({ id, ...rest }: Filter) => rest),
      };
      const data = await executeReportPreview(definition);
      setPreviewData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedDefinition]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleColumnToggle = (columnName: string) => {
    setColumns((prev: string[]) =>
      prev.includes(columnName)
        ? prev.filter((c: string) => c !== columnName)
        : [...prev, columnName]
    );
  };

  const addFilter = () => {
    setFilters((prev: Filter[]) => [...prev, { id: Date.now(), column: '', operator: 'equals', value: '' }]);
  };

  const updateFilter = (id: number, field: keyof Omit<Filter, 'id'>, value: string) => {
    setFilters((prev: Filter[]) => prev.map((f: Filter) => f.id === id ? { ...f, [field]: value } : f));
  };

  const removeFilter = (id: number) => {
    setFilters((prev: Filter[]) => prev.filter((f: Filter) => f.id !== id));
  };

  const handleSave = async () => {
    if (!reportName) {
        alert("Please provide a name for the report.");
        return;
    }
    const definition: ReportDefinition = { model, columns, filters: filters.map(({id, ...rest}: Filter) => rest) };
    await saveReport(reportName, reportDescription, definition);
    alert("Report saved successfully!");
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Report Builder</h1>
          <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold">
            Save Report
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* --- Configuration Panel --- */}
          <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow">
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Name</label>
                <input type="text" value={reportName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReportName(e.target.value)} className="w-full p-2 border rounded-md" placeholder="e.g., Quarterly Signed Contracts"/>
            </div>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={reportDescription} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReportDescription(e.target.value)} className="w-full p-2 border rounded-md" rows={2}></textarea>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Source</label>
              <select value={model} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setModel(e.target.value)} className="w-full p-2 border rounded-md">
                {Object.keys(AVAILABLE_MODELS).map((m: string) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Columns</h3>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_MODELS[model]?.columns.map((col: string) => (
                  <label key={col} className="flex items-center space-x-2 text-sm">
                    <input type="checkbox" checked={columns.includes(col)} onChange={() => handleColumnToggle(col)} />
                    <span>{col}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Filters</h3>
              {filters.map((filter: Filter) => (
                <div key={filter.id} className="grid grid-cols-3 gap-2 mb-2 p-2 border rounded-md">
                  <select value={filter.column} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateFilter(filter.id, 'column', e.target.value)} className="col-span-3 p-1 border rounded-md">
                    <option value="">Select Column</option>
                    {AVAILABLE_MODELS[model]?.columns.map((col: string) => <option key={col} value={col}>{col}</option>)}
                  </select>
                  <select value={filter.operator} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateFilter(filter.id, 'operator', e.target.value)} className="p-1 border rounded-md">
                    {OPERATORS.map((op: string) => <option key={op} value={op}>{op}</option>)}
                  </select>
                  <input type="text" value={filter.value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter(filter.id, 'value', e.target.value)} className="col-span-2 p-1 border rounded-md" placeholder="Value"/>
                  <button onClick={() => removeFilter(filter.id)} className="col-span-3 text-red-500 text-xs text-right">Remove</button>
                </div>
              ))}
              <button onClick={addFilter} className="w-full mt-2 text-sm py-2 border-2 border-dashed rounded-md hover:bg-gray-100">
                + Add Filter
              </button>
            </div>
          </div>

          {/* --- Live Preview Panel --- */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Live Preview</h2>
            {isLoading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!isLoading && !error && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {columns.map((col: string) => <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col}</th>)}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((row: any, i: number) => (
                      <tr key={i}>
                        {columns.map((col: string) => <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row[col]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length === 0 && <p className="text-center text-gray-500 py-4">No data to display.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}