'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
// NOTE: The following API functions would need to be added to a file like `lib/api.ts`
// import { getDeveloperApps, createDeveloperApp } from '@/lib/api';

// --- Mock API functions for demonstration ---
interface DeveloperApp {
  id: string;
  name: string;
  description: string;
  client_id: string;
  status: string;
  redirect_uris: string[];
}
interface NewDeveloperApp {
  name: string;
  description: string;
  redirect_uris: string[];
}
interface AppWithSecret extends DeveloperApp {
  client_secret: string;
}

const getDeveloperApps = async (token: string): Promise<DeveloperApp[]> => {
  console.log('Fetching developer apps...');
  // Real implementation: const response = await api.get('/developer/apps', { headers: { Authorization: `Bearer ${token}` } }); return response.data;
  return Promise.resolve([
    { id: 'app_1', name: 'My First App', description: 'A test integration for pulling contract data.', client_id: 'lc_client_abc123xyz', status: 'development', redirect_uris: ['http://localhost:8080/callback'] },
    { id: 'app_2', name: 'Internal Reporting Tool', description: 'Pulls data for our internal reports.', client_id: 'lc_client_def456uvw', status: 'development', redirect_uris: ['https://my-tool.com/oauth'] },
  ]);
};

const createDeveloperApp = async (appData: NewDeveloperApp, token: string): Promise<AppWithSecret> => {
  console.log('Creating developer app:', appData);
  // Real implementation: const response = await api.post('/developer/apps', appData, { headers: { Authorization: `Bearer ${token}` } }); return response.data;
  return Promise.resolve({
    id: `app_${Math.random().toString(36).substring(7)}`,
    ...appData,
    client_id: `lc_client_${Math.random().toString(36).substring(7)}`,
    status: 'development',
    client_secret: `lc_sec_${Math.random().toString(36).substring(2)}`,
  });
};
// --- End Mock API functions ---


export default function DeveloperPortalPage() {
  const { token } = useAuth();
  const [apps, setApps] = useState<DeveloperApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newApp, setNewApp] = useState<NewDeveloperApp>({ name: '', description: '', redirect_uris: [] });
  const [secretDisplay, setSecretDisplay] = useState<AppWithSecret | null>(null);

  useEffect(() => {
    if (token) {
      setIsLoading(true);
      getDeveloperApps(token)
        .then(setApps)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [token]);

  const handleCreateApp = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const createdApp = await createDeveloperApp(newApp, token);
      setApps(prev => [...prev, createdApp]);
      setSecretDisplay(createdApp);
      setIsCreateModalOpen(false);
      setNewApp({ name: '', description: '', redirect_uris: [] });
    } catch (error) {
      console.error('Failed to create app:', error);
      // TODO: Add user-facing error handling
    }
  };

  const handleRedirectURIsChange = (value: string) => {
    const uris = value.split('\n').map(uri => uri.trim()).filter(Boolean);
    setNewApp(prev => ({ ...prev, redirect_uris: uris }));
  };

  if (!token) {
    return <div>Please log in to access the Developer Portal.</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Developer Portal</h1>
          <p className="text-gray-500">Manage your applications and API credentials.</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Create New App
        </button>
      </div>

      {isLoading ? <p>Loading applications...</p> : (
        <div className="bg-white rounded-lg shadow">
          <ul className="divide-y divide-gray-200">
            {apps.map(app => (
              <li key={app.id} className="p-6 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-lg">{app.name}</p>
                  <p className="text-sm text-gray-500">{app.description}</p>
                  <p className="text-sm text-gray-400 mt-2 font-mono">Client ID: {app.client_id}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800`}>
                    {app.status}
                  </span>
                  <button className="text-sm text-blue-600 hover:underline">Manage</button>
                </div>
              </li>
            ))}
          </ul>
          {apps.length === 0 && <p className="p-6 text-gray-500">You haven't created any applications yet.</p>}
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Create New Application</h2>
            <form onSubmit={handleCreateApp} className="space-y-4">
              <input type="text" placeholder="Application Name" value={newApp.name} onChange={e => setNewApp(p => ({...p, name: e.target.value}))} required className="w-full p-2 border rounded"/>
              <textarea placeholder="Description" value={newApp.description} onChange={e => setNewApp(p => ({...p, description: e.target.value}))} className="w-full p-2 border rounded"/>
              <textarea placeholder="Redirect URIs (one per line)" value={newApp.redirect_uris.join('\n')} onChange={e => handleRedirectURIsChange(e.target.value)} className="w-full p-2 border rounded font-mono text-sm"/>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 rounded-md border">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white">Create App</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {secretDisplay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Application Created</h2>
            <p className="text-sm text-gray-600 mb-4">Store your Client Secret securely. You will not see it again.</p>
            <div className="bg-gray-100 p-4 rounded-lg space-y-3">
              <div><p className="text-xs font-semibold text-gray-500">CLIENT ID</p><p className="font-mono bg-white p-2 rounded">{secretDisplay.client_id}</p></div>
              <div><p className="text-xs font-semibold text-gray-500">CLIENT SECRET</p><p className="font-mono bg-white p-2 rounded text-red-600">{secretDisplay.client_secret}</p></div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setSecretDisplay(null)} className="px-4 py-2 rounded-md bg-blue-600 text-white">I have copied my secret</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
