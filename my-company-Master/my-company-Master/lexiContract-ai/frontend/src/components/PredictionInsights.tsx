'use client';

import { ClockIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

interface ClausePrediction {
  clause_category: string;
  predicted_success_rate: number;
}

interface PredictionInsightsProps {
  predicted_timeline_days: number;
  timeline_confidence_score: number;
  key_clause_predictions: ClausePrediction[];
}

const getConfidenceColor = (score: number) => {
  if (score > 0.8) return 'bg-green-500';
  if (score > 0.6) return 'bg-yellow-500';
  return 'bg-red-500';
};

export default function PredictionInsights({
  predicted_timeline_days,
  timeline_confidence_score,
  key_clause_predictions,
}: PredictionInsightsProps) {
  return (
    <div className="rounded-lg bg-white shadow border border-gray-200 p-6">
      <h3 className="text-lg font-semibold leading-6 text-gray-900">Predictive Insights</h3>
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        
        {/* Predicted Timeline */}
        <div className="flex items-start space-x-4 rounded-lg bg-gray-50 p-4">
          <div className="flex-shrink-0">
            <ClockIcon className="h-8 w-8 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Predicted Negotiation Timeline</p>
            <p className="text-2xl font-bold text-gray-900">{predicted_timeline_days} days</p>
            <div className="mt-2">
              <p className="text-xs text-gray-500">Confidence: {(timeline_confidence_score * 100).toFixed(0)}%</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div className={`${getConfidenceColor(timeline_confidence_score)} h-1.5 rounded-full`} style={{ width: `${timeline_confidence_score * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Clause Success Rates */}
        <div className="flex items-start space-x-4 rounded-lg bg-gray-50 p-4">
          <div className="flex-shrink-0"><ShieldCheckIcon className="h-8 w-8 text-green-500" /></div>
          <div className="w-full">
            <p className="text-sm font-medium text-gray-500">Key Clause Success Probability</p>
            <ul className="mt-2 space-y-2">
              {key_clause_predictions.map((clause) => (<li key={clause.clause_category}><div className="flex justify-between text-sm"><p className="font-medium text-gray-800">{clause.clause_category}</p><p className="font-semibold text-gray-600">{(clause.predicted_success_rate * 100).toFixed(0)}%</p></div><div className="w-full bg-gray-200 rounded-full h-1.5 mt-1"><div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${clause.predicted_success_rate * 100}%` }}></div></div></li>))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}