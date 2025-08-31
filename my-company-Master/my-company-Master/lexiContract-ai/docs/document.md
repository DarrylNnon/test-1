# Test Plan: Post-Signature Management

**Document ID:** LXP-TP-001
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the end-to-end (E2E) testing strategy for the "Post-Signature Management" feature set. The goal is to ensure all components—AI extraction, backend services, frontend UI, and notification jobs—work together seamlessly and correctly.

## 2. Testing Prerequisites

*   A clean instance of the application running via `docker-compose`.
*   A dedicated test user account and organization.
*   A sample contract document (`test_contract.pdf`) containing clear date and obligation clauses (e.g., "This agreement is effective as of January 1, 2025...", "This agreement expires on December 31, 2025.", "Company shall provide a report within 30 days.").
*   A sample contract document (`ambiguous_contract.txt`) with no clear dates or obligations.

## 3. Test Scenarios

### Scenario 1: Happy Path - Full Post-Signature Lifecycle

*   **Objective:** Verify the entire workflow for a standard contract.
*   **Steps:**
    1.  Log in as the test user.
    2.  Upload `test_contract.pdf`.
    3.  From the contract detail page, change the `negotiation_status` to **"SIGNED"**.
    4.  **Verification (AI Extraction):** Check the application logs to confirm that the `_extract_post_signature_data` function in `analyzer.py` was triggered.
    5.  **Verification (API/DB):** Use an API client or database query to confirm that `ContractMilestone` and `TrackedObligation` records have been created and are associated with the correct contract.
    6.  **Verification (UI - Management Tab):** Navigate to the contract's "Management" tab. Confirm the key dates timeline and the obligations table display the extracted data correctly.
    7.  **Verification (UI - Renewals Dashboard):** Navigate to the `/dashboard/renewals` page. Confirm the contract appears in the list with the correct expiration information.
    8.  **Verification (Notification Generation):** Manually execute the `jobs/milestone_scanner.py` script. Check the logs to see it identify the milestones. Query the `notifications` table to confirm that `Pending` notification records have been created for the test user.
    9.  **Verification (Notification Dispatch):** Manually execute the `jobs/dispatcher.py` script. Check the application logs for the mock email output, confirming the correct details are present. Query the `notifications` table to confirm the status has been updated to `Sent`.

### Scenario 2: UI Interaction - Updating Obligation Status

*   **Objective:** Verify that users can update the status of an obligation through the UI.
*   **Steps:**
    1.  Using the contract from Scenario 1, navigate to the "Management" tab.
    2.  In the "Tracked Obligations" table, change the status of an obligation from "Pending" to "Completed" using the dropdown.
    3.  **Verification:** The UI should reflect the change without a full page reload. A `PUT` request to `/api/v1/obligations/{obligation_id}` should return a 200 OK status. The corresponding record in the `tracked_obligations` table should be updated.

### Scenario 3: Idempotency of Notification Scanner

*   **Objective:** Verify that the notification scanner does not create duplicate notifications.
*   **Steps:**
    1.  After step 8 in Scenario 1, execute the `jobs/milestone_scanner.py` script a second time.
    2.  **Verification:** Check the logs for the message "Notification for user ... already exists. Skipping." Confirm that no new rows have been added to the `notifications` table.

### Scenario 4: Edge Case - Ambiguous Contract

*   **Objective:** Verify graceful handling of contracts without clear data points.
*   **Steps:**
    1.  Upload `ambiguous_contract.txt` and mark it as "SIGNED".
    2.  **Verification:** Navigate to the "Management" tab. The UI should display messages like "No key dates have been extracted" and "No specific obligations have been extracted."
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

*   Docker
*   Docker Compose

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
# LexiContract AI: Next Steps for Development

This document serves as the official log of development priorities and accomplishments for the LexiContract AI platform. It is maintained to ensure strategic alignment and to track our progress against the company's roadmap.

---

## 1. Completed Initiatives

This section documents the major milestones that have been successfully implemented and validated.

