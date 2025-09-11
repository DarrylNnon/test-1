'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { ContractTemplate } from '@/types';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: ContractTemplate) => void;
  template: ContractTemplate | null;
}

export default function TemplateModal({ isOpen, onClose, onSave, template }: TemplateModalProps) {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      setTitle(template.title);
      setDescription(template.description || '');
      setCategory(template.category || '');
      setContent(template.content);
    } else {
      setTitle('');
      setDescription('');
      setCategory('');
      setContent('');
    }
    setError(null);
  }, [template, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const templateData = { title, description, category, content };

    try {
      const response = template
        ? await api.patch(`/templates/${template.id}`, templateData, { headers: { Authorization: `Bearer ${token}` } })
        : await api.post('/templates/', templateData, { headers: { Authorization: `Bearer ${token}` } });
      onSave(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">{template ? 'Edit Contract Template' : 'Add New Contract Template'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
            <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
          </div>
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">{'Content (Use `{{variable_name}}` for placeholders)'}</label>
            <textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} required rows={10} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"/>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">{loading ? 'Saving...' : 'Save Template'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}