import React from 'react';
import { ContractMilestone } from '@/types';

interface MilestonesTimelineProps {
  milestones: ContractMilestone[];
}

export const MilestonesTimeline: React.FC<MilestonesTimelineProps> = ({ milestones }) => {
  if (!milestones || milestones.length === 0) {
    return <p className="text-gray-500">No key dates have been extracted for this contract.</p>;
  }

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {milestones.map((milestone, milestoneIdx) => (
          <li key={milestone.id}>
            <div className="relative pb-8">
              {milestoneIdx !== milestones.length - 1 ? (
                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-3">
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm text-gray-800 font-medium">{milestone.milestone_type}</p>
                    <p className="text-sm text-gray-500">{milestone.description}</p>
                  </div>
                  <div className="text-right text-sm whitespace-nowrap text-gray-500">
                    <time dateTime={milestone.milestone_date}>{new Date(milestone.milestone_date + 'T00:00:00').toLocaleDateString()}</time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};