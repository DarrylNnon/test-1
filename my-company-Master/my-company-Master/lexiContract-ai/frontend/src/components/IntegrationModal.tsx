'use client';
import { useState, FormEvent, ChangeEvent } from 'react';
import { api } from '@/lib/api';
import { Integration, OrganizationIntegration } from '@/types';

interface IntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orgIntegration: OrganizationIntegration) => void;
  integration: Integration;
}

export default function IntegrationModal({ isOpen, onClose, onSave, integration }: IntegrationModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      is_enabled: true,
      credentials: { api_key: apiKey },
    };

    try {
      const response = await api.post(`/integrations/organization/${integration.id}`, payload);
      onSave(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Connect to {integration.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="api_key" className="block text-sm font-medium text-gray-700">API Key</label>
            <input type="password" id="api_key" value={apiKey} onChange={(e: ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
            <p className="mt-2 text-xs text-gray-500">Your API key will be stored securely and encrypted at rest.</p>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}