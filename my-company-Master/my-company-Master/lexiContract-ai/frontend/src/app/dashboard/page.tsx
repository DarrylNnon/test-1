'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import useSWR, { mutate } from 'swr';
import api from '@/lib/api';
import { Contract } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import GoogleDrivePicker from '@/components/integrations/GoogleDrivePicker';

const fetcher = (url: string) => api.get(url).then(res => res.data);

  const { data: contracts, error, isLoading } = useSWR<Contract[]>('/contracts/', fetcher);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    }
  }, []);

  const handleImportSuccess = () => {
    setIsPickerOpen(false);
    mutate('/contracts/');
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true });

  return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Contracts</h1>
          <div>
            <button
              onClick={() => setIsPickerOpen(true)}
              className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Import from Google Drive
            </button>
            <label htmlFor="file-upload" className="ml-4 cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              {isUploading ? 'Uploading...' : 'Upload Contract'}
            </label>
          </div>
        </div>
      </main>
      <GoogleDrivePicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}

