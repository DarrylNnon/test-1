'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { ContractTemplate, DraftContractResponse, FinalizeDraftRequest } from '@/types';

type WizardStep = 1 | 2 | 3;

export default function DraftingClient() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<WizardStep>(1);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [draftContent, setDraftContent] = useState<string>('');
  const [filename, setFilename] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const response = await api.get('/templates/', { headers: { Authorization: `Bearer ${token}` } });
        setTemplates(response.data);
      } catch (err) {
        setError('Failed to load contract templates.');
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading) fetchTemplates();
  }, [token, authLoading]);

  const extractedVariables = useMemo(() => {
    if (!selectedTemplate) return [];
    const matches = selectedTemplate.content.match(/{{\s*(\w+)\s*}}/g);
    if (!matches) return [];
    const uniqueVars = new Set(matches.map(v => v.replace(/[{}]/g, '').trim()));
    return Array.from(uniqueVars);
  }, [selectedTemplate]);

  const handleSelectTemplate = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setFilename(`${template.title}.txt`);
    setStep(2);
  };

  const handleVariableChange = (key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }));
  };

  const handleGeneratePreview = async () => {
    if (!selectedTemplate) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<DraftContractResponse>(
        `/templates/${selectedTemplate.id}/draft`,
        { variables },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDraftContent(response.data.draft_content);
      setStep(3);
    } catch (err) {
      setError('Failed to generate draft.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeContract = async () => {
    if (!draftContent || !filename) return;
    setLoading(true);
    setError(null);
    try {
      const payload: FinalizeDraftRequest = { filename, content: draftContent };
      const response = await api.post('/drafting/finalize', payload, { headers: { Authorization: `Bearer ${token}` } });
      // Redirect to the new contract's detail page
      router.push(`/dashboard/contracts/${response.data.id}`);
    } catch (err) {
      setError('Failed to create the final contract.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2 className="text-lg font-medium text-gray-900">Step 1: Select a Template</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {templates.map(t => (
                <button key={t.id} onClick={() => handleSelectTemplate(t)} className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-400 text-left">
                  <div className="min-w-0 flex-1"><p className="font-medium text-gray-900">{t.title}</p><p className="text-sm text-gray-500 truncate">{t.description}</p></div>
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <h2 className="text-lg font-medium text-gray-900">Step 2: Fill in the Details for "{selectedTemplate?.title}"</h2>
            <div className="mt-4 space-y-4">
              {extractedVariables.map(v => (
                <div key={v}>
                  <label htmlFor={v} className="block text-sm font-medium text-gray-700 capitalize">{v.replace(/_/g, ' ')}</label>
                  <input type="text" id={v} onChange={(e) => handleVariableChange(v, e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Back</button>
              <button onClick={handleGeneratePreview} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">{loading ? 'Generating...' : 'Generate Preview'}</button>
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <h2 className="text-lg font-medium text-gray-900">Step 3: Preview & Create Contract</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="filename" className="block text-sm font-medium text-gray-700">Filename</label>
                <input type="text" id="filename" value={filename} onChange={(e) => setFilename(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Draft Content</label>
                <div className="mt-1 p-4 w-full h-96 overflow-y-auto bg-gray-50 border border-gray-300 rounded-md whitespace-pre-wrap font-mono text-sm">{draftContent}</div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={() => setStep(2)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Back</button>
              <button onClick={handleFinalizeContract} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400">{loading ? 'Creating...' : 'Create Contract'}</button>
            </div>
          </div>
        );
    }
  };

  if (loading || authLoading) return <div className="text-center p-8">Loading...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Draft a New Contract</h1>
          <p className="mt-2 text-sm text-gray-700">Create a new contract from your organization's approved templates.</p>
        </div>
      </div>
      <div className="mt-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}