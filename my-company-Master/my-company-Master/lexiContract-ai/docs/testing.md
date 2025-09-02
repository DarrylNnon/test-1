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

### Scenario 5: Happy Path - Google Drive Import

1.  **Login:** Navigate to the frontend and register/login with a test user.
2.  **Connect Integration:** In `/settings/integrations`, connect your Google Drive account. (For local testing, this may require manual DB entries or mocked API calls).
3.  **Navigate to Dashboard:** Go to the main contract list/dashboard.
4.  **Open Import Modal:** Click the button to import a new contract and select "Import from Google Drive".
5.  **Select File:** The file picker modal should appear, listing files from your Google Drive. Select a document.
6.  **Import:** Click the "Import" button.
7.  **Verification:** You should be redirected to the detail page for the newly created contract, and its analysis status should be "pending". A new contract record should exist in the database, linked to the Google Drive file via the `external_id` and `organization_integration_id` fields.

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