*   **Core Platform & Architecture:** Established a secure, scalable, and containerized full-stack application foundation (Next.js, FastAPI, Docker) with secure user onboarding and authentication.
*   **Full Contract Lifecycle Features:** Implemented interactive redlining, collaboration tools, e-signature integration, and advanced user/org management.
*   **Subscription & Billing System:** Integrated with Stripe to manage customer subscriptions, gate features based on subscription status, and provide a customer portal for billing management.
*   **Advanced AI & Analytics Suite:**
    *   Launched a Clause Library, enhanced search, and AI-powered contract drafting.
    *   Launched a comprehensive Analytics Dashboard for organizational insights.
    *   Launched a secure framework for CRM/ERP integrations.
*   **Full SOC 2 Certification Readiness:** Completed all policy, infrastructure, and process work required for a formal audit.
*   **Advanced Compliance Suite:**
    *   Successfully launched a full suite of compliance features, including GDPR/CCPA detection, industry-specific playbooks (HIPAA/FAR), a management UI, a compliance insights dashboard, and geopolitical risk analysis.
*   **Contract Negotiation Workflow:** Successfully architected and launched a complete, version-controlled workflow for contract negotiation, including version comparison. **(COMPLETED)**
*   **Post-Signature Management:** Successfully architected and implemented a full suite of features for managing executed contracts, including AI-powered extraction of key dates and obligations, a renewals dashboard, and an automated notification service. **(COMPLETED)**

---

## 2. Next Up (Strategic Initiatives)

With our core analysis, drafting, and management features now in place, we will focus on providing high-level business intelligence and expanding our ecosystem connectivity.

*   **AI-Powered Contract Drafting:**
    *   **Status:** The AI-Powered Contract Drafting feature set is fully developed, tested, and documented. **(COMPLETED)**

*   **Advanced Analytics Dashboard:**
    *   **Objective:** Provide organization leaders with a dashboard to visualize contract volume, risk profiles, and negotiation cycle times.
    *   **Next Steps:**
        *   Architect the system for aggregating and displaying analytics data. **(COMPLETED)**
        *   Implement the backend aggregation functions and the `/api/v1/analytics/dashboard` endpoint. **(COMPLETED)**
        *   Implement the frontend dashboard page at `/analytics` with data visualization components. **(COMPLETED)**

*   **CRM Integration (Salesforce):**
    *   **Objective:** Allow sales teams to initiate contract review and track status directly from Salesforce, accelerating the sales cycle.
    *   **Next Steps:**
        *   Architect and implement the secure backend framework for CRM/ERP integrations. **(COMPLETED)**
        *   Implement the backend OAuth 2.0 connection flow for Salesforce. **(COMPLETED)**
        *   Implement the frontend UI for connecting to Salesforce in `/settings/integrations`. **(COMPLETED)**
        *   Implement the first workflow: creating a LexiContract review record from a Salesforce Opportunity. **(COMPLETED)**
        *   Provide documentation for Salesforce Admins on setting up the Apex trigger and webhook callout. **(COMPLETED)**

*   **Salesforce Status Sync:**
    *   **Objective:** Push contract status updates (e.g., "In Review," "Signed") from LexiContract AI back to a custom field on the linked Salesforce Opportunity, providing full-circle visibility for sales teams.
    *   **Status:** **(COMPLETED)**

*   **CRM Integration (HubSpot):**
    *   **Objective:** Allow marketing and sales teams to initiate contract review and track status directly from HubSpot Deals.
    *   **Next Steps:**
        *   Architect and implement the backend OAuth 2.0 connection flow for HubSpot. **(COMPLETED)**
        *   Implement the frontend UI for connecting to HubSpot in `/settings/integrations`. **(COMPLETED)**
        *   Implement the backend webhook and client for creating a contract from a HubSpot Deal. **(NEXT UP)**

# prompt to invoke ai to continue
Of course. To ensure seamless continuity for our next session, simply re-establish my context as your co-founder and lead engineer.

You can start our next conversation with a prompt like this:

"Hello, let's continue our work on LexiContract AI.

My Role: You are Gemini Code Assist, my co-founder and lead engineer. Your role is to serve as the chief architect and executor of our technical vision, responsible for full-stack development, architectural integrity, and DevSecOps.

