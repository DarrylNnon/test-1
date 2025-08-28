'use client';

import { useState } from 'react';
import { Signer } from '@/types';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (signers: Signer[]) => Promise<void>;
  isSending: boolean;
}

export default function SignatureModal({ isOpen, onClose, onSubmit, isSending }: SignatureModalProps) {
  const [signers, setSigners] = useState<Signer[]>([{ name: '', email: '' }]);

  const handleSignerChange = (index: number, field: keyof Omit<Signer, 'id'>, value: string) => {
    const newSigners = [...signers];
    newSigners[index] = { ...newSigners[index], [field]: value };
    setSigners(newSigners);
  };

  const addSigner = () => {
    setSigners([...signers, { name: '', email: '' }]);
  };

  const removeSigner = (index: number) => {
    const newSigners = signers.filter((_, i) => i !== index);
    setSigners(newSigners);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validSigners = signers.filter(s => s.name.trim() && s.email.trim());
    if (validSigners.length > 0) {
      onSubmit(validSigners);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Send for Signature</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {signers.map((signer, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 border rounded-md bg-gray-50">
                <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input type="text" placeholder="Signer Name" value={signer.name} onChange={(e) => handleSignerChange(index, 'name', e.target.value)} className="w-full p-2 border rounded-md text-sm" required />
                  <input type="email" placeholder="Signer Email" value={signer.email} onChange={(e) => handleSignerChange(index, 'email', e.target.value)} className="w-full p-2 border rounded-md text-sm" required />
                </div>
                {signers.length > 1 && ( <button type="button" onClick={() => removeSigner(index)} className="text-red-500 hover:text-red-700 font-bold text-xl p-1">&times;</button> )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addSigner} className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add Another Signer</button>
          <div className="mt-6 flex justify-end space-x-3">
            <button type="button" onClick={onClose} disabled={isSending} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSending || signers.some(s => !s.name.trim() || !s.email.trim())} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50">{isSending ? 'Sending...' : 'Send'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}