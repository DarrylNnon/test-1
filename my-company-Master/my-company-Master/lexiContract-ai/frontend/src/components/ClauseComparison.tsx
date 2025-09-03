import { ClauseSimilarityResult, AnalysisSuggestion, UserComment } from '@/types';
import { useState, useEffect } from 'react';

interface ClauseComparisonProps {
  selectedHighlight: (AnalysisSuggestion | UserComment) | null;
  contractId: string;
}

// Mock API call to avoid dependency on a file not in context
const fetchSimilarClausesMock = async (
  contractId: string,
  text: string
): Promise<ClauseSimilarityResult[]> => {
  console.log(`Fetching similar clauses for contract ${contractId} with text: "${text}"`);
  // In a real app, this would be an API call to something like:
  // const response = await api.get(`/api/v1/contracts/${contractId}/similar-clauses`, { params: { text } });
  // Returning mock data for demonstration.
  if (text.includes('confidentiality')) {
    return [
      {
        id: 'sim-1',
        contract_id: contractId,
        version_a_id: 'v1',
        version_b_id: 'v2',
        clause_a_text: 'The term of confidentiality is 5 years.',
        clause_b_text: 'The term of confidentiality is 3 years.',
        similarity_score: 0.85,
        diff_html: `<p>The term of confidentiality is <del style="background:#ffe6e6;">5</del><ins style="background:#e6ffe6;">3</ins> years.</p>`,
      },
    ];
  }
  return [];
};


const ClauseComparison: React.FC<ClauseComparisonProps> = ({ selectedHighlight, contractId }) => {
  const [similarClauses, setSimilarClauses] = useState<ClauseSimilarityResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedHighlight) {
      setSimilarClauses([]);
      return;
    }

    const fetchSimilarClauses = async () => {
      setIsLoading(true);
      try {
        const textToCompare = 'comment_text' in selectedHighlight ? selectedHighlight.comment_text : selectedHighlight.comment;
        const response = await fetchSimilarClausesMock(contractId, textToCompare);
        setSimilarClauses(response);
      } catch (error) {
        console.error('Failed to fetch similar clauses:', error);
        setSimilarClauses([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSimilarClauses();
  }, [selectedHighlight, contractId]);

  if (!selectedHighlight) {
    return <div className="p-4 text-gray-500 border-t">Select a highlight to see comparisons across versions.</div>;
  }

  return (
    <div className="p-4 border-t">
      <h3 className="text-lg font-semibold mb-2 text-gray-800">Clause Version Comparison</h3>
      {isLoading && <div className="p-4 text-gray-500">Loading comparisons...</div>}
      {!isLoading && similarClauses.length === 0 && <p className="text-gray-500">No similar clauses found in other versions.</p>}
    </div>
  );
};

export default ClauseComparison;