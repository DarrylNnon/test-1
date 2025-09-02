"use client";

import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, CheckCircle, XCircle, Loader, ExternalLink } from 'lucide-react';
import GoogleDrivePicker from '../../components/GoogleDrivePicker';

// In a real app, these would be in a dedicated api client file (e.g., lib/api.ts)
const mockApi = {
  getContracts: async (token: string) => {
    console.log('Fetching contracts with token:', token);
    // Mock implementation
    return [
      { id: '1', filename: 'MSA_Vendor_A.pdf', analysis_status: 'completed', created_at: new Date().toISOString() },
      { id: '2', filename: 'NDA_Partner_B.docx', analysis_status: 'in_progress', created_at: new Date().toISOString() },
      { id: '3', filename: 'SOW_Project_C.pdf', analysis_status: 'pending', created_at: new Date().toISOString() },
    ];
  },
  uploadContract: async (file: File, token: string) => {
    console.log('Uploading contract:', file.name);
    // Mock implementation
    const newContract = { id: Date.now().toString(), filename: file.name, analysis_status: 'pending', created_at: new Date().toISOString() };
    return newContract;
  }
};


export default function DashboardPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const router = useRouter();

  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    try {
      // In a real app, the token would come from an auth context
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        // router.push('/login');
        console.log("No token found. This is a mock dashboard.");
      }
      const data = await mockApi.getContracts(token || '');
      setContracts(data);
    } catch (err) {
      setError('Failed to fetch contracts.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    setError(null);
    const file = acceptedFiles[0];

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) throw new Error("Authentication required.");

      const newContract = await mockApi.uploadContract(file, token);
      setContracts(prev => [newContract, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true
  });

  const handleImportSuccess = () => {
    setIsPickerOpen(false);
    fetchContracts(); // Refresh contract list after import
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800"><CheckCircle className="mr-1 h-4 w-4" /> Completed</span>;
      case 'in_progress':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800"><Loader className="mr-1 h-4 w-4 animate-spin" /> In Progress</span>;
      case 'failed':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800"><XCircle className="mr-1 h-4 w-4" /> Failed</span>;
      default:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Pending</span>;
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsPickerOpen(true)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Import from Google Drive
          </button>
          <button
            onClick={open}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Upload Contract
          </button>
        </div>
      </div>

      {isPickerOpen && (
        <GoogleDrivePicker
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onImportSuccess={handleImportSuccess}
        />
      )}

      <div {...getRootProps({className: `p-10 border-2 border-dashed rounded-lg text-center ${isDragActive ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`})}>
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? "Drop the files here ..." : "Drag 'n' drop a contract here, or click 'Upload Contract'"}
        </p>
        {uploading && <p className="text-sm text-indigo-600 mt-2">Uploading...</p>}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>
    </div>
  );
}