'use client';

import { useMemo } from 'react';
import { AnalysisSuggestion, SuggestionStatus, UserComment } from '@/types';

interface HighlightedTextProps {
  fullText: string;
  suggestions: AnalysisSuggestion[];
  userComments: UserComment[];
  hoveredHighlightId: string | null;
  onHighlightHover: (id: string | null) => void;
}

const getHighlightClasses = (type: 'suggestion' | 'comment', status: SuggestionStatus | null, isHovered: boolean) => {
  let baseClasses = 'px-1 rounded cursor-pointer transition-all duration-150';
  if (isHovered) {
    baseClasses += ' ring-2 ring-blue-500 ring-offset-2';
  }

  if (type === 'comment') {
    return `${baseClasses} bg-blue-200 hover:bg-blue-300`;
  } else { // suggestion
    switch (status) {
      case SuggestionStatus.accepted:
        return `${baseClasses} bg-green-200 hover:bg-green-300`;
      case SuggestionStatus.rejected:
        return `${baseClasses} bg-red-200 hover:bg-red-300 line-through`;
      default: // suggested
        return `${baseClasses} bg-yellow-200 hover:bg-yellow-300`;
    }
  }
};

export default function HighlightedText({
  fullText,
  suggestions,
  userComments,
  hoveredHighlightId,
  onHighlightHover,
}: HighlightedTextProps) {
  const segments = useMemo(() => {
    const allHighlights = [
      ...suggestions.map(s => ({ ...s, type: 'suggestion' as const })),
      ...userComments.map(c => ({ ...c, type: 'comment' as const, status: null })),
    ];

    if (allHighlights.length === 0) {
      return [{ content: fullText, isHighlight: false }];
    }

    const sortedHighlights = allHighlights.sort((a, b) => a.start_index - b.start_index);

    const parts: any[] = [];
    let lastIndex = 0;

    sortedHighlights.forEach(highlight => {
      if (highlight.start_index > lastIndex) {
        parts.push({
          content: fullText.substring(lastIndex, highlight.start_index),
          isHighlight: false,
        });
      }
      parts.push({
        content: fullText.substring(highlight.start_index, highlight.end_index),
        isHighlight: true,
        highlight,
      });
      lastIndex = highlight.end_index;
    });

    if (lastIndex < fullText.length) {
      parts.push({
        content: fullText.substring(lastIndex),
        isHighlight: false,
      });
    }

    return parts;
  }, [fullText, suggestions, userComments]);

  return (
    <pre className="whitespace-pre-wrap font-sans text-sm">
      {segments.map((segment, index) =>
        segment.isHighlight && segment.highlight ? (
          <mark
            key={segment.highlight.id}
            id={`highlight-${segment.highlight.id}`}
            className={getHighlightClasses(segment.highlight.type, segment.highlight.status, hoveredHighlightId === segment.highlight.id)}
            onMouseEnter={() => onHighlightHover(segment.highlight.id)}
            onMouseLeave={() => onHighlightHover(null)}
          >
            {segment.content}
          </mark>
        ) : (<span key={index}>{segment.content}</span>)
      )}
    </pre>
  );
}