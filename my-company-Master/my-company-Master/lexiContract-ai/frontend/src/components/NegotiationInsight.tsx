'use client';

import { Lightbulb } from 'lucide-react';

interface NegotiationInsightProps {
  insight: {
    suggested_counter: string;
    success_rate: number;
  };
  onApply: (counterText: string) => void;
}

const ProgressBar = ({ percentage }: { percentage: number }) => {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
      <div
        className="bg-green-600 h-2.5 rounded-full"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

export default function NegotiationInsight({ insight, onApply }: NegotiationInsightProps) {
  const successPercentage = Math.round(insight.success_rate * 100);

  return (
    <div className="mt-4 p-4 border-t border-dashed border-yellow-400 bg-yellow-50 rounded-b-lg">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <Lightbulb className="h-6 w-6 text-yellow-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-yellow-800">Negotiation Tip</p>
          <p className="mt-1 text-sm text-gray-700">
            Based on past negotiations, the following counter-offer has a <span className="font-bold">{successPercentage}%</span> success rate:
          </p>
          <div className="mt-3 p-3 bg-gray-100 border border-gray-200 rounded-md">
            <p className="text-sm font-mono text-gray-800">{insight.suggested_counter}</p>
          </div>
          <div className="mt-2 flex items-center space-x-2">
            <ProgressBar percentage={successPercentage} />
            <span className="text-xs font-medium text-gray-600">{successPercentage}%</span>
          </div>
          <button
            onClick={() => onApply(insight.suggested_counter)}
            className="mt-4 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Apply Counter-Offer
          </button>
        </div>
      </div>
    </div>
  );
}