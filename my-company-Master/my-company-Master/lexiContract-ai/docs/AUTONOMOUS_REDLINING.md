# Technical Specification: Autonomous Redlining

**Document ID:** LXP-TS-018
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for the "Autonomous Redlining" feature. This is the second major phase of our "Next-Generation AI" initiative. The system will leverage our existing Compliance Playbooks to automatically apply redlines to low-risk contracts (e.g., NDAs). These changes will be presented to the user in a "human-in-the-loop" UI for final approval, dramatically accelerating the review process for standardized agreements.

## 2. Goals

*   Automatically generate a redlined version of a contract based on enabled compliance playbooks.
*   Maintain a clear, version-controlled history of all autonomous changes.
*   Calculate and assign a "confidence score" to each AI-generated change.
*   Provide a simple, intuitive UI for users to compare the original text with the AI-redlined version and approve or reject the changes.
*   Ensure the system is fail-safe, requiring explicit user approval before any changes are finalized.

## 3. Architecture

### 3.1. Database Model Enhancements (`core/models.py`)

To support this workflow, we will enhance two existing models.

1.  **`AnalysisSuggestion` Model Additions:**
    *   `confidence_score` (Float, nullable): A score from 0.0 to 1.0 indicating the AI's confidence in the suggested change. Initially, this can be based on the rule's specificity; later, it can be learned.
    *   `is_autonomous` (Boolean, default=False): A flag to distinguish between a regular suggestion and one that has been autonomously applied as a redline.

2.  **`ContractVersion` Model Additions:**
    *   `parent_version_id` (FK to `contract_versions.id`, nullable): A self-referencing key to create a clear lineage. An autonomously generated version will point to the user-uploaded version as its parent.
    *   `version_status` (Enum: `draft`, `pending_approval`, `approved`, `rejected`): Manages the state of an AI-generated version.

### 3.2. New Autonomous Redlining Service (`core/redlining_service.py`)

A new service will orchestrate the autonomous redlining process. It will be triggered after the initial analysis of a contract designated as suitable for autonomous review (e.g., based on contract type 'NDA').

*   **Logic:**
    1.  Receives the initial `ContractVersion` and its `AnalysisSuggestion`s.
    2.  Filters for suggestions that come from an enabled, high-confidence Compliance Playbook.
    3.  Applies these suggestions directly to the `full_text` of the contract, creating a new redlined text.
    4.  Creates a **new** `ContractVersion` record to store the redlined text.
    5.  Sets the `parent_version_id` on the new version to the ID of the original version.
    6.  Sets the `version_status` of the new version to `pending_approval`.
    7.  Copies the relevant suggestions to the new version and flags them with `is_autonomous=True`.

### 3.3. API Enhancements

*   **`POST /api/v1/versions/{version_id}/approve`**: An endpoint for a user to approve an AI-generated version. This will mark the AI version's status as `approved` and potentially archive the parent version.
*   **`POST /api/v1/versions/{version_id}/reject`**: An endpoint to reject and delete an AI-generated version, reverting focus to the original parent version.

### 3.4. Frontend "Human-in-the-Loop" UI

*   When a contract has a version with a `pending_approval` status, the contract detail page will display a special "Review AI Changes" mode.
*   This UI will feature a side-by-side or inline diff view, clearly showing the changes made by the AI.
*   Prominent "Approve All Changes" and "Reject Changes" buttons will call the new API endpoints.

## 4. Rollout Plan

1.  **Sprint 1 (Architecture):** Define the system architecture and create this technical specification. **(COMPLETED)**
2.  **Sprint 2 (Data Models):** Enhance the `AnalysisSuggestion` and `ContractVersion` models and create the database migration.
3.  **Sprint 3 (Redlining Service):** Implement the core `RedliningService` to apply playbook rules and generate new contract versions.
4.  **Sprint 4 (Confidence Score):** Implement the logic for calculating and storing a confidence score for each autonomous change.
5.  **Sprint 5 (Frontend UI):** Develop the "human-in-the-loop" UI for reviewing and approving the AI-generated redlines.
6.  **Sprint 6 (API & Workflow):** Implement the approval/rejection API endpoints and the full end-to-end workflow.
7.  **Sprint 7 (Pilot Program):** Run a limited pilot program for autonomous redlining on NDAs with select customers.