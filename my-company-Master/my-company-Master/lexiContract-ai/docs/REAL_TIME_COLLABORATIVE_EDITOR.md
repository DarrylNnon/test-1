# Technical Specification: Real-time Collaborative Editor

**Document ID:** LXP-TS-017
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for a real-time, multi-user collaborative editor within the LexiContract AI platform. This feature will transform the contract negotiation process from a sequential, version-based workflow into a live, interactive experience, similar to Google Docs. Multiple users from different organizations will be able to edit a contract simultaneously, see each other's cursors, and resolve comments in real-time.

## 2. Goals

*   Allow multiple users to edit a contract document at the same time.
*   Display the cursor position and text selections of other active users.
*   Ensure data consistency and prevent conflicts, even with concurrent edits.
*   Integrate the collaborative editor seamlessly into the existing "Negotiation Room" UI.
*   Persist the document state reliably to our database.

## 3. Core Technology: CRDTs with Y.js

To handle the complexity of concurrent editing, we will use a Conflict-free Replicated Data Type (CRDT) approach. CRDTs are a data structure that allows for local, offline-first editing and automatically resolves conflicts without requiring a central, authoritative server for every keystroke.

We will use the **Y.js** library, a mature and high-performance open-source framework for building collaborative applications.

*   **Y.js Document (`Y.Doc`):** The shared data structure representing the contract text.
*   **Providers:** Y.js offers "providers" to sync the document state. We will use the `y-websocket` provider.

## 4. Backend Architecture

### 4.1. WebSocket Server

The existing WebSocket infrastructure (`core/websockets.py`) is designed for broadcasting messages, but is not sufficient for the stateful, persistent connections required by Y.js. We will run a dedicated, lightweight **Y.js WebSocket server** as a separate process.

*   **Technology:** A simple Node.js server using the `y-websocket` package.
*   **Functionality:** It manages connections, relays document updates between connected clients for a specific "room" (our `contract_id`), and can be configured to periodically persist the document state.

### 4.2. Database Persistence

While real-time updates are handled by the WebSocket server, we still need to save the final state to our PostgreSQL database.

*   **Trigger:** The Y.js server will be configured to persist the document state to our main FastAPI backend via a REST API call whenever a document is updated and no new changes have occurred for a few seconds (debouncing).
*   **New Endpoint (`api/v1/endpoints/drafting.py`):**
    *   `POST /api/v1/drafting/persist/{contract_version_id}`: A secure, internal-only endpoint that receives the full document content from the Y.js server and updates the `full_text` field of the corresponding `ContractVersion`.

## 5. Frontend Architecture

### 5.1. Rich Text Editor

We will use **TipTap**, a modern, headless rich text editor framework that has official integration with Y.js. This gives us full control over the look and feel while providing robust collaborative features.

### 5.2. Implementation Steps

1.  **Replace Existing Viewer:** The current static text viewer in the "Negotiation Room" will be replaced with a TipTap editor component.
2.  **Initialize Y.js:** When a user enters the room, the frontend will:
    *   Create a new `Y.Doc`.
    *   Connect to the Y.js WebSocket server, passing the `contract_id` as the room identifier.
    *   Bind the TipTap editor to the `Y.Doc`.
3.  **Initial Content:** The initial content of the `Y.Doc` will be loaded from our existing `GET /contracts/{contract_id}` endpoint.

## 6. Rollout Plan

1.  **Sprint 1 (Backend Infrastructure):** Set up and deploy the standalone Y.js WebSocket server. Implement the persistence endpoint in our FastAPI backend.
2.  **Sprint 2 (Frontend Editor):** Replace the current contract text viewer with a non-collaborative TipTap editor to ensure basic editing functionality.
3.  **Sprint 3 (Collaboration Integration):** Integrate Y.js and the `y-websocket` provider into the frontend TipTap component to enable real-time collaboration.
4.  **Sprint 4 (Testing & Refinement):** Conduct extensive testing with multiple concurrent users. Refine the UI for cursor presence and user awareness. Write E2E tests for the collaborative workflow.