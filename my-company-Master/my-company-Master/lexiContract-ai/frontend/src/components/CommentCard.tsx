'use client';

import { UserComment, User } from '@/types';

interface CommentCardProps {
  comment: UserComment;
  currentUser: User | null;
  onHover: (commentId: string | null) => void;
}

export default function CommentCard({ comment, currentUser, onHover }: CommentCardProps) {
  const isCurrentUser = currentUser && comment.author_id === currentUser.id;
  const authorName = isCurrentUser ? 'You' : 'Team Member';

  return (
    <div
      id={`activity-item-${comment.id}`}
      className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-md shadow-sm transition-all duration-150"
      onMouseEnter={() => onHover(comment.id)}
      onMouseLeave={() => onHover(null)}
    >
      <p className="text-sm text-gray-800 mb-2">{comment.comment_text}</p>
      <p className="text-xs text-gray-500 mt-1">
        Commented by: <strong>{authorName}</strong> on {new Date(comment.created_at).toLocaleDateString()}
      </p>
    </div>
  );
}