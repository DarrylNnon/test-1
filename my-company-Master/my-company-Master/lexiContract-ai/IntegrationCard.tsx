'use client';

interface IntegrationCardProps {
  name: string;
  description: string;
  isConnected: boolean;
  connectUrl?: string;
  onDisconnect: () => void;
}

export default function IntegrationCard({ name, description, isConnected, connectUrl, onDisconnect }: IntegrationCardProps) {
  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">{name}</h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>{description}</p>
        </div>
        <div className="mt-5">
          {isConnected ? (
            <button
              type="button"
              onClick={onDisconnect}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
            >
              Disconnect
            </button>
          ) : (
            <a
              href={connectUrl}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
            >
              Connect
            </a>
          )}
        </div>
      </div>
    </div>
  );
}