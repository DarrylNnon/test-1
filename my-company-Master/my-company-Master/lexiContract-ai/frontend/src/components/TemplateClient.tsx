'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { ContractTemplate } from '@/types';
import TemplateModal from './TemplateModal';

export default function TemplateClient() {
  const { user, token, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!token || !isAdmin) {
        if (!authLoading && !isAdmin) setError("You do not have permission to view this page.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await api.get('/templates/', { headers: { Authorization: `Bearer ${token}` } });
        setTemplates(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load templates.');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchTemplates();
    }
  }, [token, authLoading, isAdmin]);

  const handleOpenModal = (template: ContractTemplate | null = null) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
  };

  const handleSaveTemplate = (savedTemplate: ContractTemplate) => {
    setTemplates(prev => 
      editingTemplate 
        ? prev.map(t => t.id === savedTemplate.id ? savedTemplate : t)
        : [savedTemplate, ...prev]
    );
    handleCloseModal();
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await api.delete(`/templates/${templateId}`, { headers: { Authorization: `Bearer ${token}` } });
        setTemplates(templates.filter((t) => t.id !== templateId));
      } catch (err) {
        alert('Failed to delete template.');
      }
    }
  };

  if (loading || authLoading) return <div className="text-center p-8">Loading...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Contract Template Library</h1>
          <p className="mt-2 text-sm text-gray-700">Manage your organization's reusable contract templates.</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button onClick={() => handleOpenModal()} type="button" className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            Add Template
          </button>
        </div>
      </div>
      <div className="mt-8 space-y-4">
        {templates.length > 0 ? (
          templates.map((template) => (
            <div key={template.id} className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg leading-6 font-medium text-gray-900">{template.title}</h3>
                <div className="flex-shrink-0 flex gap-4">
                  <button onClick={() => handleOpenModal(template)} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">Edit</button>
                  <button onClick={() => handleDeleteTemplate(template.id)} className="text-red-600 hover:text-red-900 text-sm font-medium">Delete</button>
                </div>
              </div>
              <div className="mt-4 prose prose-sm max-w-none text-gray-700">
                <p className="whitespace-pre-wrap">{template.content}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow"><h3 className="text-lg font-medium text-gray-900">No Templates Found</h3><p className="mt-1 text-sm text-gray-500">Add your first contract template to get started.</p></div>
        )}
      </div>
      <TemplateModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveTemplate} template={editingTemplate} />
    </div>
  );
}