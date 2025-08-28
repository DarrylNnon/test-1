'use client';

import { useState, useEffect } from 'react';
import useAuth from '@/hooks/useAuth';
import api from '@/lib/api';
import { ContractTemplate } from '@/types';

export default function DraftingClient() {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [variables, setVariables] = useState<{ [key: string]: string }>({});
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const response = await api.get('/templates/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTemplates(response.data);
      } catch (err: any) {
        const detail = err.response?.data?.detail || 'Failed to load templates.';
        setError(detail);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [token]);

  const handleTemplateSelect = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    // Extract variables from the template content
    const matches = [...template.content.matchAll(/\{\{\s*([\w\d_]+)\s*\}\}/g)];
    const extractedVariables = matches.map(match => match[1].trim());
    // Initialize the variables state with empty strings
    const initialValues: { [key: string]: string } = {};
    extractedVariables.forEach(variable => {
      initialValues[variable] = '';
    });
    setVariables(initialValues);
    setDraftContent(null); // Clear any previous drafts
  };

  const handleVariableChange = (variable: string, value: string) => {
    setVariables(prev => ({ ...prev, [variable]: value }));
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      setError('Please select a template.');
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const response = await api.post(`/templates/${selectedTemplate.id}/draft`, { variables }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDraftContent(response.data.draft_content);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to generate contract.';
      setError(detail);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Draft a New Contract</h1>

        {loading && <p>Loading templates...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Template Selection */}
          <div>
            <h2 className="text-lg font-medium text-gray-700 mb-4">1. Select a Template</h2>
            <ul className="space-y-2">
              {templates.map(template => (
                <li key={template.id}>
                  <button
                    onClick={() => handleTemplateSelect(template)}
                    className={`w-full text-left p-4 bg-white rounded-md shadow-sm hover:bg-gray-50 ${selectedTemplate?.id === template.id ? 'ring-2 ring-indigo-500' : ''}`}
                  >
                    <h3 className="font-semibold text-gray-800">{template.title}</h3>
                    <p className="text-gray-500 text-sm">{template.description || 'No description provided.'}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Variable Input */}
          {selectedTemplate && (
            <div>
              <h2 className="text-lg font-medium text-gray-700 mb-4">2. Fill in the Details</h2>
              <div className="space-y-4">
                {Object.keys(variables).map(variable => (
                  <div key={variable}>
                    <label htmlFor={variable} className="block text-sm font-medium text-gray-700">{variable}</label>
                    <input
                      type="text"
                      id={variable}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      value={variables[variable]}
                      onChange={(e) => handleVariableChange(variable, e.target.value)}
                    />
                  </div>
                ))}
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
                >
                  {generating ? 'Generating...' : 'Generate Contract'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Draft Contract Display */}
        {draftContent && (
          <div className="mt-12">
            <h2 className="text-lg font-medium text-gray-700 mb-4">3. Contract Draft</h2>
            <div className="bg-gray-50 p-6 rounded-md shadow-sm whitespace-pre-wrap font-mono text-sm">
              {draftContent}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}