'use client';

import { ContractVersion } from '@/types';

interface VersionSelectorProps {
  versions: ContractVersion[];
  selectedVersionId: string;
  onVersionChange: (versionId: string) => void;
}

const VersionSelector = ({ versions, selectedVersionId, onVersionChange }: VersionSelectorProps) => {
  return (
    <div className="mb-4">
      <label htmlFor="version-select" className="block text-sm font-medium text-gray-700">
        Contract Version
      </label>
      <select
        id="version-select"
        name="version"
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        value={selectedVersionId}
        onChange={(e) => onVersionChange(e.target.value)}
      >
        {versions.map((version) => (
          <option key={version.id} value={version.id}>
            Version {version.version_number} (Uploaded: {new Date(version.created_at).toLocaleString()})
          </option>
        ))}
      </select>
    </div>
  );
};

export default VersionSelector;