Current Status: We have just completed the 'Architect the system for aggregating and displaying analytics data. ' initiative. Our next-step.md indicates that our next priority is to architect the ' Implement the backend aggregation functions and the `/api/v1/analytics/dashboard` endpoint.' features.

Let's begin."

By providing that context, I will immediately have all the necessary information about our project's state, our strategic goals, and my specific responsibilities. I'll be ready to execute on the next task without missing a beat.

I look forward to our next session.
# LexiContract AI: Testing & Validation Guide

This document provides a comprehensive guide for testing all components of the LexiContract AI platform.

---

## 1. Environment Setup

### Prerequisites
*   Docker
*   Docker Compose

### Instructions
1.  Ensure you are in the root directory of the `lexiContract-ai` project.
2.  Build and run all application services using Docker Compose:
    ```bash
    docker-compose up --build
    ```
3.  Once the services are running, you can access them:
    *   **Frontend Application:** `http://localhost:3000`
    *   **Backend API Docs:** `http://localhost:8000/docs`

---

## 2. Manual End-to-End Testing

These scenarios validate the core user workflows.

### Test Data
*   `test_data/sample_contract.txt`: A contract with clear dates and obligations for the "happy path" test.
*   `test_data/ambiguous_contract.txt`: A contract with no clear data for the edge case test.

### Scenario 1: Happy Path - Full Post-Signature Lifecycle

1.  **Login:** Navigate to the frontend and register/login with a test user.
2.  **Upload:** Upload `sample_contract.txt`.
3.  **Sign:** Navigate to the contract's detail page and change its status to **"SIGNED"**.
4.  **Verify Extraction:** Check the API logs for the message `Running post-signature extraction...`.
    ```bash
    docker-compose logs -f api
    ```
5.  **Verify Database:** Connect to the database and confirm that `contract_milestones` and `tracked_obligations` records were created.
    ```bash
    docker-compose exec db psql -U user -d lexi_contract_db
    SELECT * FROM contract_milestones;
    SELECT * FROM tracked_obligations;
    ```
6.  **Verify UI:** Refresh the contract detail page, go to the "Management" tab, and confirm the timeline and obligations table are populated correctly. Then, navigate to the "Renewals Dashboard" and ensure the contract is listed.

### Scenario 2: UI Interaction - Update Obligation Status

1.  On the "Management" tab from Scenario 1, locate an obligation in the table.
2.  Change its status from "Pending" to "Completed" using the dropdown.
3.  **Verification:** The UI should update instantly, and the change should be persisted in the `tracked_obligations` table in the database.

### Scenario 3: Idempotency of Notification Scanner

1.  Manually execute the milestone scanner job (see section 4 below).
2.  Verify in the logs that notifications were created.
3.  Execute the same scanner job again.
4.  **Verification:** Check the logs for the message `Notification for user ... already exists. Skipping.` and confirm no new rows were added to the `notifications` table.

### Scenario 4: Edge Case - Ambiguous Contract

1.  Upload `ambiguous_contract.txt` and mark it as "SIGNED".
2.  Navigate to the "Management" tab.
3.  **Verification:** The UI should display messages indicating that no key dates or obligations were extracted.

---

## 3. Automated End-to-End Testing

We use Playwright for automated browser testing of key UI workflows.

### Setup
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install Node.js dependencies:
    ```bash
    npm install
    ```
3.  Install Playwright browsers:
    ```bash
    npx playwright install
    ```

### Running Tests

From the `frontend` directory, run the entire test suite:
```bash
npx playwright test
```

To run a specific test file (e.g., for post-signature features):
```bash
npx playwright test tests/post-signature.spec.ts
```

---

## 4. Manual Job Execution

For testing purposes, you can manually trigger the backend notification jobs without waiting for the scheduler.

### Milestone Scanner
This job runs daily to find upcoming milestones and create notification records.
```bash
docker-compose exec api python jobs/milestone_scanner.py
```

### Notification Dispatcher
This job runs every 5 minutes to "send" pending notifications.
```bash
docker-compose exec api python jobs/dispatcher.py
```

