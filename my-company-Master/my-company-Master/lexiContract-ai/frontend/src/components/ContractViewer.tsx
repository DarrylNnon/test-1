'use client';

import React from 'react';
import { ContractVersion } from '@/types';

interface ContractViewerProps {
  version: ContractVersion;
}

const ContractViewer = ({ version }: ContractViewerProps) => {
  // This is a simplified viewer. A real implementation would render highlights and comments inline.
  return (
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-2 bg-white p-6 shadow rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Contract Text (Version {version.version_number})</h3>
        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{version.full_text || 'No text available.'}</pre>
      </div>
      <div className="col-span-1 space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">AI Suggestions</h3>
          {version.suggestions.length > 0 ? (
            <ul className="space-y-3">
              {version.suggestions.map(suggestion => (
                <li key={suggestion.id} className="bg-gray-50 p-3 rounded-md border border-gray-200">
                  <p className="text-sm font-semibold text-gray-800">{suggestion.risk_category}</p>
                  <p className="text-sm text-gray-600 mt-1">{suggestion.comment}</p>
                  <p className="text-xs text-gray-500 mt-2">Original: "{suggestion.original_text}"</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No suggestions for this version.</p>
          )}
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">User Comments</h3>
          {version.comments.length > 0 ? (
             <ul className="space-y-3">
              {version.comments.map(comment => (
                <li key={comment.id} className="bg-blue-50 p-3 rounded-md border border-blue-200">
                  <p className="text-sm text-gray-600">{comment.comment_text}</p>
                  <p className="text-xs text-gray-500 mt-2">By: {comment.author.email} at {new Date(comment.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No comments for this version.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractViewer;