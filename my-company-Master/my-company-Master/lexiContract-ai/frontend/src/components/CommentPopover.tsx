'use client';

import { useState } from 'react';

interface CommentPopoverProps {
  top: number;
  left: number;
  onSubmit: (commentText: string) => void;
  onClose: () => void;
}

export default function CommentPopover({ top, left, onSubmit, onClose }: CommentPopoverProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim());
    }
  };

  return (
    <div
      className="absolute z-10 w-64 rounded-md border border-gray-300 bg-white shadow-lg"
      style={{ top, left }}
    >
      <form onSubmit={handleSubmit} className="p-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          rows={3}
          autoFocus
        />
        <div className="mt-2 flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={!text.trim()} className="rounded-md border border-transparent bg-indigo-600 px-3 py-1 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}