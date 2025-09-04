"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "use-debounce";
import api from "@/lib/api";
import { ReportConfig } from "@/types";
import { DataSourceSelector } from "@/components/reporting/DataSourceSelector";
import { FilterBuilder } from "@/components/reporting/FilterBuilder";
import { MetricsAndDimensions } from "@/components/reporting/MetricsAndDimensions";
import { VisualizationPicker } from "@/components/reporting/VisualizationPicker";
import { ReportPreview } from "@/components/reporting/ReportPreview";
import { SaveReportModal } from "@/components/reporting/SaveReportModal";
import { Save } from "lucide-react";

// Define available fields for each data source
const AVAILABLE_FIELDS: Record<string, { label: string; value: string }[]> = {
  contracts: [
    { label: 'ID', value: 'id' },
    { label: 'Negotiation Status', value: 'negotiation_status' },
    { label: 'Creation Date', value: 'created_at' },
    { label: 'Last Updated', value: 'updated_at' },
  ],
  analysis_suggestions: [
    { label: 'ID', value: 'id' },
    { label: 'Risk Category', value: 'risk_category' },
    { label: 'Status', value: 'status' },
  ],
};

export default function ReportBuilderPage() {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    dataSource: 'contracts',
    metrics: [{ field: 'id', aggregation: 'count' }],
    groupBy: null,
    filters: [],
    visualizationType: 'bar_chart',
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get('id');

  const [reportDetails, setReportDetails] = useState({ name: '', description: '' });

  const [debouncedConfig] = useDebounce(reportConfig, 750);

  const [reportData, setReportData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (reportId) {
      const fetchReport = async () => {
        try {
          const response = await api.get(`/reports/${reportId}`);
          const { configuration, name, description } = response.data;
          setReportConfig(configuration);
          setReportDetails({ name, description: description || '' });
        } catch (error) {
          console.error("Failed to fetch report for editing", error);
          router.push('/dashboard/reports'); // Redirect if report not found
        }
      };
      fetchReport();
    }
  }, [reportId, router]);

  const fetchReportData = useCallback(async (config: ReportConfig) => {
    if (!config.groupBy) {
      setReportData(null);
      setError("Please select a 'Group By' field to generate a report.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Remove the client-side 'id' from filters before sending to the API
      const apiConfig = {
        ...config,
        filters: config.filters.map(({ id, ...rest }) => rest),
      };
      const response = await api.post('/reports/execute', { configuration: apiConfig });
      setReportData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to execute report.');
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData(debouncedConfig);
  }, [debouncedConfig, fetchReportData]);

  const handleSaveReport = async (name: string, description: string) => {
    setIsSaving(true);
    try {
      const payload = { name, description, configuration: reportConfig };      
      if (reportId) {
        await api.put(`/reports/${reportId}`, payload);
      } else {
        await api.post('/reports', payload);
      }
      setIsModalOpen(false);
      router.push('/dashboard/reports');
    } catch (error) {
      console.error("Failed to save report", error);
      // Here you could add user-facing error handling
    } finally {
      setIsSaving(false);
    }
  };

  const currentFields = AVAILABLE_FIELDS[reportConfig.dataSource] || [];
  // For now, only counting records by ID is supported as a metric.
  const availableMetrics = currentFields.filter(f => f.value === 'id');
  const availableDimensions = currentFields.filter(f => f.value !== 'id');

  return (
    <div className="flex h-full bg-gray-50">
      <SaveReportModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveReport}
        isSaving={isSaving}
        initialName={reportDetails.name}
        initialDescription={reportDetails.description}
      />
      {/* Left Panel: Configuration */}
      <aside className="w-1/3 h-full bg-white border-r overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold">{reportId ? 'Edit Report' : 'Report Builder'}</h2>
            {reportId && <p className="text-sm text-gray-500 truncate">{reportDetails.name}</p>}
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
            <Save size={16} className="mr-2" /> {reportId ? 'Update' : 'Save'}
          </button>
        </div>
        <DataSourceSelector config={reportConfig} setConfig={setReportConfig} />
        <FilterBuilder config={reportConfig} setConfig={setReportConfig} availableFields={availableDimensions} />
        <MetricsAndDimensions config={reportConfig} setConfig={setReportConfig} availableMetrics={availableMetrics} availableDimensions={availableDimensions} />
        <VisualizationPicker config={reportConfig} setConfig={setReportConfig} />
      </aside>

      {/* Right Panel: Live Preview */}
      <main className="w-2/3 p-8">
        <h1 className="text-2xl font-bold mb-6">Report Preview</h1>
        <div className="bg-white p-6 rounded-lg shadow-md min-h-96 flex items-center justify-center">
          <ReportPreview
            config={reportConfig}
            data={reportData}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </main>
    </div>
  );
}