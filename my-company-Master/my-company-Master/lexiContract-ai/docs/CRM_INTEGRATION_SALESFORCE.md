# Technical Specification: CRM Integration Framework (Salesforce)

**Document ID:** LXP-TS-010
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for a generic, secure, and scalable integration framework, using Salesforce as the first implementation. This framework will allow users to connect LexiContract AI to third-party systems, enabling seamless data flow and automated workflows. The initial goal is to allow sales teams to initiate contract review from a Salesforce Opportunity and track its status.

## 2. Goals

*   Build a reusable integration framework that can support various authentication methods (API Key, OAuth 2.0).
*   Securely store and manage third-party credentials (e.g., API keys, OAuth tokens) for each organization.
*   Implement the initial connection flow for Salesforce using OAuth 2.0.
*   Provide a clear UI for users to connect, view status, and disconnect integrations.
*   Lay the groundwork for future webhook-based data synchronization.

## 3. Architecture

The framework will be built upon new generic database models and a dedicated API router for managing integrations.

### 3.1. Database Model Additions (`core/models.py`)

1.  **`Integration`**: A catalog of all available integrations supported by the platform. This table will be pre-populated.
    *   `id` (PK)
    *   `name` (String, unique): e.g., "Salesforce"
    *   `description` (Text)
    *   `category` (Enum: `CRM`, `ERP`, `Storage`)
    *   `auth_type` (Enum: `api_key`, `oauth2`): The authentication method required.

2.  **`OrganizationIntegration`**: Represents an active connection between an organization and a specific integration.
    *   `id` (PK)
    *   `organization_id` (FK to `Organization`)
    *   `integration_id` (FK to `Integration`)
    *   `is_enabled` (Boolean)
    *   `credentials` (LargeBinary): **Encrypted** JSON blob containing API keys, OAuth tokens (access, refresh), instance URLs, etc.
    *   `metadata` (JSONB, nullable): For storing non-sensitive configuration details.

### 3.2. Secure Credential Storage

*   All sensitive credentials in the `OrganizationIntegration.credentials` field will be encrypted at the application layer before being stored in the database.
*   We will use symmetric encryption (Fernet) from the `cryptography` library.
*   A new secret key, `FERNET_KEY`, will be added to our environment configuration. This key **must not** be checked into source control.
*   New helper functions `encrypt_data()` and `decrypt_data()` will be added to `core/security.py`.

### 3.3. API Endpoint Design (`api/v1/endpoints/integrations.py`)

*   **`GET /api/v1/integrations/`**: Lists all available integrations from the `Integration` table.
*   **`GET /api/v1/integrations/organization`**: Lists all active integrations for the current user's organization.
*   **`POST /api/v1/integrations/organization/{integration_id}`**: Creates a new connection. For API key auth, the key is in the body. For OAuth2, this initiates the flow.
*   **`DELETE /api/v1/integrations/organization/{org_integration_id}`**: Disables and removes an organization's integration.

### 3.5. Workflow: Create Contract from Opportunity

This workflow is triggered from within Salesforce and creates a corresponding contract record in LexiContract AI.

1.  **Trigger:** A Salesforce administrator will set up an Apex trigger on the `Opportunity` object. When an Opportunity's stage changes to a pre-configured value (e.g., "Needs Legal Review"), the trigger will fire.
2.  **Apex Callout:** The Apex trigger will make an authenticated HTTP POST callout to a new webhook endpoint in our API: `POST /api/v1/integrations/salesforce/webhook`.
    *   **Authentication:** The callout will include a secure, static `X-Webhook-Secret` header to authenticate the request. This secret will be unique per organization and stored in the `OrganizationIntegration.metadata`.
    *   **Payload:** The request body will contain the `OpportunityId` and the `OrganizationId` from Salesforce.
3.  **Webhook Processing (LexiContract AI):**
    *   Our endpoint receives the webhook, validates the secret, and identifies the user's organization.
    *   It uses the stored OAuth credentials for that organization to make a secure API call back to Salesforce to fetch details about the Opportunity (e.g., Name, Account Name).
    *   It also queries for the most recent file (e.g., a draft MSA) attached to the Opportunity.
    *   It downloads the file from Salesforce.
4.  **Contract Creation (LexiContract AI):**
    *   A new `Contract` record is created in our database. It will store the `salesforce_opportunity_id` to maintain the link between the two systems.
    *   The downloaded file is associated with the new contract as its first version.
    *   Our standard AI analysis pipeline is triggered on the new contract version.

### 3.6. Workflow: Sync Status to Opportunity

This workflow pushes status changes from LexiContract AI back to Salesforce, providing visibility to the sales team.

1.  **Trigger:** A user updates the `negotiation_status` of a contract within LexiContract AI (e.g., via a new API endpoint `PUT /api/v1/contracts/{contract_id}/status`).
2.  **Sync Logic:** The API endpoint triggers a background task.
3.  **API Call:** The background task checks if the contract has a linked `external_id` for a Salesforce integration. If so, it uses the `SalesforceClient` to make a `PATCH` request to the Salesforce API, updating a custom field (e.g., `LexiContract_Status__c`) on the corresponding Opportunity record.
### 3.4. Salesforce OAuth 2.0 Flow (Web Server)

1.  **Initiate:** User clicks "Connect Salesforce" in the UI. Frontend calls a new endpoint like `GET /api/v1/integrations/salesforce/auth`.
2.  **Redirect:** Backend redirects the user to the Salesforce authorization URL with our `client_id` and `redirect_uri`.
3.  **Authorize:** User logs into Salesforce and grants permission.
4.  **Callback:** Salesforce redirects the user back to our `redirect_uri` (e.g., `/api/v1/integrations/salesforce/callback`) with an authorization `code`.
5.  **Token Exchange:** Our backend exchanges the `code` (along with our `client_id` and `client_secret`) for an `access_token` and `refresh_token`.
6.  **Store Credentials:** The backend encrypts and stores these tokens in a new `OrganizationIntegration` record.
7.  **Confirm:** Backend redirects the user back to the frontend integrations page with a success message.

## 4. Rollout Plan

1.  **Sprint 1 (Framework Backend):** Implement the `Integration` and `OrganizationIntegration` models, secure credential storage, and the generic API endpoints for managing API-key based integrations. Seed the `Integration` table with initial data.
2.  **Sprint 2 (Salesforce OAuth):** Implement the full backend OAuth 2.0 connection flow specific to Salesforce.
3.  **Sprint 3 (Frontend):** Update the frontend integrations page to handle the OAuth redirect flow for Salesforce and display connection status.
4.  **Sprint 4 (Initial Sync Logic):** Implement the first workflow: creating a LexiContract review record from a Salesforce Opportunity.

---