# Technical Specification: AI-Powered Negotiation Insights

**Document ID:** LXP-TS-014
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for the "AI-Powered Negotiation Insights" feature. This initiative evolves LexiContract AI from a risk-flagging tool into a proactive negotiation advisor. By analyzing historical negotiation data from across the platform, the system will suggest effective counter-offers and predict their likelihood of acceptance, providing users with a significant data-driven advantage.

## 2. Goals

*   Suggest specific, context-aware counter-offers for flagged clauses.
*   Provide a data-driven rationale for each suggestion (e.g., "Counter-offers like this are accepted 75% of the time for this type of agreement.").
*   Create a new data model to anonymously store and aggregate negotiation outcomes.
*   Enhance the AI analysis service to generate these new, actionable insights.
*   Update the frontend UI to present these insights to the user in an intuitive way.

## 3. Backend Architecture

### 3.1. New Database Model (`core/models.py`)

A new table, `NegotiationOutcome`, will be created to store aggregated, anonymized data about negotiation patterns.

*   `id` (PK)
*   `organization_id` (FK to `Organization`): The organization that this outcome belongs to.
*   `original_clause_hash` (String, indexed): A hash of the original clause text to group similar clauses for analysis.
*   `counter_offer_hash` (String, indexed): A hash of the successful counter-offer text.
*   `outcome` (Enum: `accepted`, `rejected`): The final result of this specific negotiation point.
*   `contract_type` (String, nullable): The type of contract (e.g., 'MSA', 'NDA') to provide context.
*   `industry` (String, nullable): The industry of the organization to provide further context.
*   `count` (Integer): A counter to track how many times this specific outcome has occurred.

### 3.2. Data Ingestion & Learning

A new background process will be created to populate the `NegotiationOutcome` table. This ensures user-facing actions remain fast.

*   **Trigger:** When a user resolves an `AnalysisSuggestion` by clicking "Accept" or "Reject" in the UI, a lightweight event is logged.
*   **Background Job:** A periodic job will process these events. For an "Accepted" suggestion, it will:
    1.  Hash the `original_text` and the `suggested_text` of the `AnalysisSuggestion`.
    2.  Find or create a corresponding `NegotiationOutcome` record.
    3.  Increment the `count` for that outcome.

### 3.3. AI Service Enhancement (`analyzer.py`)

The core analysis service will be updated to generate these new insights.

*   **New Function:** `generate_negotiation_insights(suggestion: AnalysisSuggestion)`.
*   **Logic:**
    1.  When analyzing a new contract, the service identifies a risk and creates a standard `AnalysisSuggestion`.
    2.  It then calls `generate_negotiation_insights` for that suggestion.
    3.  This function hashes the `original_text` of the suggestion and queries the `NegotiationOutcome` table for all `accepted` outcomes related to that hash.
    4.  It calculates the most common successful counter-offer and its acceptance probability.
    5.  This insight (e.g., `{ "suggested_counter": "...", "success_rate": 0.75 }`) is added to a new JSON field on the `AnalysisSuggestion` model.

## 4. Frontend Architecture

*   **Suggestion Card UI Enhancement:** The existing `SuggestionCard` component will be updated to display the new insights.
*   If `negotiation_insight` data is present on a suggestion, a new section will appear on the card with the heading "Negotiation Tip".
*   It will display the suggested counter-offer and a data visualization (e.g., a small progress bar) showing the success probability.
*   A new "Apply Counter-Offer" button will allow the user to directly replace the original text with the suggested counter-offer.

## 5. Rollout Plan

1.  **Sprint 1 (Backend Foundation):** Implement the `NegotiationOutcome` model and migration. Create the background job for ingesting and learning from user actions on suggestions.
2.  **Sprint 2 (AI Insights Generation):** Enhance `analyzer.py` to query the `NegotiationOutcome` table and enrich `AnalysisSuggestion` objects with predictive insights.
3.  **Sprint 3 (Frontend Integration):** Update the `SuggestionCard` component to display the new negotiation insights and the "Apply Counter-Offer" functionality.
4.  **Sprint 4 (Testing & Refinement):** Write E2E tests for the full workflow. Seed the database with sample outcome data to ensure the feature works for new users. Refine the presentation of insights based on initial feedback.