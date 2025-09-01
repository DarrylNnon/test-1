'use client';

import { Signer, SignerStatus } from '@/types';
import { CheckCircle, Clock, Mail, AlertCircle, UserCheck } from 'lucide-react';

interface SignatureStatusTrackerProps {
  signers: Signer[];
}

const statusInfo = {
  [SignerStatus.Signed]: { icon: <CheckCircle className="h-5 w-5 text-green-500" />, text: 'Signed', color: 'text-green-600' },
  [SignerStatus.Sent]: { icon: <Mail className="h-5 w-5 text-blue-500" />, text: 'Sent', color: 'text-blue-600' },
  [SignerStatus.Delivered]: { icon: <UserCheck className="h-5 w-5 text-cyan-500" />, text: 'Viewed', color: 'text-cyan-600' },
  [SignerStatus.Declined]: { icon: <AlertCircle className="h-5 w-5 text-red-500" />, text: 'Declined', color: 'text-red-600' },
  [SignerStatus.Created]: { icon: <Clock className="h-5 w-5 text-gray-400" />, text: 'Pending', color: 'text-gray-500' },
};

export default function SignatureStatusTracker({ signers }: SignatureStatusTrackerProps) {
  if (!signers || signers.length === 0) {
    return null;
  }

  const sortedSigners = [...signers].sort((a, b) => a.signing_order - b.signing_order);

  return (
    <div className="mt-4">
      <h4 className="text-md font-semibold text-gray-700 mb-3">Signature Status</h4>
      <ul className="space-y-3">
        {sortedSigners.map((signer) => {
          const { icon, text, color } = statusInfo[signer.status] || statusInfo[SignerStatus.Created];
          return (
            <li key={signer.id} className="flex items-center justify-between p-3 bg-white border rounded-md">
              <div className="flex items-center space-x-3">
                <span className="font-bold text-gray-500">{signer.signing_order}.</span>
                <div>
                  <p className="font-medium text-gray-800">{signer.name}</p>
                  <p className="text-sm text-gray-500">{signer.email}</p>
                </div>
              </div>
              <div className={`flex items-center space-x-2 text-sm font-medium ${color}`}>
                {icon}
                <span>{text}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}