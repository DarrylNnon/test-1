'use client';

import { useState, useEffect } from 'react';
import api from '../lib/api';
import { CompliancePlaybook, Organization } from '../types';

const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) => {
  return (
    <button
      type="button"
      className={`${
        enabled ? 'bg-indigo-600' : 'bg-gray-200'
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
    >
      <span
        aria-hidden="true"
        className={`${
          enabled ? 'translate-x-5' : 'translate-x-0'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  );
};

const ComplianceSettings = () => {
  const [availablePlaybooks, setAvailablePlaybooks] = useState<CompliancePlaybook[]>([]);
  const [enabledPlaybookIds, setEnabledPlaybookIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [playbooksRes, orgRes] = await Promise.all([
          api.get('/playbooks/organization/available'),
          api.get('/users/me'), // This endpoint returns the user with their organization details
        ]);

        setAvailablePlaybooks(playbooksRes.data);

        const org: Organization = orgRes.data.organization;
        setEnabledPlaybookIds(new Set(org.enabled_playbooks.map(p => p.id)));

      } catch (err) {
        setError('Failed to load compliance settings. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleToggle = async (playbookId: string, enable: boolean) => {
    const originalState = new Set(enabledPlaybookIds);
    const newState = new Set(originalState);
    if (enable) newState.add(playbookId);
    else newState.delete(playbookId);
    setEnabledPlaybookIds(newState);

    try {
      await api.post('/playbooks/organization/toggle', { playbook_id: playbookId, enable });
    } catch (err) {
      setError('Failed to update setting. Please try again.');
      setEnabledPlaybookIds(originalState); // Revert on error
      console.error(err);
    }
  };

  if (loading) return <div className="p-6">Loading compliance settings...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Industry-Specific Compliance Modules</h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>Enable specialized playbooks to scan contracts for regulations relevant to your industry. This feature is available for Enterprise plans.</p>
        </div>
        <div className="mt-5">
          <ul role="list" className="divide-y divide-gray-200">
            {availablePlaybooks.map((playbook) => (
              <li key={playbook.id} className="py-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-gray-900">{playbook.name} <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">{playbook.industry}</span></p>
                  <p className="text-sm text-gray-500">{playbook.description}</p>
                </div>
                <ToggleSwitch enabled={enabledPlaybookIds.has(playbook.id)} onChange={(enabled) => handleToggle(playbook.id, enabled)} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ComplianceSettings;