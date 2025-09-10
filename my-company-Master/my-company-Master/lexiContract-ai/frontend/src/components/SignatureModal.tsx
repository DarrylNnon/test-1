 +// /workspaces/test-1/my-company-Master/my-company-Master/lexiContract-ai/frontend/src/components/SignatureModal.tsx
'use client';

import React, { useState } from 'react';
import { Contract, SignatureStatus } from '@/types';
import { X, Send } from 'lucide-react';

interface SignatureModalProps {
  contract: Contract;
  onClose: () => void;
  onSignatureSent: (updatedContract: Contract) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ contract, onClose, onSignatureSent }) => {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signers, setSigners] = useState([{ name: '', email: '' }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setError(null);
    console.log('Initiating signature for:', contract.id, 'with signers:', signers);
    // This is where you would call your API, e.g., initiateSignature(contract.id, signers);
    // For now, we'll simulate an API call and update.
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const updatedContract: Contract = { ...contract, signature_status: SignatureStatus.Sent };
      onSignatureSent(updatedContract);
    } catch (err) {
      setError('Failed to send for signature. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold mb-4">Send for Signature</h2>
        <p className="mb-4 text-gray-600 dark:text-gray-300">Configure recipients for <span className="font-semibold">{contract.filename}</span>.</p>
        <form onSubmit={handleSubmit}>
          {/* A simple form to add signers would go here */}
          <div className="space-y-2">
            <p className="font-medium">Recipients</p>
            <div className="text-sm p-3 bg-gray-100 dark:bg-gray-700 rounded">
              This is a placeholder for the signer configuration UI.
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="mt-6">
            <button
              type="submit"
              disabled={isSending}
              className="w-full flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? 'Sending...' : 'Send for Signature'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};