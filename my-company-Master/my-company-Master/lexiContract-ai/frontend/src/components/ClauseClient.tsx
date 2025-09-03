"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Clause, ClausePayload } from '@/types';
import ClauseModal from './ClauseModal';

const ClauseClient = () => {
  const { user } = useAuth();
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchClauses = async () => {
      try {
        setLoading(true);
        const response = await api.get('/clauses/');
        setClauses(response.data);
      } catch (err) {
        setError('Failed to load clauses.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClauses();
  }, []);

  const handleSaveClause = async (clauseData: ClausePayload) => {
    try {
      if (selectedClause) {
        const response = await api.put(`/clauses/${selectedClause.id}`, clauseData);
        setClauses(clauses.map(c => c.id === selectedClause.id ? response.data : c));
      } else {
        const response = await api.post('/clauses/', clauseData);
        setClauses([...clauses, response.data]);
      }
      setIsModalOpen(false);
      setSelectedClause(null);
    } catch (err: any) {
      console.error('Failed to save clause', err);
      alert(err.response?.data?.detail || 'Could not save the clause.');
    }
  };

  const openAddModal = () => {
    setSelectedClause(null);
    setIsModalOpen(true);
  };

  const openEditModal = (clause: Clause) => {
    setSelectedClause(clause);
    setIsModalOpen(true);
  };

  const filteredClauses = useMemo(() => {
    return clauses.filter(clause =>
      clause.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clause.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      // Add a null check for the optional category field
        (clause.category && clause.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [clauses, searchTerm]);

  const isAdmin = user?.role === 'admin';

  if (loading) return <div>Loading clause library...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <input type="text" placeholder="Search clauses..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        {isAdmin && (
          <button onClick={openAddModal} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
            Add New Clause
          </button>
        )}
      </div>

      <ClauseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveClause} clause={selectedClause} />

      <div className="space-y-4">
        {filteredClauses.map(clause => (
          <div key={clause.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{clause.title}</h3>
                <p className="text-sm text-gray-500">{clause.category}</p>
              </div>
              {isAdmin && (<button onClick={() => openEditModal(clause)} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Edit</button>)}
            </div>
            <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{clause.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClauseClient;