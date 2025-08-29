'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Contract, ContractVersion } from '@/types';
import VersionSelector from '@/components/VersionSelector';
import ContractViewer from '@/components/ContractViewer';
import VersionDiffViewer from '@/components/VersionDiffViewer';

export default function NegotiationRoomPage() {
  const params = useParams();
  const contractId = params.contractId as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);
  const [diffText, setDiffText] = useState<string | null>(null);
  const [isDiffLoading, setIsDiffLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractId) return;

    const fetchContract = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/contracts/${contractId}`);
        const fetchedContract: Contract = response.data;
        setContract(fetchedContract);

        // Default to the latest version
        if (fetchedContract.versions && fetchedContract.versions.length > 0) {
          const latestVersion = fetchedContract.versions.sort((a, b) => b.version_number - a.version_number)[0];
          setSelectedVersionId(latestVersion.id);
          setCompareVersionId(latestVersion.id); // Initialize compare version as well
        }
      } catch (err) {
        setError('Failed to load contract. It may not exist or you may not have permission to view it.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [contractId]);

  useEffect(() => {
    if (!compareMode || !selectedVersionId || !compareVersionId || selectedVersionId === compareVersionId) {
      setDiffText(null);
      return;
    }

    const fetchDiff = async () => {
      try {
        setIsDiffLoading(true);
        const response = await api.get(`/contracts/${contractId}/diff`, {
          params: {
            from_version_id: selectedVersionId,
            to_version_id: compareVersionId,
          },
          responseType: 'text', // Expect plain text from the diff endpoint
        });
        setDiffText(response.data);
      } catch (err) {
        console.error("Failed to fetch diff", err);
        setDiffText("Error: Could not load comparison.");
      } finally {
        setIsDiffLoading(false);
      }
    };

    fetchDiff();
  }, [compareMode, selectedVersionId, compareVersionId, contractId]);

  const selectedVersion = contract?.versions.find(v => v.id === selectedVersionId);

  const toggleCompareMode = () => {
    const newMode = !compareMode;
    setCompareMode(newMode);
    if (!newMode) setDiffText(null); // Clear diff when exiting compare mode
  };

  return (
    <div className="py-10">
      <header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {contract && <h1 className="text-3xl font-bold leading-tight text-gray-900">{contract.filename}</h1>}
          <p className="text-sm text-gray-500 mt-1">Negotiation Room</p>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="px-4 py-8 sm:px-0">
            {loading && <div className="text-center p-6">Loading contract...</div>}
            {error && <div className="text-center p-6 text-red-500">{error}</div>}
            {contract && (
              <div className="space-y-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {compareMode ? 'Compare Versions' : `Viewing Version ${selectedVersion?.version_number}`}
                  </h2>
                  <button
                    onClick={toggleCompareMode}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {compareMode ? 'Exit Compare Mode' : 'Compare Versions'}
                  </button>
                </div>

                {compareMode ? (
                  <div className="grid grid-cols-2 gap-4">
                    <VersionSelector versions={contract.versions} selectedVersionId={selectedVersionId!} onVersionChange={setSelectedVersionId} />
                    <VersionSelector versions={contract.versions} selectedVersionId={compareVersionId!} onVersionChange={setCompareVersionId} />
                  </div>
                ) : (
                  selectedVersion && <VersionSelector versions={contract.versions} selectedVersionId={selectedVersion.id} onVersionChange={setSelectedVersionId} />
                )}

                {compareMode ? (
                  isDiffLoading ? <div className="text-center p-6">Loading comparison...</div> : <VersionDiffViewer diffText={diffText!} />
                ) : (
                  selectedVersion ? <ContractViewer version={selectedVersion} /> : <div className="text-center p-6">Select a version to view.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}