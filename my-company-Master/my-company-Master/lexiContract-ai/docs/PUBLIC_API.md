# Technical Specification: Public API & Developer Platform

**Document ID:** LXP-TS-016
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for the LexiContract AI Public API. The objective is to expose core functionalities of the platform to customers and third-party developers, enabling them to build custom integrations, automate contract management workflows, and embed our services into their own applications. This will foster an ecosystem around our platform and unlock new revenue streams.

## 2. Goals

*   Provide secure, authenticated access to an organization's data.
*   Implement a clear and consistent API design.
*   Ensure the API is versioned to allow for future non-breaking changes.
*   Protect the platform with rate limiting and usage monitoring.
*   Provide clear, auto-generated documentation for developers.

## 3. Backend Architecture

### 3.1. Authentication

Authentication will be handled via API keys. Each organization can generate one or more API keys from the settings UI.

*   **API Key Model (`core/models.py`):** A new `ApiKey` table will be created.
    *   `id` (PK)
    *   `key_hash` (String, indexed, unique): A SHA-256 hash of the API key. We will **never** store the raw key.
    *   `prefix` (String, indexed): The first 8 characters of the key, for identification purposes.
    *   `organization_id` (FK to `Organization`)
    *   `user_id` (FK to `User`): The user who created the key.
    *   `name` (String): A user-friendly name for the key (e.g., "CI/CD Integration").
    *   `is_active` (Boolean)
    *   `last_used_at` (DateTime, nullable)
    *   `created_at` (DateTime)
*   **Authentication Flow:**
    1.  A client will provide the API key in the `Authorization` header: `Authorization: Bearer <api_key>`.
    2.  A new API dependency will extract the key, hash it, and look up the `key_hash` in the `ApiKey` table.
    3.  If a valid, active key is found, the request is associated with the corresponding organization.

### 3.2. Versioning

The API will be versioned via the URL prefix. All public API endpoints will live under `/api/public/v1/`. This allows us to introduce a `/v2/` in the future without breaking existing integrations.

### 3.3. Rate Limiting

To protect the platform from abuse and ensure fair usage, we will implement rate limiting. A middleware (e.g., using a token bucket algorithm with Redis) will be added to enforce limits on a per-API-key basis. Initial limits will be set globally (e.g., 1000 requests/hour) and can be adjusted per plan later.

### 3.4. Initial Endpoints (V1)

The first version of the API will focus on core contract management read and create operations.

*   `GET /api/public/v1/contracts`: List all contracts for the organization.
*   `POST /api/public/v1/contracts`: Upload a new contract for analysis.
*   `GET /api/public/v1/contracts/{contract_id}`: Retrieve details for a single contract.
*   `GET /api/public/v1/contracts/{contract_id}/suggestions`: List all analysis suggestions for the latest version of a contract.

## 4. Frontend Architecture

A new section in the "Settings" area will be created for API key management. This UI will allow organization administrators to:
*   Generate new API keys.
*   View existing keys (showing only the prefix for security).
*   Revoke (deactivate) existing keys.

## 5. Rollout Plan

1.  **Sprint 1 (Backend Foundation):** Implement the `ApiKey` model and the backend CRUD/API endpoints for generating and managing API keys.
2.  **Sprint 2 (Frontend UI):** Build the frontend UI for API key management in the settings page.
3.  **Sprint 3 (Core Endpoints):** Implement the initial set of public-facing endpoints (`/contracts` and `/suggestions`).
4.  **Sprint 4 (Rate Limiting & Docs):** Implement rate-limiting middleware. Publish initial developer documentation.