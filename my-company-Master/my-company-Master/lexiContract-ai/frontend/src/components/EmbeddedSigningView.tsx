'use client';

import { X } from 'lucide-react';

interface EmbeddedSigningViewProps {
  url: string;
  onClose: () => void;
}

export default function EmbeddedSigningView({ url, onClose }: EmbeddedSigningViewProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col z-50 animate-fade-in">
      <div className="w-full bg-gray-800 p-4 flex justify-end shadow-md">
        <button onClick={onClose} className="text-gray-300 hover:text-white">
          <X className="h-6 w-6" />
          <span className="sr-only">Close Signing View</span>
        </button>
      </div>
      <div className="flex-grow bg-gray-700">
        <iframe
          src={url}
          className="w-full h-full border-0"
          title="DocuSign Embedded Signing Ceremony"
          allow="camera; microphone"
        />
      </div>
    </div>
  );
}