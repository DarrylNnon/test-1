# Technical Specification: Contract Negotiation Workflow

**Document ID:** LXP-TS-005
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for the "Contract Negotiation Workflow." This is a foundational feature that moves LexiContract AI beyond static analysis into a dynamic, collaborative environment for managing the entire contract lifecycle. It introduces contract versioning, negotiation status tracking, and the ability to compare different versions of a document.

## 2. Goals

*   Implement a robust versioning system for all contracts.
*   Refactor the core `Contract` model to act as a container for its versions.
*   Introduce a `ContractVersion` model to store the text and analysis results for each iteration of a contract.
*   Create API endpoints to manage and compare contract versions.
*   Build a "Negotiation Room" UI that allows users to switch between versions and view a diff.

## 3. Backend Architecture

This feature requires a significant refactoring of our core data models.

### 3.1. Database Model Refactoring

1.  **`Contract` Model (`core/models.py`):**
    *   This model will now represent the overarching "contract record" or "negotiation thread."
    *   Fields like `full_text` and `analysis_status` will be **removed** from this model.
    *   A new field, `negotiation_status` (Enum: `Drafting`, `Internal Review`, `External Review`, `Signed`, `Archived`), will be added.

2.  **New `ContractVersion` Model (`core/models.py`):**
    *   This new model will store the state of a contract at a specific point in time.
    *   `id` (PK)
    *   `contract_id` (FK to `Contract`)
    *   `version_number` (Integer, auto-incrementing per contract)
    *   `full_text` (Text)
    *   `analysis_status` (Enum: `pending`, `in_progress`, `completed`, `failed`)
    *   `created_at`, `uploader_id` (FK to `User`)
    *   Relationships: `suggestions`, `comments` will now belong to a `ContractVersion`.

3.  **`AnalysisSuggestion` & `UserComment` Models:**
    *   The foreign key in these models will be changed from `contract_id` to `contract_version_id`.

### 3.2. API Endpoint Design

*   **`POST /api/v1/contracts/{contract_id}/versions`**: Upload a new version of an existing contract. This will create a new `ContractVersion` record and trigger the analysis task.
*   **`GET /api/v1/contracts/{contract_id}/versions`**: List all versions for a given contract.
*   **`GET /api/v1/contracts/{contract_id}/versions/{version_id}`**: Retrieve the details (including text and suggestions) for a specific version.
*   **`GET /api/v1/contracts/{contract_id}/diff?from_version={v1_id}&to_version={v2_id}`**: A new endpoint that computes and returns a text diff between two versions of a contract.

## 4. Frontend Architecture

*   **Contract Detail Page (`/dashboard/contracts/{contract_id}`):** This page will be redesigned into the "Negotiation Room."
*   **Version Selector:** A dropdown or sidebar component will be added, allowing users to select and view any version of the contract.
*   **Diff Viewer:** A new component will be built to render the diff between two selected versions. This can be an inline view (showing additions and deletions) or a side-by-side comparison.
*   **State Management:** The frontend state will need to be updated to handle the concept of a "current version" and to fetch version-specific data.

## 5. Rollout Plan

This is a major architectural change and will be rolled out carefully.

1.  **Sprint 1 (Backend - Models):** Implement the database model refactoring. Write a data migration script to move existing contracts into the new versioned structure (each existing contract becomes a `Contract` with a single `ContractVersion`).
2.  **Sprint 2 (Backend - APIs):** Update existing `crud` functions and API endpoints to work with the new versioned models. Implement the new version-specific endpoints.
3.  **Sprint 3 (Frontend - Version Viewing):** Redesign the contract detail page to be the "Negotiation Room." Implement the version selector and the ability to view the text and suggestions for a single, selected version.
4.  **Sprint 4 (Frontend - Diffing):** Implement the diff viewer component and the logic to compare two versions.
5.  **Sprint 5 (Testing):** Write comprehensive E2E tests for uploading new versions, switching between them, and viewing diffs.
6.  **Launch:** Announce the new, powerful negotiation capabilities.