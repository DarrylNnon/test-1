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