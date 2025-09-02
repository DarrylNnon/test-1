"use client";

import { useState, useEffect, FormEvent } from 'react';
import { Clause } from '@/types';

interface ClauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clauseData: Omit<Clause, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => void;
  clause?: Clause | null;
}

export default function ClauseModal({ isOpen, onClose, onSave, clause }: ClauseModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (clause) {
      setTitle(clause.title);
      setContent(clause.content);
      setCategory(clause.category);
    } else {
      setTitle('');
      setContent('');
      setCategory('');
    }
  }, [clause, isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ title, content, category });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">{clause ? 'Edit Clause' : 'Add New Clause'}</h3>
          <form onSubmit={handleSubmit} className="mt-2 px-7 py-3 space-y-4 text-left">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
              <input type="text" name="title" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
              <input type="text" name="category" id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
              <textarea id="content" name="content" rows={10} value={content} onChange={(e) => setContent(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
            </div>
            <div className="items-center px-4 py-3 text-right">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2 hover:bg-gray-300">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                Save Clause
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}