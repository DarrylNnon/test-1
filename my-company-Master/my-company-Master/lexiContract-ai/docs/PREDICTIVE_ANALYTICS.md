# Technical Specification: Predictive Negotiation Analytics

**Document ID:** LXP-TS-017
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for the "Predictive Negotiation Analytics" feature. This is the first phase of our "Next-Generation AI" initiative. The goal is to provide users with data-driven forecasts about their contract negotiations, specifically predicting negotiation timelines and the success probability of certain clauses. This will provide immense strategic value and further differentiate our platform.

## 2. Goals

*   Forecast the likely number of days a negotiation will take to complete.
*   Predict the probability of a specific clause being accepted by a counterparty.
*   Enhance our data models to capture the necessary features for these predictions.
*   Build a flexible prediction service that can start with heuristics and evolve to a machine learning model as we gather data.
*   Integrate these predictions seamlessly into the user's contract dashboard.

## 3. Architecture

### 3.1. Database Model Enhancement (`core/models.py`)

To power these predictions, we must enrich the data we collect. The `NegotiationOutcome` table will be enhanced with more contextual data points.

*   **`NegotiationOutcome` Model Additions:**
    *   `negotiation_duration_days` (Integer, nullable): The time from contract creation to 'SIGNED' status.
    *   `contract_value` (Integer, nullable): The monetary value of the contract, if available.
    *   `counterparty_industry` (String, nullable): The industry of the counterparty.
    *   `clause_category` (String, indexed): A high-level category for the clause (e.g., 'Liability', 'Indemnification').

### 3.2. Prediction Service (`core/prediction_service.py`)

A new service will be created to house the prediction logic. This decouples the logic from the API endpoints and allows for easier iteration.

*   **Initial Model (Heuristic-Based MVP):**
    *   **Timeline Prediction:** The initial model will be a simple rule-based calculation. It will start with a baseline (e.g., 10 days) and add or subtract days based on factors like contract type and value. For example: `+5 days if contract_value > $100,000`.
    *   **Success Probability:** This will be calculated by querying the enhanced `NegotiationOutcome` table: `(accepted_count / (accepted_count + rejected_count))` for a given `clause_category` and `counterparty_industry`.
*   **Future Model (ML-Based):** As we collect sufficient data, this service will be upgraded to use a trained machine learning model (e.g., a Gradient Boosting Regressor for timeline prediction) without changing the API contract.

### 3.3. API Endpoint (`api/v1/endpoints/analytics.py`)

A new endpoint will be added to the existing analytics router to serve the predictions.

*   **`GET /api/v1/contracts/{contract_id}/predictions`**:
    *   **Response Body:**
        ```json
        {
          "predicted_timeline_days": 12,
          "timeline_confidence_score": 0.85,
          "key_clause_predictions": [
            { "clause_category": "Limitation of Liability", "predicted_success_rate": 0.65 },
            { "clause_category": "Governing Law", "predicted_success_rate": 0.95 }
          ]
        }
        ```

## 4. Rollout Plan

1.  **Sprint 1 (Data Model):** Enhance the `NegotiationOutcome` model with the new fields and create the database migration. Update the data ingestion job to populate these new fields.
2.  **Sprint 2 (Prediction Service & API):** Implement the initial heuristic-based `PredictionService` and the new API endpoint to expose the forecasts.
3.  **Sprint 3 (Frontend Integration):** Update the contract dashboard UI to display the predictive insights.
4.  **Sprint 4 (ML Model Development):** Begin the offline process of developing and training the first version of the machine learning models.

