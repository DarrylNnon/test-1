import { ClauseSimilarityResult, AnalysisSuggestion, UserComment } from '@/types';

interface ClauseComparisonProps {
  selectedHighlight: (AnalysisSuggestion | UserComment) | null;
  similarClauses: ClauseSimilarityResult[];
  isLoading: boolean;
}

export default function ClauseComparison({ selectedHighlight, similarClauses, isLoading }: ClauseComparisonProps) {
  if (!selectedHighlight) {
    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-sm text-gray-500">Click a highlight in the document to compare it with your Clause Library.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Clause Library Comparison</h3>
      
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Selected Contract Text</h4>
        <p className="mt-2 text-sm text-gray-800 italic">"{selectedHighlight.original_text}"</p>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Searching library...</p>}

      {!isLoading && similarClauses.length === 0 && (
        <p className="text-sm text-gray-500">No similar clauses found in your library.</p>
      )}

      {!isLoading && similarClauses.length > 0 && (
        <div className="space-y-4">
          {similarClauses.map(clause => (
            <div key={clause.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-center">
                <h4 className="text-md font-semibold text-indigo-700">{clause.title}</h4>
                <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                  {`Match: ${(clause.similarity_score * 100).toFixed(0)}%`}
                </span>
              </div>
              {clause.category && (
                <p className="text-xs text-gray-500 mt-1">Category: {clause.category}</p>
              )}
              <div className="mt-3 prose prose-sm max-w-none text-gray-700">
                <p>{clause.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}