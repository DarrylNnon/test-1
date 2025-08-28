from typing import List
from core.models import AnalysisSuggestion, SuggestionStatus

def apply_suggestions_to_text(original_text: str, suggestions: List[AnalysisSuggestion]) -> str:
    """
    Applies accepted and rejected suggestions to the original text.
    Accepted suggestions replace original text with suggested text.
    Rejected suggestions keep original text (revert to original_text).
    Suggestions with 'suggested' status are ignored (original text is kept).

    Args:
        original_text: The full original contract text.
        suggestions: A list of AnalysisSuggestion objects.

    Returns:
        The modified text with suggestions applied.
    """
    if not original_text:
        return ""

    # Sort suggestions by their end_index in descending order.
    # This is crucial to ensure that changes (especially length changes)
    # don't affect the indices of subsequent (earlier in the text) suggestions.
    sorted_suggestions = sorted(suggestions, key=lambda s: s.end_index, reverse=True)

    modified_text_list = list(original_text) # Convert to list for easier character replacement

    for suggestion in sorted_suggestions:
        if suggestion.status == SuggestionStatus.accepted:
            if suggestion.suggested_text is not None:
                # Replace the original segment with the suggested text
                modified_text_list[suggestion.start_index:suggestion.end_index] = list(suggestion.suggested_text)
            # If suggested_text is None for an accepted suggestion, it implies no change to text,
            # or a comment-only suggestion, so we do nothing.
        elif suggestion.status == SuggestionStatus.rejected:
            # For rejected, we explicitly revert to the original text segment.
            modified_text_list[suggestion.start_index:suggestion.end_index] = list(suggestion.original_text)
        # Suggestions with status 'suggested' are implicitly ignored, as we only
        # apply explicit accepted/rejected changes.

    return "".join(modified_text_list)