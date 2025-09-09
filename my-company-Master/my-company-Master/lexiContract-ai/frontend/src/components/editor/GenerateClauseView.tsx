'use client';

import { useState, FormEvent } from 'react';

interface GenerateClauseViewProps {
  onClose: () => void;
  onGenerate: (prompt: string) => Promise<void>;
}

export default function GenerateClauseView({ onClose, onGenerate }: GenerateClauseViewProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await onGenerate(prompt);
    } catch (err) {
      setError('Failed to generate clause. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Generate New Clause</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <label htmlFor="clause-prompt" className="block text-sm font-medium text-gray-700">Describe the clause you want to create:</label>
            <textarea id="clause-prompt" rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., 'A standard confidentiality clause for a mutual NDA, lasting 5 years.'"/>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <div className="mt-6 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
            <button type="submit" disabled={loading || !prompt.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">{loading ? 'Generating...' : 'Generate'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
