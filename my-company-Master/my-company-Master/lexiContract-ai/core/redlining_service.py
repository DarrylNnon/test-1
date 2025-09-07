from sqlalchemy.orm import Session
from typing import List

from . import models, crud

class RedliningService:
    """
    A service to handle the logic for autonomous contract redlining.
    """

    def _apply_suggestions_to_text(self, text: str, suggestions: List[models.AnalysisSuggestion]) -> str:
        """
        Applies a list of text replacement suggestions to a string.

        It sorts suggestions by their start index in reverse order to apply them
        from the end of the string to the beginning. This prevents index shifting
        issues as the text length changes.
        """
        suggestions.sort(key=lambda s: s.start_index, reverse=True)
        
        text_parts = list(text)
        for suggestion in suggestions:
            # Replace the original text slice with the suggested text
            text_parts[suggestion.start_index:suggestion.end_index] = list(suggestion.suggested_text)
        
        return "".join(text_parts)

    def _calculate_confidence_score(self, suggestion: models.AnalysisSuggestion) -> float:
        """
        Calculates a confidence score for a suggestion based on simple heuristics.
        This can be replaced with a more sophisticated model later.
        """
        # Start with a high base confidence for playbook-driven suggestions.
        score = 0.85

        # More complex (longer) original text is slightly less certain.
        if len(suggestion.original_text) > 150:
            score -= 0.05

        # Very short, specific replacements are more certain.
        if len(suggestion.suggested_text) < 30:
            score += 0.05

        return min(max(score, 0.5), 0.99) # Clamp score between 0.5 and 0.99

    def create_autonomous_redline(self, db: Session, original_version: models.ContractVersion) -> models.ContractVersion | None:
        """
        Creates a new, autonomously redlined contract version from an existing one.
        """
        # For now, we apply all suggestions that have replacement text.
        # In the future, this could be filtered by confidence score or playbook source.
        suggestions_to_apply = [s for s in original_version.suggestions if s.suggested_text]

        if not suggestions_to_apply:
            print(f"No applicable suggestions found for autonomous redlining on version {original_version.id}.")
            return None

        # Calculate confidence scores for each suggestion we are about to apply.
        suggestions_with_scores = [(s, self._calculate_confidence_score(s)) for s in suggestions_to_apply]

        # Apply the suggestions to the original text to create the new redlined text.
        new_text = self._apply_suggestions_to_text(original_version.full_text, suggestions_to_apply)

        # Create the new ContractVersion record, linking it to its parent.
        new_version = crud.create_new_contract_version_with_parent(
            db=db,
            original_version=original_version,
            new_text=new_text,
        )

        # Copy the applied suggestions to the new version, including their confidence scores.
        crud.copy_suggestions_to_new_version(db=db, suggestions_with_scores=suggestions_with_scores, new_version_id=new_version.id)

        return new_version

redlining_service = RedliningService()