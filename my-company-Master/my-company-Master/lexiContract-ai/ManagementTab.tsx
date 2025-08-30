import React, { useState, useEffect } from 'react';
import { ContractMilestone, TrackedObligation } from '@/types';
import { api } from '@/lib/api';
import { MilestonesTimeline } from './MilestonesTimeline';
import { ObligationsTable } from './ObligationsTable';

interface ManagementTabProps {
  contractId: string;
}

export const ManagementTab: React.FC<ManagementTabProps> = ({ contractId }) => {
  const [milestones, setMilestones] = useState<ContractMilestone[]>([]);
  const [obligations, setObligations] = useState<TrackedObligation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!contractId) return;
      setIsLoading(true);
      setError(null);
      try {
        const [milestonesRes, obligationsRes] = await Promise.all([
          api.get(`/contracts/${contractId}/milestones`),
          api.get(`/contracts/${contractId}/obligations`),
        ]);
        setMilestones(milestonesRes.data);
        setObligations(obligationsRes.data);
      } catch (err) {
        setError('Failed to load management data. Please try again.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [contractId]);

  const handleObligationUpdate = (updatedObligation: TrackedObligation) => {
    setObligations(prev => prev.map(ob => ob.id === updatedObligation.id ? updatedObligation : ob));
  };

  if (isLoading) return <div>Loading management data...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-8 py-6">
      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900">Key Dates & Milestones</h3>
        <div className="mt-4">
          <MilestonesTimeline milestones={milestones} />
        </div>
      </div>
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Tracked Obligations</h3>
        <div className="mt-4">
          {obligations.length > 0 ? (<ObligationsTable obligations={obligations} onObligationUpdate={handleObligationUpdate} />) : (<p className="text-gray-500">No specific obligations have been extracted for this contract.</p>)}
        </div>
      </div>
    </div>
  );
};