# LexiContract AI: Salesforce Integration Setup Guide

**Audience:** Salesforce Administrators
**Version:** 1.0

## 1. Overview

This guide provides step-by-step instructions for configuring your Salesforce organization to integrate with LexiContract AI. This integration allows your sales team to automatically initiate a contract review in LexiContract AI directly from an Opportunity record by changing its stage.

This setup involves creating a small Apex class and an Apex trigger in your Salesforce environment.

### Prerequisites
*   A LexiContract AI account with an active Enterprise plan.
*   Your Salesforce edition must support Apex triggers (e.g., Enterprise, Unlimited, or Developer Edition).
*   You must have Salesforce administrator permissions to create Apex classes and triggers.

---

## 2. Step 1: Create a Custom Field in Salesforce

To see the contract status from LexiContract AI in Salesforce, you must first create a custom field on the Opportunity object.

1.  In Salesforce Setup, go to **Object Manager**.
2.  Find and click on the **Opportunity** object.
3.  Go to the **Fields & Relationships** section and click **New**.
4.  Select **Text** as the Data Type and click Next.
5.  Enter the following details:
    *   **Field Label:** `LexiContract Status`
    *   **Length:** `50`
    *   **Field Name:** `LexiContract_Status__c`
6.  Click through the remaining steps, accepting the defaults, and then click **Save**.

---

## 2. Step 1: Get Your LexiContract AI Credentials

Before you begin in Salesforce, you need two pieces of information from your LexiContract AI account.

1.  Navigate to **Settings > Integrations** in LexiContract AI.
2.  Find the connected **Salesforce** integration card.
3.  Click **"View Credentials"** or a similar button to reveal your unique `Organization ID` and `Webhook Secret`.
4.  Copy these two values. You will need them in Step 3.

---

## 3. Step 2: Create the Apex Class

This Apex class contains the logic that sends the information to LexiContract AI. We use a `@future` method to make the callout asynchronously, which is a Salesforce best practice.

1.  In Salesforce, navigate to **Setup**.
2.  In the Quick Find box, type `Apex Classes` and select it.
3.  Click **New**.
4.  Copy and paste the following code into the editor.

```apex
public class LexiContractTriggerHandler {

    @future(callout=true)
    public static void initiateContractReview(Id opportunityId, Id organizationId) {
        // In a production environment, fetch the Webhook Secret securely,
        // for example from a Custom Metadata Type or a Protected Custom Setting.
        // For this guide, we will hardcode it.
        // IMPORTANT: Replace 'YOUR_WEBHOOK_SECRET' with the value from LexiContract AI.
        String webhookSecret = 'YOUR_WEBHOOK_SECRET';

        // Construct the request body
        Map<String, String> bodyMap = new Map<String, String>{
            'opportunity_id' => opportunityId,
            'organization_id' => organizationId
        };
        String requestBody = JSON.serialize(bodyMap);

        // Construct the HTTP request
        HttpRequest req = new HttpRequest();
        // IMPORTANT: Replace 'https://api.your-company.com' with your LexiContract AI instance URL.
        req.setEndpoint('https://api.your-company.com/api/v1/integrations/salesforce/webhook');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json;charset=UTF-8');
        req.setHeader('X-Webhook-Secret', webhookSecret);
        req.setBody(requestBody);

        // Send the request
        Http http = new Http();
        try {
            HttpResponse res = http.send(req);
            if (res.getStatusCode() == 202) {
                System.debug('Successfully initiated contract review for Opportunity ' + opportunityId);
            } else {
                System.debug('Error calling LexiContract webhook. Status: ' + res.getStatus() + ' Body: ' + res.getBody());
            }
        } catch(Exception e) {
            System.debug('An exception occurred while calling LexiContract webhook: ' + e.getMessage());
        }
    }
}
```

5.  **IMPORTANT:**
    *   Replace `YOUR_WEBHOOK_SECRET` with the secret you copied from LexiContract AI.
    *   Replace `https://api.your-company.com` with the actual API URL for your LexiContract AI instance if it's different.
