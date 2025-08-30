# Technical Specification: Post-Signature Management

**Document ID:** LXP-TS-006
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for the "Post-Signature Management" feature set. This initiative extends the LexiContract AI platform beyond negotiation and execution into the critical phase of active contract management. It provides tools to track key dates, monitor obligations, and manage renewals, transforming static legal documents into active, manageable assets.

## 2. Goals

*   Automatically extract and track key dates (e.g., Effective Date, Expiration Date, Renewal Notice Date) from executed contracts.
*   Identify and track key contractual obligations for both our customer and the counterparty.
*   Provide a clear, user-friendly interface for viewing upcoming deadlines and outstanding obligations.
*   Create a notification system to alert users of impending deadlines.
*   Build a dashboard to manage contract renewals and expirations portfolio-wide.

## 3. Backend Architecture

### 3.1. Database Model Additions (`core/models.py`)

Two new models will be introduced to store post-signature data.

1.  **`ContractMilestone`**: Represents a key date or event in the contract's lifecycle.
    *   `id` (PK)
    *   `contract_id` (FK to `Contract`)
    *   `milestone_type` (Enum: `Effective Date`, `Expiration Date`, `Auto-Renewal Date`, `Renewal Notice Deadline`, `Termination Notice Deadline`)
    *   `milestone_date` (Date)
    *   `description` (Text, optional): e.g., "Notice must be provided 60 days prior to expiration."
    *   `created_by_ai` (Boolean): True if extracted by the AI, False if manually added.

2.  **`TrackedObligation`**: Represents a specific, actionable commitment within the contract.
    *   `id` (PK)
    *   `contract_id` (FK to `Contract`)
    *   `obligation_text` (Text): The exact text from the contract defining the obligation.
    *   `responsible_party` (Enum: `Our Company`, `Counterparty`)
    *   `due_date` (Date, optional): The deadline for the obligation, if specified.
    *   `status` (Enum: `Pending`, `In Progress`, `Completed`, `Overdue`)
    *   `created_by_ai` (Boolean): True if extracted by the AI, False if manually added.

### 3.2. AI Service Enhancement (`analyzer.py`)

The `analyze_contract` function will be enhanced with a new post-processing step that runs only on contracts marked as `Signed`.

1.  **Date & Obligation Extraction:** Using a fine-tuned model or advanced regex patterns, the service will scan the `full_text` for common date and obligation phrases ("effective as of", "expires on", "shall provide", "is responsible for").
2.  **Entity Creation:** For each identified item, the service will create a corresponding `ContractMilestone` or `TrackedObligation` record in the database, linking it to the parent contract.

### 3.3. API Endpoint Design

A new router will be created: `api/v1/endpoints/management.py`.

*   **`GET /api/v1/contracts/{contract_id}/milestones`**: List all key dates for a contract.
*   **`GET /api/v1/contracts/{contract_id}/obligations`**: List all tracked obligations for a contract.
*   **`PUT /api/v1/obligations/{obligation_id}`**: Update the status of an obligation (e.g., mark as "Completed").
*   **`GET /api/v1/management/dashboard`**: A new endpoint to aggregate data for the Renewals Dashboard, returning contracts nearing expiration.

## 4. Frontend Architecture

*   **Contract Detail Page (`/dashboard/contracts/{contract_id}`):**
    *   A new "Management" tab will be added.
    *   **Key Dates Timeline:** A visual timeline component will display all `ContractMilestone` items.
    *   **Obligations Table:** A table will list all `TrackedObligation` items, allowing users to view details and update the status.

*   **New Renewals Dashboard (`/dashboard/renewals`):**
    *   A new page dedicated to managing the contract portfolio.
    *   Will feature a filterable, sortable table of all contracts, highlighting those set to expire or renew within the next 30, 60, or 90 days.

## 5. Rollout Plan

1.  **Sprint 1 (Backend - Models & APIs):** Implement the new database models and migrations. Build the CRUD functions and API endpoints for managing milestones and obligations.
2.  **Sprint 2 (Backend - AI Extraction):** Enhance `analyzer.py` with the logic to extract dates and obligations from signed contracts.
3.  **Sprint 3 (Frontend - Contract View):** Build the "Management" tab on the contract detail page, including the timeline and obligations table components.
4.  **Sprint 4 (Frontend - Renewals Dashboard):** Create the new Renewals Dashboard page and connect it to the aggregation API endpoint.
5.  **Sprint 5 (Testing & Notifications):** Write comprehensive E2E tests. Implement the backend notification service for upcoming deadlines.