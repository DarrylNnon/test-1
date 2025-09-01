import { listApiKeys } from '@/lib/api';
import ApiKeyManager from '@/components/ApiKeyManager';
import { cookies } from 'next/headers';

async function fetchApiKeys() {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) {
    return [];
  }
  try {
    return await listApiKeys(token);
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
    return [];
  }
}

export default async function ApiKeysPage() {
  const initialKeys = await fetchApiKeys();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">API Keys</h1>
          <p className="mt-2 text-sm text-gray-700">Manage API keys for programmatic access to the LexiContract AI platform.</p>
        </div>
      </div>
      <div className="mt-8">
        <ApiKeyManager initialKeys={initialKeys} />
      </div>
    </div>
  );
}