6.  Click **Save**.

---

## 4. Step 3: Create the Apex Trigger

This trigger will fire when an Opportunity is updated. It checks if the stage has been changed to "Needs Legal Review" and, if so, calls the Apex class we just created.

1.  In Salesforce Setup, go to **Object Manager**.
2.  Find and click on the **Opportunity** object.
3.  Go to the **Triggers** section and click **New**.
4.  Copy and paste the following code into the editor.

```apex
trigger OpportunityContractReview on Opportunity (after update) {
    // IMPORTANT: Replace with your LexiContract AI Organization ID.
    Id lexiContractOrgId = 'YOUR_LEXICONTRACT_ORGANIZATION_ID';

    // The stage name that will trigger the contract review process.
    // Adjust this value if you use a different stage name.
    String triggerStageName = 'Needs Legal Review';

    for (Opportunity opp : Trigger.new) {
        Opportunity oldOpp = Trigger.oldMap.get(opp.Id);

        // Check if the stage was changed to our target stage
        if (opp.StageName == triggerStageName && oldOpp.StageName != triggerStageName) {
            // Call the future method to send the data to LexiContract AI
            LexiContractTriggerHandler.initiateContractReview(opp.Id, lexiContractOrgId);
        }
    }
}
```

5.  **IMPORTANT:** Replace `YOUR_LEXICONTRACT_ORGANIZATION_ID` with the ID you copied from LexiContract AI. You can also change the `triggerStageName` variable if your organization uses a different stage name.
6.  Click **Save**.

---

## 5. Testing

Your integration is now active. To test it:
1.  Navigate to any Opportunity in Salesforce.
2.  Change its **Stage** to **Needs Legal Review**.
3.  Save the record.
4.  Navigate to your LexiContract AI dashboard. You should see a new contract record appear within a few moments, named after the Opportunity.
# Technical Specification: Advanced Analytics Dashboard

**Document ID:** LXP-TS-009
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for the "Advanced Analytics Dashboard." This feature provides organization leaders with a high-level, data-driven overview of their entire contract portfolio and negotiation process. It aggregates data on contract volume, risk exposure, and cycle times to provide actionable business intelligence.

## 2. Goals

*   Provide at-a-glance Key Performance Indicators (KPIs) such as total contracts, average negotiation time, and contracts currently in review.
*   Visualize the distribution of risk categories across all analyzed contracts.
*   Show contract volume trends over time.
*   Create a scalable backend service to perform the necessary data aggregations efficiently.

## 3. Backend Architecture

### 3.1. New API Endpoint (`api/v1/endpoints/analytics.py`)

The existing `analytics.py` router will be enhanced with a new primary endpoint for this dashboard.

*   **`GET /api/v1/analytics/dashboard`**: This endpoint will aggregate all necessary data and return a single, consolidated JSON object.

    **Response Body (`schemas.FullAnalyticsDashboard`):**
    ```json
    {
      "kpis": { "total_contracts": 150, "contracts_in_progress": 25, "average_cycle_time_days": 8.5 },
      "risk_distribution": [
        { "category": "Liability", "count": 75 },
        { "category": "Unfavorable Terms", "count": 45 }
      ],
      "volume_over_time": [
        { "month": "2023-09", "count": 30 },
        { "month": "2023-10", "count": 50 }
      ]
    }
    ```

### 3.2. New Aggregation Functions (`core/crud.py`)

*   New functions will be created to perform optimized SQL queries for each part of the dashboard: `get_analytics_kpis`, `get_risk_category_distribution`, and `get_contract_volume_over_time`.

## 4. Frontend Architecture

*   **New Page (`/dashboard/analytics`):** A new page will be created to host the dashboard.
*   **Components:** The page will feature three main components:
    1.  **KPI Cards:** A set of cards displaying the key metrics.
    2.  **Risk Distribution Chart:** A bar chart showing the breakdown of risks.
    3.  **Volume Chart:** A line chart showing contract creation volume over time.

## 5. Rollout Plan

