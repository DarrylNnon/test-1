'use client';

import { useState } from 'react';
import { Contract, SignatureStatus } from '@/types';
import SignatureModal from './SignatureModal';
import { Send, CheckCircle, Clock } from 'lucide-react';

interface SignatureManagementPanelProps {
  initialContract: Contract;
}

export default function SignatureManagementPanel({ initialContract }: SignatureManagementPanelProps) {
  const [contract, setContract] = useState<Contract>(initialContract);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSignatureSent = (updatedContract: Contract) => {
    setContract(updatedContract);
    setIsModalOpen(false);
  };

  const getStatusDisplay = () => {
    switch (contract.signature_status) {
      case SignatureStatus.Sent:
        return { icon: <Clock className="h-5 w-5 text-blue-500" />, text: 'Signature request sent', color: 'text-blue-700' };
      case SignatureStatus.Completed:
        return { icon: <CheckCircle className="h-5 w-5 text-green-500" />, text: 'Contract signed and completed', color: 'text-green-700' };
      default:
        return { icon: <Send className="h-5 w-5 text-gray-500" />, text: 'Ready to send for signature', color: 'text-gray-700' };
    }
  };

  const { icon, text, color } = getStatusDisplay();

  return (
    <>
      <div className="bg-gray-50 p-4 rounded-lg border">
        <h3 className="font-semibold text-lg mb-3">E-Signature</h3>
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-2 ${color}`}>
            {icon}
            <span className="font-medium">{text}</span>
          </div>
          {contract.signature_status === SignatureStatus.Draft && (
            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Send for Signature</button>
          )}
        </div>
      </div>
      {isModalOpen && <SignatureModal contractId={contract.id} contractFilename={contract.filename} onClose={() => setIsModalOpen(false)} onSignatureSent={handleSignatureSent} />}
    </>
  );
}