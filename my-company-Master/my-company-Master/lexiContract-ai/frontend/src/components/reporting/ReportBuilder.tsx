'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ReportConfig, CustomReport } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DataSourceSelector from './DataSourceSelector';
import { FilterBuilder } from './FilterBuilder';
import { MetricsAndDimensions } from './MetricsAndDimensions';
import { ReportPreview } from './ReportPreview';
import { SaveReportModal } from './SaveReportModal';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const initialConfig: ReportConfig = {
  dataSource: 'contracts',
  metrics: [{ field: 'id', aggregation: 'count' }],
  filters: [],
  groupBy: null,
  visualizationType: 'bar_chart',
};

const AVAILABLE_FIELDS_MAP = {
  contracts: {
    metrics: [{ label: 'ID', value: 'id' }],
    dimensions: [
      { label: 'Negotiation Status', value: 'negotiation_status' },
      { label: 'Creation Date', value: 'created_at' },
      { label: 'Last Updated Date', value: 'updated_at' },
    ],
  },
  analysis_suggestions: {
    metrics: [{ label: 'ID', value: 'id' }],
    dimensions: [
      { label: 'Risk Category', value: 'risk_category' },
      { label: 'Status', value: 'status' },
    ],
  },
};

export default function ReportBuilder() {
  const [config, setConfig] = useState<ReportConfig>(initialConfig);
  const [reportName, setReportName] = useState('New Report');
  const [reportDescription, setReportDescription] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);

  const [data, setData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaveModalOpen, setSaveModalOpen] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setReportId(id);
      const fetchReport = async () => {
        setIsLoading(true);
        try {
          const response = await api.get(`/reports/${id}`);
          const report: CustomReport = response.data;
          setConfig(report.configuration);
          setReportName(report.name);
          setReportDescription(report.description || '');
        } catch (err) {
          setError('Failed to load report.');
          toast.error('Failed to load report.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchReport();
    }
  }, [searchParams]);

  const handleExecute = async () => {
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const response = await api.post('/reports/execute', { configuration: config });
      setData(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to execute report.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (name: string, description: string) => {
    setIsSaving(true);
    const payload = { name, description, configuration: config };
    try {
      if (reportId) {
        await api.put(`/reports/${reportId}`, payload);
      } else {
        await api.post('/reports', payload);
      }
      toast.success(`Report "${name}" saved successfully.`);
      setSaveModalOpen(false);
      router.push('/dashboard/reports');
    } catch (err) {
      toast.error('Failed to save report.');
    } finally {
      setIsSaving(false);
    }
  };

  const { availableMetrics, availableDimensions } = useMemo(() => ({
    availableMetrics: AVAILABLE_FIELDS_MAP[config.dataSource].metrics,
    availableDimensions: AVAILABLE_FIELDS_MAP[config.dataSource].dimensions,
  }), [config.dataSource]);

  return (
    <div className="grid auto-rows-max items-start gap-4 lg:grid-cols-3 lg:gap-8">
      <div className="grid auto-rows-max items-start gap-4 lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Configure Report</CardTitle>
            <CardDescription>Define the data, filters, and metrics for your report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <DataSourceSelector config={config} setConfig={setConfig} />
            <MetricsAndDimensions config={config} setConfig={setConfig} availableMetrics={availableMetrics} availableDimensions={availableDimensions} />
            <FilterBuilder config={config} setConfig={setConfig} availableFields={availableDimensions} />
          </CardContent>
        </Card>
      </div>
      <div className="grid auto-rows-max items-start gap-4 lg:col-span-2">
        <div className="flex items-center gap-4">
            <Input value={reportName} onChange={(e) => setReportName(e.target.value)} className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0" />
            <div className="hidden items-center gap-2 md:ml-auto md:flex">
                <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/reports')}>Discard</Button>
                <Button size="sm" onClick={() => setSaveModalOpen(true)}>Save Report</Button>
                <Button size="sm" variant="default" onClick={handleExecute} disabled={isLoading}>{isLoading ? 'Running...' : 'Run Query'}</Button>
            </div>
        </div>
        <ReportPreview config={config} data={data} isLoading={isLoading} error={error} />
      </div>
      <SaveReportModal
        isOpen={isSaveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSave}
        isSaving={isSaving}
        initialName={reportName}
        initialDescription={reportDescription}
      />
    </div>
  );
}