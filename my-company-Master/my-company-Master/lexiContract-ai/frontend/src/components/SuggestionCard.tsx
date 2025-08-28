'use client';

import { AnalysisSuggestion, SuggestionStatus } from '@/types';

interface SuggestionCardProps {
  suggestion: AnalysisSuggestion;
  onHover: (suggestionId: string | null) => void;
  onStatusChange: (suggestionId: string, newStatus: SuggestionStatus) => void;
}

const getStatusClasses = (status: SuggestionStatus) => {
  switch (status) {
    case SuggestionStatus.accepted:
      return {
        border: 'border-green-500',
        bg: 'bg-green-50',
        text: 'text-green-700',
        label: 'Accepted',
      };
    case SuggestionStatus.rejected:
      return {
        border: 'border-red-500',
        bg: 'bg-red-50',
        text: 'text-red-700',
        label: 'Rejected',
      };
    default:
      return {
        border: 'border-yellow-500',
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        label: 'Suggested',
      };
  }
};

export default function SuggestionCard({ suggestion, onHover, onStatusChange }: SuggestionCardProps) {
  const statusInfo = getStatusClasses(suggestion.status);

  return (
    <div
      id={`activity-item-${suggestion.id}`}
      className={`border-l-4 ${statusInfo.border} ${statusInfo.bg} p-4 rounded-md shadow-sm transition-all duration-150`}
      onMouseEnter={() => onHover(suggestion.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-gray-800">{suggestion.risk_category}</h3>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.bg} ${statusInfo.text}`}>
          {statusInfo.label}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{suggestion.comment}</p>
      <div className="text-xs space-y-2">
        <p><strong className="text-red-600">Original:</strong> <span className="font-mono bg-red-100 p-1 rounded">{suggestion.original_text}</span></p>
        {suggestion.suggested_text && (
          <p><strong className="text-green-600">Suggestion:</strong> <span className="font-mono bg-green-100 p-1 rounded">{suggestion.suggested_text}</span></p>
        )}
      </div>
      {suggestion.status === SuggestionStatus.suggested && (
        <div className="mt-4 flex items-center justify-end space-x-3">
          <button
            onClick={() => onStatusChange(suggestion.id, SuggestionStatus.rejected)}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            onClick={() => onStatusChange(suggestion.id, SuggestionStatus.accepted)}
            className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      )}
    </div>
  );
}