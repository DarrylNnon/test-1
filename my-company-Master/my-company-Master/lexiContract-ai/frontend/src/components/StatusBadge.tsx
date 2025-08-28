import React from 'react';

interface StatusBadgeProps {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

const statusStyles = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800 animate-pulse',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

const statusText = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    failed: 'Failed',
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${statusStyles[status]}`}
    >
      {statusText[status]}
    </span>
  );
};

export default StatusBadge;