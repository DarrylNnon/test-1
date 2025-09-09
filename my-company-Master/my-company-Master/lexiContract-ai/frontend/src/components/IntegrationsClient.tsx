'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Integration, OrganizationIntegration } from '@/types';
import IntegrationModal from './IntegrationModal';

export default function IntegrationsClient() {
  const { token, loading: authLoading } = useAuth();
  const [availableIntegrations, setAvailableIntegrations] = useState<Integration[]>([]);
  const [orgIntegrations, setOrgIntegrations] = useState<OrganizationIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  useEffect(() => {
    const fetchIntegrations = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const [availableRes, orgRes] = await Promise.all([
          api.get('/integrations/'),
          api.get('/integrations/organization'),
        ]);
        setAvailableIntegrations(availableRes.data);
        setOrgIntegrations(orgRes.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load integrations data.');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchIntegrations();
    }
  }, [token, authLoading]);

  const connectedIntegrationIds = useMemo(() => {
    return new Set(orgIntegrations.map((oi: OrganizationIntegration) => oi.integration.id));
  }, [orgIntegrations]);

  const handleConnectClick = (integration: Integration) => {
    setSelectedIntegration(integration);
    setIsModalOpen(true);
  };

  const handleDisconnectClick = async (orgIntegrationId: string) => {
    if (window.confirm('Are you sure you want to disconnect this integration?')) {
      try {
        await api.delete(`/integrations/organization/${orgIntegrationId}`);
        setOrgIntegrations(prev => prev.filter((oi: OrganizationIntegration) => oi.id !== orgIntegrationId));
      } catch (err) {
        alert('Failed to disconnect integration.');
      }
    }
  };

  const handleSave = (newOrgIntegration: OrganizationIntegration) => {
    setOrgIntegrations(prev => [...prev, newOrgIntegration]);
    setIsModalOpen(false);
    setSelectedIntegration(null);
  };

  if (loading || authLoading) {
    return <div className="text-center p-8">Loading Integrations...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">CRM/ERP Integrations</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">Connect LexiContract AI to your other business systems.</p>
      </div>
      <div className="border-t border-gray-200">
        <ul role="list" className="divide-y divide-gray-200">
          {availableIntegrations.map((integration: Integration) => {
            const orgIntegration = orgIntegrations.find((oi: OrganizationIntegration) => oi.integration.id === integration.id);
            const isConnected = !!orgIntegration;

            return (
              <li key={integration.id} className="flex items-center justify-between p-4 sm:p-6">
                <div>
                  <h4 className="text-md font-semibold text-gray-800">{integration.name}</h4>
                  <p className="text-sm text-gray-500">{integration.description}</p>
                </div>
                <div>
                  {isConnected ? (
                    <button onClick={() => handleDisconnectClick(orgIntegration.id)} className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-100">
                      Disconnect
                    </button>
                  ) : (
                    <button onClick={() => handleConnectClick(integration)} className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                      Connect
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {isModalOpen && selectedIntegration && (
        <IntegrationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          integration={selectedIntegration}
        />
      )}
    </div>
  );
}