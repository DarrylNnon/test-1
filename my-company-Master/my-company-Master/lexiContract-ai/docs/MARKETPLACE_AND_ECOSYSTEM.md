# Technical Specification: Marketplace & Partner Ecosystem

**Document ID:** LXP-TS-020
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for the LexiContract AI Marketplace and Partner Ecosystem. This initiative will transform our platform from a standalone application into an extensible ecosystem. We will build a developer portal for third-party developers to create apps, a marketplace for our customers to discover and install these apps, and a robust system for managing the entire lifecycle of a partner integration.

## 2. Goals

*   Establish a vibrant developer community around LexiContract AI.
*   Enable third-party developers to build and publish applications that extend our platform's functionality.
*   Provide a secure and isolated sandbox environment for app development and testing.
*   Implement a clear certification and review process to ensure the quality and security of marketplace apps.
*   Create an intuitive marketplace UI for customers to browse, install, and manage third-party applications.
*   Unlock new revenue streams through app-based subscriptions or revenue sharing.

## 3. Architecture

### 3.1. Database Model Additions (`core/models.py`)

1.  **`DeveloperApp`**: Represents an application created by a third-party developer.
    *   `id` (PK)
    *   `name` (String)
    *   `description` (Text)
    *   `developer_org_id` (FK to `Organization`): The developer's organization.
    *   `client_id` (String, unique): Public identifier for the app.
    *   `client_secret_hash` (String): Hashed secret for backend authentication.
    *   `logo_url` (String, nullable)
    *   `redirect_uris` (JSONB): List of allowed OAuth redirect URIs.
    *   `scopes` (JSONB): List of API permissions the app requests (e.g., `contract:read`, `contract:write`).
    *   `status` (Enum: `development`, `pending_review`, `published`, `rejected`, `archived`).

2.  **`AppInstallation`**: Represents an instance of a `DeveloperApp` installed by a customer organization.
    *   `id` (PK)
    *   `app_id` (FK to `DeveloperApp`)
    *   `customer_org_id` (FK to `Organization`): The customer's organization.
    *   `installed_by_user_id` (FK to `User`)
    *   `installed_at` (DateTime)
    *   `is_enabled` (Boolean)
    *   `permissions` (JSONB): The specific scopes granted by the customer during installation.

3.  **`SandboxEnvironment`**: Represents an isolated environment for a developer.
    *   `id` (PK)
    *   `developer_org_id` (FK to `Organization`)
    *   `subdomain` (String, unique): e.g., `dev-app-123.sandbox.lexicontract.ai`
    *   `db_connection_string` (LargeBinary, encrypted)
    *   `status` (Enum: `provisioning`, `active`, `suspended`, `deleted`)
    *   `created_at` (DateTime)

### 3.2. Developer Portal & Marketplace

*   **Developer Portal (New Frontend App):** A separate application at `developer.lexicontract.ai` for developers to register, manage apps, access documentation, and provision sandbox environments.
*   **Marketplace (Integrated into Core App):** A new section at `/dashboard/marketplace` for customers to browse, discover, and install third-party apps via a standard OAuth 2.0 consent flow.

### 3.3. Key Workflows

*   **Sandbox Provisioning:** A developer's request from the portal will trigger a backend job that uses infrastructure-as-code (e.g., Terraform) to provision an isolated database schema and update the `SandboxEnvironment` record.
*   **App Certification:** A developer submits an app for review, triggering an internal workflow. Our team performs security scans and a manual review before changing the app's status to `published`, making it visible in the marketplace.

## 4. Rollout Plan

1.  **Sprint 1 (Backend Models):** Implement the `DeveloperApp`, `AppInstallation`, and `SandboxEnvironment` models and associated CRUD functions.
2.  **Sprint 2 (Developer Portal - Backend & UI Shell):** Build the backend APIs for app registration and management. Create the initial frontend application for the developer portal with login and a basic app management dashboard.
3.  **Sprint 3 (Sandbox Provisioning):** Implement the backend logic and scripting for provisioning sandbox environments.
4.  **Sprint 4 (Marketplace UI):** Build the frontend UI for the end-user marketplace, including browsing and app detail pages.
5.  **Sprint 5 (Installation Flow):** Implement the full OAuth 2.0 consent and installation workflow.
6.  **Sprint 6 (Documentation & Certification):** Set up the documentation site and build the internal tooling for the app certification process.