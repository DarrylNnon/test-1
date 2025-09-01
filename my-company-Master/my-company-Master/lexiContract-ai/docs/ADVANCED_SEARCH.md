# Technical Specification: Advanced Search & Discovery

**Document ID:** LXP-TS-019
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for the "Advanced Search & Discovery" feature. The objective is to move beyond simple keyword-based search and implement a powerful semantic search engine. This will allow users to find relevant contracts and clauses based on legal concepts, intent, and similarity, rather than being limited to exact keyword matches.

## 2. Goals

*   Enable users to search their entire contract portfolio using natural language queries.
*   Find semantically similar clauses even if they use different wording (e.g., searching for "who owns the IP" should find clauses about "intellectual property assignment").
*   Provide a fast and responsive search experience.
*   Integrate the search results seamlessly into the user's workflow.

## 3. Core Technology: Vector Search

We will use a vector search approach, which involves converting text into numerical representations (embeddings) and finding the most similar vectors in a specialized database.

*   **Embedding Model:** We will use a pre-trained sentence-transformer model (e.g., from the `sentence-transformers` library) optimized for semantic similarity. This model will run as part of our backend services.
*   **Vector Database:** We will use **ChromaDB** as our vector database. It is open-source, can be easily containerized within our existing Docker Compose setup, and provides a simple API for storing and querying vectors.

## 4. Backend Architecture

### 4.1. Indexing Workflow

We need a process to convert contract text into vectors and store them. This will be integrated into our existing analysis pipeline.

*   **Trigger:** When the `analyzer.py` service successfully completes the analysis of a `ContractVersion`.
*   **Logic:**
    1.  The contract's `full_text` will be chunked into meaningful segments (e.g., paragraphs or sentences).
    2.  For each chunk, the embedding model will generate a vector embedding.
    3.  Each embedding will be stored in a ChromaDB collection along with its corresponding text and metadata.
    *   **Metadata:** `{ "contract_id": "...", "version_id": "...", "organization_id": "..." }`

### 4.2. New Search Service (`core/search.py`)

A new service will be created to encapsulate all interactions with the embedding model and ChromaDB.

*   `index_document(text, metadata)`: Handles the chunking, embedding, and storage of a document.
*   `semantic_search(query, organization_id)`: Takes a user's search query, generates an embedding for it, and queries ChromaDB to find the most similar text chunks for that organization.

### 4.3. New API Endpoint (`api/v1/endpoints/search.py`)

A new endpoint will expose the search functionality.

*   `GET /api/v1/search`:
    *   **Query Parameter:** `q` (the user's search query).
    *   **Action:** Calls the `semantic_search` function and returns a list of ranked search results.
    *   **Response:** `[{ "contract_id": "...", "filename": "...", "snippet": "...", "score": 0.85 }]`

## 5. Frontend Architecture

*   **Global Search Bar:** The main application layout will be updated to include a prominent, global search bar.
*   **Search Results Page:** A new page, `/search`, will be created to display the results from the search API.
*   **UI:** Each search result will be displayed as a card containing a snippet of the matched text (with the query terms highlighted), the source contract's filename, and a link to that contract's negotiation room.

## 6. Rollout Plan

1.  **Sprint 1 (Infrastructure & Indexing):** Add ChromaDB to our `docker-compose.yml`. Implement the `core/search.py` service and integrate the indexing logic into `analyzer.py`.
2.  **Sprint 2 (API & Backend):** Implement the `GET /api/v1/search` endpoint.
3.  **Sprint 3 (Frontend):** Build the global search bar and the search results page.
4.  **Sprint 4 (Integration & Testing):** Connect the frontend to the search API and write E2E tests for the full search workflow.

---