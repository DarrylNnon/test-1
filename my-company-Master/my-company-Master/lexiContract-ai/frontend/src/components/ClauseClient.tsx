'use client';

import { useState, useEffect, useMemo } from 'react';
import useAuth from '@/hooks/useAuth';
import api from '@/lib/api';
import { Clause, Role } from '@/types';
import ClauseModal from './ClauseModal';

export default function ClauseClient() {
  const { user, token, loading: authLoading } = useAuth();
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClause, setEditingClause] = useState<Clause | null>(null);

  const isAdmin = user?.role === Role.admin;

  useEffect(() => {
    const fetchClauses = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const response = await api.get('/clauses/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setClauses(response.data);
      } catch (err: any) {
        const detail = err.response?.data?.detail || 'Failed to load clauses.';
        setError(detail);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchClauses();
    }
  }, [token, authLoading]);

  const handleOpenModal = (clause: Clause | null = null) => {
    setEditingClause(clause);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClause(null);
  };

  const handleSaveClause = (savedClause: Clause) => {
    if (editingClause) {
      setClauses(clauses.map((c) => (c.id === savedClause.id ? savedClause : c)));
    } else {
      setClauses([savedClause, ...clauses]);
    }
    handleCloseModal();
  };

  const handleDeleteClause = async (clauseId: string) => {
    if (window.confirm('Are you sure you want to delete this clause?')) {
      try {
        await api.delete(`/clauses/${clauseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setClauses(clauses.filter((c) => c.id !== clauseId));
      } catch (err) {
        alert('Failed to delete clause.');
      }
    }
  };

  const filteredClauses = useMemo(() => {
    return clauses.filter(
      (clause) =>
        clause.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clause.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clause.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clauses, searchTerm]);

  if (loading || authLoading) {
    return <div className="text-center p-8">Loading Clause Library...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">Clause Library</h1>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search clauses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {isAdmin && (
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Add Clause
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {filteredClauses.length > 0 ? (
            filteredClauses.map((clause) => (
              <div key={clause.id} className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{clause.title}</h3>
                    {clause.category && (
                      <p className="mt-1 text-sm text-gray-500">
                        Category: <span className="font-semibold">{clause.category}</span>
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex-shrink-0 flex gap-2">
                      <button onClick={() => handleOpenModal(clause)} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">Edit</button>
                      <button onClick={() => handleDeleteClause(clause.id)} className="text-red-600 hover:text-red-900 text-sm font-medium">Delete</button>
                    </div>
                  )}
                </div>
                <div className="mt-4 prose prose-sm max-w-none text-gray-700">
                  <p>{clause.content}</p>
                </div>
                <div className="mt-4 text-xs text-gray-400">
                  <span>Last updated by {clause.created_by.email} on {new Date(clause.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">No Clauses Found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search term.' : 'Admins can add clauses to get started.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <ClauseModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveClause}
          clause={editingClause}
        />
      )}
    </main>
  );
}