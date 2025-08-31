'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import api from '@/lib/api';
import IntegrationCard from '@/components/settings/IntegrationCard';

// Types based on backend schemas
interface Integration {
  id: string;
  name: string;
  description: string;
  auth_type: 'oauth2' | 'api_key';
}

interface OrganizationIntegration {
  id: string;
  is_enabled: boolean;
  integration: Integration;
}

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: availableIntegrations, error: availableError } = useSWR<Integration[]>('/api/v1/integrations/', fetcher);
  const { data: orgIntegrations, error: orgError } = useSWR<OrganizationIntegration[]>('/api/v1/integrations/organization', fetcher);

  // Handle success/error messages from OAuth redirects
  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'salesforce') {
      setAlert({ type: 'success', message: 'Successfully connected to Salesforce.' });
      // Refetch org integrations to show the new connection
      mutate('/api/v1/integrations/organization');
    }
    // Can add error handling here too
  }, [searchParams]);

  const handleDisconnect = async (orgIntegrationId: string) => {
    try {
      await api.delete(`/api/v1/integrations/organization/${orgIntegrationId}`);
      // Refetch org integrations to update the UI
      mutate('/api/v1/integrations/organization');
      setAlert({ type: 'success', message: 'Integration disconnected successfully.' });
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to disconnect integration.' });
    }
  };

  const isLoading = !availableIntegrations && !availableError;
  const error = availableError || orgError;

  if (isLoading) return <div className="p-8">Loading integrations...</div>;
  if (error) return <div className="p-8 text-red-500">Failed to load integrations.</div>;

  // Create a map of connected integrations by their name for easy lookup
  const connectedMap = new Map(orgIntegrations?.map(oi => [oi.integration.name, oi]));

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Integrations</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        {alert && (
          <div className={`rounded-md p-4 mb-4 ${alert.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-sm font-medium ${alert.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{alert.message}</p>
          </div>
        )}
        <div className="space-y-6">
          {availableIntegrations?.map(integration => {
            const orgIntegration = connectedMap.get(integration.name);
            const isConnected = !!orgIntegration && orgIntegration.is_enabled;
            const connectUrl = integration.auth_type === 'oauth2' && integration.name.toLowerCase() === 'salesforce' ? '/api/v1/integrations/salesforce/auth' : '#';

            return <IntegrationCard key={integration.id} name={integration.name} description={integration.description} isConnected={isConnected} connectUrl={connectUrl} onDisconnect={() => orgIntegration && handleDisconnect(orgIntegration.id)} />;
          })}
        </div>
      </div>
    </div>
  );
}