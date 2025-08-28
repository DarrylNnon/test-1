'use client';

import { useState, useEffect, useMemo } from 'react';
import useAuth from '@/hooks/useAuth';
import api from '@/lib/api';
import { ContractTemplate, Role } from '@/types';
import TemplateModal from './TemplateModal';

export default function TemplateClient() {
  const { user, token, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);

  const isAdmin = user?.role === Role.admin;

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const response = await api.get('/templates/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTemplates(response.data);
      } catch (err: any) {
        const detail = err.response?.data?.detail || 'Failed to load templates.';
        setError(detail);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchTemplates();
    }
  }, [token, authLoading]);

  const handleOpenModal = (template: ContractTemplate | null = null) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
  };

  const handleSaveTemplate = (savedTemplate: ContractTemplate) => {
    if (editingTemplate) {
      setTemplates(templates.map((t) => (t.id === savedTemplate.id ? savedTemplate : t)));
    } else {
      setTemplates([savedTemplate, ...templates]);
    }
    handleCloseModal();
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await api.delete(`/templates/${templateId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTemplates(templates.filter((t) => t.id !== templateId));
      } catch (err) {
        alert('Failed to delete template.');
      }
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(
      (template) =>
        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [templates, searchTerm]);

  if (loading || authLoading) {
    return <div className="text-center p-8">Loading Contract Templates...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  }

  if (!isAdmin) {
    return (
      <div className="text-center p-8 text-red-500">
        You do not have permission to view this page. Only administrators can manage templates.
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">Contract Templates</h1>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Add Template
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map((template) => (
              <div key={template.id} className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{template.title}</h3>
                    {template.category && (
                      <p className="mt-1 text-sm text-gray-500">
                        Category: <span className="font-semibold">{template.category}</span>
                      </p>
                    )}
                    {template.description && (
                      <p className="mt-1 text-sm text-gray-500">{template.description}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex gap-2">
                    <button onClick={() => handleOpenModal(template)} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">Edit</button>
                    <button onClick={() => handleDeleteTemplate(template.id)} className="text-red-600 hover:text-red-900 text-sm font-medium">Delete</button>
                  </div>
                </div>
                <div className="mt-4 prose prose-sm max-w-none text-gray-700">
                  <p className="whitespace-pre-wrap">{template.content}</p>
                </div>
                <div className="mt-4 text-xs text-gray-400">
                  <span>Last updated by {template.created_by.email} on {new Date(template.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">No Templates Found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search term.' : 'Add your first contract template to get started.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <TemplateModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveTemplate}
          template={editingTemplate}
        />
      )}
    </main>
  );
}