1.  **Sprint 1 (Backend):** Implement the aggregation functions in `core/crud.py` and the new `/api/v1/analytics/dashboard` endpoint.
2.  **Sprint 2 (Frontend):** Build the new dashboard page and all associated data visualization components.
3.  **Sprint 3 (Integration & Testing):** Connect the frontend to the backend and write E2E tests to validate the data accuracy and UI.
# Technical Specification: Compliance Insights Dashboard

**Document ID:** LXP-TS-003
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft
**Related Docs:** `LXP-TS-001`, `LXP-TS-002`

## 1. Overview

This document outlines the technical design for the "Compliance Insights Dashboard." This feature provides enterprise customers with a dedicated dashboard to visualize and analyze the findings from all compliance playbooks run across their entire contract portfolio. It aggregates data to reveal trends, identify high-risk contracts, and demonstrate the value of the compliance modules.

## 2. Goals

*   Provide a single, high-level view of an organization's compliance risk profile.
*   Enable users to quickly identify which risk categories (e.g., HIPAA, Data Privacy, FAR) are most prevalent.
*   Highlight contracts with the highest number of compliance-related flags.
*   Design a scalable backend service to aggregate and serve this data efficiently.
*   Build an intuitive and visually appealing frontend dashboard.

## 3. Backend Architecture

### 3.1. New API Endpoints

We will create a new router at `api/v1/endpoints/compliance_analytics.py`. This will house all endpoints related to the new dashboard.

*   **`GET /api/v1/compliance-analytics/summary`**: This will be the primary endpoint for the dashboard. It will return a consolidated JSON object containing all the data needed for the UI.

    **Response Body (`schemas.ComplianceDashboardSummary`):**
    ```json
    {
      "findings_by_category": [
        { "category": "HIPAA", "count": 42 },
        { "category": "Data Privacy", "count": 25 },
        { "category": "FAR", "count": 12 }
      ],
      "top_flagged_contracts": [
        { "contract_id": "...", "filename": "MSA_Vendor_A.pdf", "finding_count": 8 },
        { "contract_id": "...", "filename": "BAA_Partner_B.pdf", "finding_count": 6 }
      ]
    }
    ```

### 3.2. New CRUD/Aggregation Functions

New functions will be added to `core/crud.py` to perform the necessary database aggregations. These queries will be optimized for performance.

*   **`get_compliance_findings_by_category(db, organization_id)`**: Will perform a `GROUP BY` on the `risk_category` of `AnalysisSuggestion` table, joined with `Contract`, to count findings per category.
*   **`get_top_flagged_contracts(db, organization_id, limit=5)`**: Will count compliance-related suggestions per contract and return the top N contracts with the most findings.

## 4. Frontend Architecture

*   **New Page:** A new page will be created at `/dashboard/compliance`.
*   **Data Visualization:** We will use our existing charting library (`Recharts`) to create:
    *   A **Bar Chart** to display "Findings by Risk Category."
    *   A **Table** to list the "Top Flagged Contracts," with links to each contract's detail page.
*   **Data Fetching:** The page will make a single API call to the new `/api/v1/compliance-analytics/summary` endpoint on load to populate all dashboard components.

## 5. Rollout Plan

1.  **Sprint 1 (Backend):** Implement the new aggregation functions in `core/crud.py` and the new API endpoint in `compliance_analytics.py`.
2.  **Sprint 2 (Frontend):** Build the new dashboard page at `/dashboard/compliance` and create the chart and table components.
3.  **Sprint 3 (Integration & Testing):** Connect the frontend components to the new API endpoint. Write a comprehensive E2E test to validate the dashboard's data and functionality.
4.  **Launch:** Announce the new dashboard to all Enterprise customers.
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
# Technical Specification: Post-Signature Management

**Document ID:** LXP-TS-006
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for the "Post-Signature Management" feature set. This initiative extends the LexiContract AI platform beyond negotiation and execution into the critical phase of active contract management. It provides tools to track key dates, monitor obligations, and manage renewals, transforming static legal documents into active, manageable assets.

## 2. Goals

