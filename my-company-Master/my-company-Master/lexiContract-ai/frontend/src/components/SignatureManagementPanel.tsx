 +// /workspaces/test-1/my-company-Master/my-company-Master/lexiContract-ai/frontend/src/components/SignatureManagementPanel.tsx
'use client';

import { useState } from 'react';
import { Contract } from '@/types';
import { SignatureModal } from './SignatureModal';

interface SignatureManagementPanelProps {
  contract: Contract;
  onContractUpdate: (updatedContract: Contract) => void;
}

export const SignatureManagementPanel: React.FC<SignatureManagementPanelProps> = ({ contract, onContractUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSignatureSent = (updatedContract: Contract) => {
    onContractUpdate(updatedContract);
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow mt-6">
        <h3 className="text-lg font-semibold mb-4">E-Signature</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
            <p className="font-medium capitalize">{contract.signature_status || 'Not Sent'}</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Initiate Signature
          </button>
        </div>
      </div>
      {isModalOpen && <SignatureModal contract={contract} onClose={() => setIsModalOpen(false)} onSignatureSent={handleSignatureSent} />}
    </>
  );
}