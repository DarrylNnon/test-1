'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import api from '@/lib/api';

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

interface GoogleDrivePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function GoogleDrivePicker({ isOpen, onClose, onImportSuccess }: GoogleDrivePickerProps) {
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  const fetchFiles = useCallback(async (token?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append('q', debouncedSearchTerm);
      if (token) params.append('page_token', token);

      const response = await api.get(`/integrations/google-drive/files?${params.toString()}`);
      setFiles(prev => token ? [...prev, ...response.data.files] : response.data.files);
      setNextPageToken(response.data.nextPageToken || null);
    } catch (err) {
      setError('Failed to load files from Google Drive. Please ensure it is connected in your settings.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen, fetchFiles]);

  const handleImport = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/integrations/google-drive/import', {
        file_id: selectedFile.id,
        file_name: selectedFile.name,
      });
      onImportSuccess();
    } catch (err) {
      setError('Failed to import the selected file.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50" onClick={onClose}>
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Import from Google Drive</h3>
          <div className="mt-2">
            <input
              type="text"
              placeholder="Search your files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="mt-4 h-96 overflow-y-auto border rounded-md">
            {isLoading && !files.length ? <p className="p-4">Loading files...</p> : null}
            {error && <p className="p-4 text-red-500">{error}</p>}
            <ul className="divide-y divide-gray-200">
              {files.map(file => (
                <li
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  className={`p-3 text-left cursor-pointer hover:bg-gray-100 ${selectedFile?.id === file.id ? 'bg-indigo-100' : ''}`}
                >
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    Modified: {new Date(file.modifiedTime).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
            {nextPageToken && (
              <div className="p-2">
                <button onClick={() => fetchFiles(nextPageToken)} className="text-indigo-600 hover:text-indigo-800 text-sm">
                  Load more...
                </button>
              </div>
            )}
          </div>
          <div className="items-center px-4 py-3">
            <button
              onClick={handleImport}
              disabled={!selectedFile || isLoading}
              className="px-4 py-2 bg-indigo-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-400"
            >
              {isLoading ? 'Importing...' : 'Import Selected File'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}