*   Automatically extract and track key dates (e.g., Effective Date, Expiration Date, Renewal Notice Date) from executed contracts.
*   Identify and track key contractual obligations for both our customer and the counterparty.
*   Provide a clear, user-friendly interface for viewing upcoming deadlines and outstanding obligations.
*   Create a notification system to alert users of impending deadlines.
*   Build a dashboard to manage contract renewals and expirations portfolio-wide.

## 3. Backend Architecture

### 3.1. Database Model Additions (`core/models.py`)

Two new models will be introduced to store post-signature data.

1.  **`ContractMilestone`**: Represents a key date or event in the contract's lifecycle.
    *   `id` (PK)
    *   `contract_id` (FK to `Contract`)
    *   `milestone_type` (Enum: `Effective Date`, `Expiration Date`, `Auto-Renewal Date`, `Renewal Notice Deadline`, `Termination Notice Deadline`)
    *   `milestone_date` (Date)
    *   `description` (Text, optional): e.g., "Notice must be provided 60 days prior to expiration."
    *   `created_by_ai` (Boolean): True if extracted by the AI, False if manually added.

2.  **`TrackedObligation`**: Represents a specific, actionable commitment within the contract.
    *   `id` (PK)
    *   `contract_id` (FK to `Contract`)
    *   `obligation_text` (Text): The exact text from the contract defining the obligation.
    *   `responsible_party` (Enum: `Our Company`, `Counterparty`)
    *   `due_date` (Date, optional): The deadline for the obligation, if specified.
    *   `status` (Enum: `Pending`, `In Progress`, `Completed`, `Overdue`)
    *   `created_by_ai` (Boolean): True if extracted by the AI, False if manually added.

### 3.2. AI Service Enhancement (`analyzer.py`)

The `analyze_contract` function will be enhanced with a new post-processing step that runs only on contracts marked as `Signed`.

1.  **Date & Obligation Extraction:** Using a fine-tuned model or advanced regex patterns, the service will scan the `full_text` for common date and obligation phrases ("effective as of", "expires on", "shall provide", "is responsible for").
2.  **Entity Creation:** For each identified item, the service will create a corresponding `ContractMilestone` or `TrackedObligation` record in the database, linking it to the parent contract.

### 3.3. API Endpoint Design

A new router will be created: `api/v1/endpoints/management.py`.

*   **`GET /api/v1/contracts/{contract_id}/milestones`**: List all key dates for a contract.
*   **`GET /api/v1/contracts/{contract_id}/obligations`**: List all tracked obligations for a contract.
*   **`PUT /api/v1/obligations/{obligation_id}`**: Update the status of an obligation (e.g., mark as "Completed").
*   **`GET /api/v1/management/dashboard`**: A new endpoint to aggregate data for the Renewals Dashboard, returning contracts nearing expiration.

## 4. Frontend Architecture

*   **Contract Detail Page (`/dashboard/contracts/{contract_id}`):**
    *   A new "Management" tab will be added.
    *   **Key Dates Timeline:** A visual timeline component will display all `ContractMilestone` items.
    *   **Obligations Table:** A table will list all `TrackedObligation` items, allowing users to view details and update the status.

*   **New Renewals Dashboard (`/dashboard/renewals`):**
    *   A new page dedicated to managing the contract portfolio.
    *   Will feature a filterable, sortable table of all contracts, highlighting those set to expire or renew within the next 30, 60, or 90 days.

## 5. Rollout Plan

1.  **Sprint 1 (Backend - Models & APIs):** Implement the new database models and migrations. Build the CRUD functions and API endpoints for managing milestones and obligations.
2.  **Sprint 2 (Backend - AI Extraction):** Enhance `analyzer.py` with the logic to extract dates and obligations from signed contracts.
3.  **Sprint 3 (Frontend - Contract View):** Build the "Management" tab on the contract detail page, including the timeline and obligations table components.
4.  **Sprint 4 (Frontend - Renewals Dashboard):** Create the new Renewals Dashboard page and connect it to the aggregation API endpoint.
5.  **Sprint 5 (Testing & Notifications):** Write comprehensive E2E tests. Implement the backend notification service for upcoming deadlines.

