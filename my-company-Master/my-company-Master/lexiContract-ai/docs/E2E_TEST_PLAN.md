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