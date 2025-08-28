# LexiContract AI: End-to-End Documentation

Welcome to the official documentation for LexiContract AI. This document provides a comprehensive overview of the project, from its high-level architecture to detailed instructions for setup and API usage.

## 1. Mission & Core Problem

*   **Mission:** To automate the legal contract lifecycle by using AI to instantly analyze, redline, and summarize legal documents, reducing review time by over 90% and empowering businesses to make faster, more informed decisions.
*   **Problem:** The modern software supply chain is incredibly complex and vulnerable to sophisticated attacks, making it difficult for companies to ensure the integrity and security of the code they build and deploy. LexiContract AI addresses the legal-tech parallel of this problem: contract review is a manual, slow, and error-prone process that creates significant business bottlenecks and risk.

---

## 2. Architecture Overview

LexiContract AI is built on a modern, scalable, and secure full-stack architecture.

*   **Frontend:** A responsive web application built with **Next.js (React)**, **TypeScript**, and styled with **Tailwind CSS**. It communicates with the backend via a proxied API.
*   **Backend:** A high-performance API built with **Python** and **FastAPI**. It handles business logic, user authentication, and orchestrates the AI analysis.
*   **Database:** A **PostgreSQL** database for storing user, organization, and contract metadata. Data models are managed using **SQLAlchemy**.
*   **AI Analysis:** A background processing system that uses placeholder models to simulate contract analysis. In a production environment, this would involve fine-tuned LLMs for legal text processing.
*   **Containerization:** The entire stack (frontend, backend, database) is containerized with **Docker** and orchestrated with **Docker Compose** for a consistent and reproducible development environment.

---

## 3. Getting Started: Full-Stack Setup

Follow these instructions to run the entire LexiContract AI platform on your local machine.

### Prerequisites

*   [Docker](https://www.docker.com/get-started)
*   [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd lexiContract-ai
    ```

2.  **Create an environment file:**
    Copy the example environment file. The default values are configured to work with Docker Compose out-of-the-box.
    ```bash
    cp .env.example .env
    ```

3.  **Build and run the services:**
    This single command will build the Docker images for the frontend and backend, and start all services.
    ```bash
    docker-compose up --build
    ```

### Accessing the Services

*   **Frontend Application:** `http://localhost:3000`
*   **Backend API (Interactive Docs):** `http://localhost:8000/docs`

---

## 4. API Endpoint Documentation (Example-Driven)

The following examples demonstrate how to interact with the core API endpoints.

### Example 1: User Registration

*   **Endpoint:** `POST /api/v1/auth/register`
*   **Description:** Creates a new organization (if it doesn't exist) and a new user account.
*   **Request Body:**
    ```json
    {
      "email": "test.user@examplecorp.com",
      "password": "a_strong_password",
      "organization_name": "ExampleCorp"
    }
    ```
*   **Successful Response (201 Created):**
    ```json
    {
      "email": "test.user@examplecorp.com",
      "id": "a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6",
      "organization_id": "f1e2d3c4-b5a6-f7e8-d9c0-b1a2f3e4d5c6",
      "role": "member"
    }
    ```

### Example 2: User Login (Get Token)

*   **Endpoint:** `POST /api/v1/auth/token`
*   **Description:** Authenticates a user and returns a JWT access token.
*   **Request Body (form-data):**
    ```
    username: "test.user@examplecorp.com"
    password: "a_strong_password"
    ```
*   **Successful Response (200 OK):**
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer"
    }
    ```

### Example 3: Contract Upload

*   **Endpoint:** `POST /api/v1/contracts/upload`
*   **Description:** Uploads a contract file for a logged-in user. Triggers a background task for AI analysis.
*   **Authentication:** Requires `Bearer <token>`.
*   **Request Body (multipart/form-data):**
    *   A file attached to the `file` key.
*   **Successful Response (201 Created):**
    The contract metadata is returned immediately with a `pending` status.
    ```json
    {
      "filename": "NDA_Vendor_XYZ.pdf",
      "id": "1a2b3c4d-5e6f-1a2b-3c4d-5e6f1a2b3c4d",
      "uploader_id": "a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6",
      "organization_id": "f1e2d3c4-b5a6-f7e8-d9c0-b1a2f3e4d5c6",
      "created_at": "2023-10-27T10:00:00.000Z",
      "analysis_status": "pending",
      "analysis_summary": null,
      "identified_risks": null
    }
    ```

### Example 4: List Contracts

*   **Endpoint:** `GET /api/v1/contracts/`
*   **Description:** Retrieves a list of all contracts for the user's organization.
*   **Authentication:** Requires `Bearer <token>`.
*   **Successful Response (200 OK):**
    An array of contract objects. The `analysis_status` will update from `pending` to `in_progress` and finally `completed` as the background task runs.
    ```json
    [
      {
        "filename": "NDA_Vendor_XYZ.pdf",
        "id": "1a2b3c4d-5e6f-1a2b-3c4d-5e6f1a2b3c4d",
        "uploader_id": "a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6",
        "organization_id": "f1e2d3c4-b5a6-f7e8-d9c0-b1a2f3e4d5c6",
        "created_at": "2023-10-27T10:00:00.000Z",
        "analysis_status": "completed",
        "analysis_summary": "This is a mock analysis. The contract appears to be a standard Non-Disclosure Agreement.",
        "identified_risks": [
          "The confidentiality term of 5 years is longer than the typical 2-3 years."
        ]
      }
    ]
    ```

---

## 5. Future Development

For a detailed overview of planned features and the long-term vision for LexiContract AI, please see the Strategic Roadmap.


With this foundation in place, our next step is to build out the "Secure User Onboarding" feature, which involves creating database models for users and organizations and implementing authentication endpoints.

<!--
[PROMPT_SUGGESTION]Design the PostgreSQL database schema for users, organizations, and contracts using SQLAlchemy models.[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Implement the JWT-based authentication logic, including token generation and a protected endpoint.[/PROMPT_SUGGESTION]
-->
This project is containerized using Docker. To get started, run the following commands:

```bash
# Clone the repository
git clone <repository-url>
cd lexiContract-ai

# Build and run the services (API and Database)
docker-compose up --build
```

# architecture of the backend wich reside on the root of the project
/workspaces/my-company/
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── main.py
├── README.md
├── requirements.txt
├── ROADMAP.md
├── sale.md
├── api/
│   ├── __init__.py
│   └── v1/
│       ├── __init__.py
│       ├── api.py
│       ├── dependencies.py
│       └── endpoints/
│           ├── __init__.py
│           ├── auth.py
│           ├── contracts.py
│           └── users.py
└── core/
    ├── __init__.py
    ├── analyzer.py
    ├── config.py
    ├── crud.py
    ├── database.py
    ├── models.py
    ├── schemas.py
    └── security.py

# architecture of the frontend

/workspaces/my-company/frontend/
├── Dockerfile
├── next.config.mjs
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── login/
    │   │   └── page.tsx
    │   ├── register/
    │   │   └── page.tsx
    │   └── contracts/
    │       └── [contractId]/
    │           └── page.tsx
    ├── components/
    │   └── StatusBadge.tsx
    ├── context/
    │   └── AuthContext.tsx
    ├── hooks/
    │   └── useAuth.ts
    ├── lib/
    │   └── api.ts
    ├── styles/
    │   └── globals.css
    └── types/
        └── index.ts
