# LexiContract AI Public API Documentation

**Version:** 1.0
**Status:** Live

## 1. Introduction

Welcome to the LexiContract AI Public API! This API allows you to programmatically interact with your organization's contracts, enabling you to build custom integrations, automate workflows, and extend the power of LexiContract AI into your own applications.

This document provides all the information you need to get started.

## 2. Authentication

All requests to the Public API must be authenticated using an API key.

### Generating an API Key

Organization administrators can generate and manage API keys within the LexiContract AI application:
1.  Navigate to **Settings > API Keys**.
2.  Provide a descriptive name for your key (e.g., "CI/CD Integration").
3.  Click **"Generate Key"**.

Your new API key will be displayed **only once**. Please copy it and store it in a secure location. For security, we only store a hash of the key and cannot retrieve it for you again.

### Using Your API Key

To authenticate your requests, include the API key in the `Authorization` header as a Bearer token.

**Header Format:**
`Authorization: Bearer <YOUR_API_KEY>`

---

## 3. Base URL & Versioning

All Public API endpoints are prefixed with `/api/public/v1`.

**Base URL:** `https://api.lexicontract.ai/api/public/v1`

Versioning is handled in the URL path to ensure that future updates do not break existing integrations.

---

## 4. Rate Limiting

To ensure platform stability and fair usage, the Public API is rate-limited on a per-key basis. If you exceed the rate limit, you will receive a `429 Too Many Requests` HTTP status code.

**Default Limits:**
*   **Read Operations (GET):** 1000 requests per hour
*   **Write Operations (POST):** 100 requests per hour

---

## 5. Endpoint Reference

### List Contracts

Retrieve a list of contracts for your organization.

*   **Endpoint:** `GET /contracts`
*   **Permissions:** Requires a valid API key.
*   **Example Request:**
    ```bash
    curl -X GET "https://api.lexicontract.ai/api/public/v1/contracts" \
         -H "Authorization: Bearer lsk_xxxxxxxxxxxxxxxx"
    ```
*   **Example Response (`200 OK`):**
    ```json
    [
      {
        "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
        "filename": "Master Services Agreement.pdf",
        "created_at": "2023-11-10T18:00:00Z",
        "negotiation_status": "SIGNED",
        "signature_status": "completed",
        "analysis_status": "completed"
      }
    ]
    ```

### Get a Single Contract

Retrieve detailed information for a single contract, including analysis suggestions for its latest version.

*   **Endpoint:** `GET /contracts/{contract_id}`
*   **Permissions:** Requires a valid API key.
*   **Example Request:**
    ```bash
    curl -X GET "https://api.lexicontract.ai/api/public/v1/contracts/a1b2c3d4-e5f6-7890-1234-567890abcdef" \
         -H "Authorization: Bearer lsk_xxxxxxxxxxxxxxxx"
    ```
*   **Example Response (`200 OK`):**
    *The response includes the contract details plus a list of `suggestions`.*

### Upload a Contract

Upload a new contract document for analysis. The analysis is performed asynchronously.

*   **Endpoint:** `POST /contracts`
*   **Permissions:** Requires a valid API key.
*   **Request Body:** `multipart/form-data` with a `file` part.
*   **Example Request:**
    ```bash
    curl -X POST "https://api.lexicontract.ai/api/public/v1/contracts" \
         -H "Authorization: Bearer lsk_xxxxxxxxxxxxxxxx" \
         -F "file=@/path/to/your/contract.pdf"
    ```
*   **Example Response (`202 Accepted`):**
    *The response returns the initial contract object with a `pending` analysis status.*
    ```json
    {
      "id": "b2c3d4e5-f6a1-b2c3-d4e5-f6a1b2c3d4e5",
      "filename": "contract.pdf",
      "created_at": "2023-11-10T19:00:00Z",
      "negotiation_status": "DRAFTING",
      "signature_status": "draft",
      "analysis_status": "pending"
    }
    ```