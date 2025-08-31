# Technical Specification: CRM Integration (HubSpot)

**Document ID:** LXP-TS-011
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for integrating LexiContract AI with the HubSpot CRM platform. This initiative leverages the generic integration framework established during the Salesforce integration. The primary goal is to allow users to initiate contract reviews from HubSpot Deals and synchronize the contract status back to HubSpot.

## 2. Goals

*   Enable users to securely connect their HubSpot account to LexiContract AI using OAuth 2.0.
*   Allow a contract review to be triggered from a HubSpot Deal when it reaches a specific stage.
*   Provide two-way status synchronization between the LexiContract AI contract and the HubSpot Deal.
*   Reuse the existing secure integration framework, models, and credential storage mechanisms.

## 3. Architecture

This integration will use the existing `Integration` and `OrganizationIntegration` database models. The connection process will be handled by a new set of HubSpot-specific OAuth 2.0 endpoints.

### 3.1. HubSpot OAuth 2.0 Flow

The connection flow will be nearly identical to the Salesforce implementation, adapted for HubSpot's specific requirements.

1.  **Initiate:** User clicks "Connect HubSpot" in the UI. Frontend is directed to `GET /api/v1/integrations/hubspot/auth`.
2.  **Redirect:** The backend redirects the user to the HubSpot authorization URL (`https://app.hubspot.com/oauth/authorize`) with our `client_id`, `redirect_uri`, a secure `state` token, and the required `scopes`.
    *   **Required Scopes:** `crm.objects.deals.read`, `crm.objects.deals.write`, `files.read`, `crm.schemas.deals.read`.
3.  **Authorize:** User logs into HubSpot and grants the requested permissions.
4.  **Callback:** HubSpot redirects the user back to our `redirect_uri` (`/api/v1/integrations/hubspot/callback`) with an authorization `code`.
5.  **Token Exchange:** Our backend server securely exchanges the `code` for an `access_token` and `refresh_token` by making a POST request to HubSpot's token endpoint (`https://api.hubapi.com/oauth/v1/token`).
6.  **Store Credentials:** The backend encrypts and stores the tokens in the `OrganizationIntegration` record for the user's organization using the `upsert_organization_integration` CRUD function.
7.  **Confirm:** The user is redirected back to the frontend integrations page with a success message.

### 3.2. Workflow: Create Contract from Deal

1.  **Trigger:** A HubSpot administrator will configure a HubSpot Workflow. When a Deal's stage is updated (e.g., to "Legal Review"), the workflow will trigger a webhook.
2.  **Webhook:** The webhook will make a POST request to a new endpoint in our API: `POST /api/v1/integrations/hubspot/webhook`. The payload will contain the HubSpot `dealId` and our `organization_id`.
3.  **Processing:** Our backend will use the stored OAuth tokens for that organization to call the HubSpot API, fetch details about the Deal, and download any associated contract files.
4.  **Contract Creation:** A new `Contract` is created in LexiContract AI, with the `external_id` field storing the HubSpot Deal ID.

### 3.3. Workflow: Sync Status to Deal

1.  **Trigger:** A user updates the `negotiation_status` of a contract in LexiContract AI.
2.  **Sync Logic:** A background task is triggered. It uses the `external_id` to find the linked HubSpot Deal.
3.  **API Call:** The task makes a `PATCH` request to the HubSpot API to update a custom property on the Deal (e.g., `lexicontract_status`) with the new status.

## 4. Rollout Plan

1.  **Sprint 1 (Backend OAuth):** Implement the backend OAuth 2.0 connection flow. Add HubSpot configuration to environment settings.
2.  **Sprint 2 (Frontend UI):** Update the frontend integrations page to support the HubSpot connection flow.
3.  **Sprint 3 (Backend Webhook):** Implement the webhook endpoint and the logic for creating a contract from a HubSpot Deal.
4.  **Sprint 4 (Status Sync & Docs):** Implement the two-way status sync. Create the setup guide for HubSpot administrators.

---