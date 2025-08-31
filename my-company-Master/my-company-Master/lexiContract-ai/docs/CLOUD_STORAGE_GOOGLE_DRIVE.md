# Technical Specification: Cloud Storage Integration (Google Drive)

**Document ID:** LXP-TS-012
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for integrating LexiContract AI with Google Drive. This is the first initiative under the "Cloud Storage Integration" strategic pillar. It will allow users to connect their Google Drive account and seamlessly import contract files for analysis, significantly improving the user workflow for getting documents into our system.

## 2. Goals

*   Enable users to securely connect their Google Drive account using OAuth 2.0.
*   Provide an in-app file picker for users to browse their Google Drive and select documents for import.
*   Handle the download of selected files from Google Drive and create new `Contract` records.
*   Reuse the existing secure integration framework.

## 3. Architecture

This integration will use the existing `Integration` and `OrganizationIntegration` models.

### 3.1. Google Drive OAuth 2.0 Flow

The connection process will follow our established OAuth 2.0 pattern.

1.  **Initiate:** User clicks "Connect Google Drive" in the UI, directing them to `GET /api/v1/integrations/google-drive/auth`.
2.  **Redirect:** The backend redirects the user to Google's authorization URL with our `client_id`, `redirect_uri`, a secure `state` token, and the required `scopes`.
    *   **Required Scopes:** `https://www.googleapis.com/auth/drive.readonly` - This gives us read-only access to view and download files, adhering to the principle of least privilege.
3.  **Authorize:** User logs into Google and grants permission.
4.  **Callback:** Google redirects the user back to our `redirect_uri` (`/api/v1/integrations/google-drive/callback`) with an authorization `code`.
5.  **Token Exchange:** Our backend exchanges the `code` for an `access_token` and `refresh_token` with Google's token endpoint.
6.  **Store Credentials:** The tokens are encrypted and stored in the `OrganizationIntegration` record.

### 3.2. API Endpoints for File Operations

*   **`GET /api/v1/integrations/google-drive/files`**: This endpoint will use the stored OAuth token to call the Google Drive API (`files.list`). It will support pagination and searching to power the frontend file picker.
*   **`POST /api/v1/integrations/google-drive/import`**:
    *   **Request Body:** `{ "file_id": "...", "file_name": "..." }`
    *   **Action:** This endpoint will use the `file_id` to download the file content from the Google Drive API. It will then create a new `Contract` and `ContractVersion` in our system and trigger the standard analysis pipeline.

## 4. Frontend Architecture

*   **File Picker:** A new modal component will be created. When a user clicks an "Import from Google Drive" button, this modal will open.
*   **Functionality:** The modal will call the `/files` endpoint to display a list of the user's documents. It will include a search bar. When a user selects a file and clicks "Import," it will call the `/import` endpoint.

## 5. Rollout Plan

1.  **Sprint 1 (Backend OAuth):** Implement the backend OAuth 2.0 connection flow for Google Drive.
2.  **Sprint 2 (Backend File API):** Implement the API endpoints for listing and importing files from Google Drive.
3.  **Sprint 3 (Frontend UI):** Build the "Import from Google Drive" button and the file picker modal.
4.  **Sprint 4 (Integration & Testing):** Connect the frontend UI to the backend APIs and write E2E tests for the full import workflow.