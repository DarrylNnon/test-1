'use client';

import { useState } from 'react';
import { Contract, SignatureStatus } from '@/types';
import SignatureModal from './SignatureModal';
import { Send, CheckCircle, Clock, XCircle } from 'lucide-react';

interface SignatureManagementPanelProps {
  contract: Contract;
  onUpdate: (updatedContract: Contract) => void;
}

const StatusInfo = {
  [SignatureStatus.Draft]: {
    icon: Clock,
    text: 'Draft',
    description: 'The signature request has not been sent yet.',
    buttonText: 'Send for Signature',
    color: 'gray',
  },
  [SignatureStatus.Sent]: {
    icon: Send,
    text: 'Sent for Signature',
    description: 'The document has been sent to all signers.',
    buttonText: 'View Status',
    color: 'blue',
  },
  [SignatureStatus.Completed]: {
    icon: CheckCircle,
    text: 'Completed',
    description: 'All parties have signed the document.',
    buttonText: 'View Signed Document',
    color: 'green',
  },
  [SignatureStatus.Voided]: {
    icon: XCircle,
    text: 'Voided',
    description: 'The signature request has been voided.',
    buttonText: null,
    color: 'red',
  },
};

export default function SignatureManagementPanel({ contract, onUpdate }: SignatureManagementPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const statusInfo = StatusInfo[contract.signature_status] || StatusInfo[SignatureStatus.Draft];
  const Icon = statusInfo.icon;

  const handleSignatureSent = (updatedContract: Contract) => {
    onUpdate(updatedContract);
    setIsModalOpen(false);
  };

  return (
    <>
      <div className={`rounded-lg border border-${statusInfo.color}-300 bg-${statusInfo.color}-50 p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Icon className={`h-5 w-5 text-${statusInfo.color}-500`} aria-hidden="true" />
            <div className="ml-3">
              <p className={`text-sm font-medium text-${statusInfo.color}-800`}>{statusInfo.text}</p>
              <p className={`mt-1 text-sm text-${statusInfo.color}-700`}>{statusInfo.description}</p>
            </div>
          </div>
          {statusInfo.buttonText && <button onClick={() => setIsModalOpen(true)} type="button" className="ml-4 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">{statusInfo.buttonText}</button>}
        </div>
      </div>
      {isModalOpen && <SignatureModal contract={contract} onClose={() => setIsModalOpen(false)} onSignatureSent={handleSignatureSent} />}
    </>
  );
}