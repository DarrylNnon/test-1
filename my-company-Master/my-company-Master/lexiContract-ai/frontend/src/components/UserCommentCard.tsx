'use client';

import { UserComment } from '@/types';
import { useAuth } from '@/hooks/useAuth';

interface UserCommentCardProps {
  comment: UserComment;
  onHover: (id: string | null) => void;
}

export default function UserCommentCard({ comment, onHover }: UserCommentCardProps) {
  const { user } = useAuth();

  return (
    <div
      className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded-md shadow-sm"
      onMouseEnter={() => onHover(comment.id)}
      onMouseLeave={() => onHover(null)}
    >
      <p className="text-sm text-gray-700">{comment.comment_text}</p>
      <p className="text-xs text-gray-500 mt-1">
        Commented by: {comment.author_id === user?.id ? 'You' : 'Team Member'} on {new Date(comment.created_at).toLocaleDateString()}
      </p>
    </div>
  );
}