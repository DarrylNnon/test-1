'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getContractById, getContractPredictions, updateSuggestionStatus } from '@/lib/api';
import { Contract, ContractPredictions, VersionStatus, SuggestionStatus } from '@/types';
import PredictionInsights from '@/components/predictions/PredictionInsights';
import AutonomousRedlineReview from '@/components/review/AutonomousRedlineReview';

export default function ContractDetailPage() {
  const { contractId } = useParams();
  const { token } = useAuth() || {}; // Assuming useAuth provides the token
  const [contract, setContract] = useState<Contract | null>(null);
  const [predictions, setPredictions] = useState<ContractPredictions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingSuggestionId, setUpdatingSuggestionId] = useState<string | null>(null);

  const updateSuggestionState = (suggestionId: string, status: SuggestionStatus) => {
    if (!contract) return;
    const newContract = { ...contract };
    const latestVersion = newContract.versions[newContract.versions.length - 1];
    const suggestion = latestVersion.suggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      suggestion.status = status;
    }
    setContract(newContract);
  };

  const handleSuggestionAction = async (suggestionId: string, status: 'accepted' | 'rejected') => {
    if (!token) return;
    setUpdatingSuggestionId(suggestionId);
    try {
      // Optimistic UI update
      updateSuggestionState(suggestionId, status as SuggestionStatus);
      await updateSuggestionStatus(suggestionId, status, token);
      // Optionally refetch data to ensure consistency, though optimistic update is often enough
      // fetchContractData(); 
    } catch (err) {
      console.error(`Failed to ${status} suggestion`, err);
      setError(`Failed to update suggestion. Please try again.`);
      // Revert optimistic update on error
      updateSuggestionState(suggestionId, SuggestionStatus.Suggested);
    } finally {
      setUpdatingSuggestionId(null);
    }
  };

  useEffect(() => {
    if (contractId && token) {
      const fetchContractData = async () => {
        try {
          setLoading(true);
          // Fetch contract and predictions in parallel
          const [contractData, predictionData] = await Promise.all([
            getContractById(contractId as string, token),
            getContractPredictions(contractId as string, token)
          ]);
          setContract(contractData);
          setPredictions(predictionData);
        } catch (err) {
          setError('Failed to load contract data.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchContractData();
    }
  }, [contractId, token]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!contract) return <div className="p-8">Contract not found.</div>;

  const latestVersion = contract.versions && contract.versions.length > 0
    ? contract.versions[contract.versions.length - 1]
    : null;
  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">{contract.filename}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content area */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Contract Details</h2>
            {/* Placeholder for other contract details, versions, suggestions, etc. */}
            <p>Status: {contract.negotiation_status}</p>
            {latestVersion && <p>Version: {latestVersion.version_number} ({latestVersion.version_status})</p>}
            <p>Created: {new Date(contract.created_at).toLocaleDateString()}</p>

            {/* Conditionally render the review component */}
            {latestVersion && latestVersion.version_status === VersionStatus.PendingApproval && (
              <AutonomousRedlineReview
                suggestions={latestVersion.suggestions}
                onApprove={(id) => handleSuggestionAction(id, 'accepted')}
                onReject={(id) => handleSuggestionAction(id, 'rejected')}
              />
            )}
          </div>
        </div>

        {/* Sidebar with predictions */}
        <div className="lg:col-span-1">
          {predictions && <PredictionInsights predictions={predictions} />}
        </div>
      </div>
    </div>
  );
}
