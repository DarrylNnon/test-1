# Technical Specification: Contract Insights & Reporting Engine

**Document ID:** LXP-TS-020
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for the "Contract Insights & Reporting Engine." This feature provides a powerful, user-driven reporting tool that allows organization leaders and legal teams to create, save, and share custom reports and visualizations. It moves beyond static dashboards to empower users to query their contract data dynamically, uncovering trends and insights related to contract metadata, risk analysis, and negotiation outcomes.

## 2. Goals

*   Empower non-technical users to build custom reports through an intuitive UI.
*   Allow reports to be built from multiple data sources: contract metadata, identified risks, and negotiation data.
*   Support dynamic filtering, grouping, and aggregation of data.
*   Provide multiple visualization options (e.g., tables, bar charts, line charts, pie charts).
*   Enable users to save and share their report configurations.
*   Design a secure, scalable, and extensible backend engine to execute these custom queries.

## 3. Backend Architecture

### 3.1. New Database Model (`core/models.py`)

A new model will be created to store user-defined report configurations.

1.  **`CustomReport`**: Represents a saved report definition.
    *   `id` (PK)
    *   `name` (String): The user-given name for the report.
    *   `description` (Text, nullable)
    *   `organization_id` (FK to `Organization`)
    *   `created_by_id` (FK to `User`)
    *   `configuration` (JSONB): A JSON object that stores the entire report definition, including data source, filters, aggregations, and visualization type.

    **Example `configuration`:**
    ```json
    {
      "dataSource": "contracts",
      "metrics": [{ "field": "id", "aggregation": "count" }],
      "groupBy": { "field": "contract_type" },
      "filters": [
        { "field": "status", "operator": "eq", "value": "SIGNED" },
        { "field": "created_at", "operator": "gte", "value": "2023-01-01T00:00:00Z" }
      ],
      "visualizationType": "bar_chart"
    }
    ```

### 3.2. New Reporting Engine Service (`core/reporting_engine.py`)

This new service will be the heart of the feature. It will be responsible for dynamically translating a report `configuration` object into a safe and efficient SQLAlchemy query.

*   **`execute_report_query(config, organization_id)`**:
    1.  Parses the `config` object.
    2.  Selects the base model(s) based on `dataSource`.
    3.  Dynamically constructs `WHERE` clauses from the `filters` array. All user input will be treated as parameters to prevent SQL injection.
    4.  Constructs `GROUP BY` clauses from the `groupBy` object.
    5.  Constructs aggregate functions (e.g., `COUNT`, `AVG`) from the `metrics` array.
    6.  Executes the query and returns the data in a format suitable for frontend charting libraries.

### 3.3. New API Endpoints (`api/v1/endpoints/reports.py`)

A new router will manage all reporting-related actions.

*   **`POST /api/v1/reports/execute`**: The primary data-retrieval endpoint. It accepts a report `configuration` in the request body, passes it to the `reporting_engine`, and returns the resulting data. This is used for live previews in the report builder.
*   **`POST /api/v1/reports`**: Saves a new `CustomReport` definition to the database.
*   **`GET /api/v1/reports`**: Lists all saved reports for the user's organization.
*   **`GET /api/v1/reports/{report_id}`**: Retrieves a single saved `CustomReport` definition.
*   **`PUT /api/v1/reports/{report_id}`**: Updates a saved report.
*   **`DELETE /api/v1/reports/{report_id}`**: Deletes a saved report.

## 4. Frontend Architecture

*   **New Page (`/dashboard/reports`):** A central hub for this feature. It will display a grid or list of all saved reports for the user's organization, with options to view, edit, or delete them. It will also contain the primary "Create New Report" call-to-action.

*   **New Page (`/dashboard/reports/builder`):** The interactive report builder UI.
    *   **Layout:** A multi-panel layout with configuration options on the left and a live preview of the report/visualization on the right.
    *   **Components:**
        *   **Data Source Selector:** Choose the primary entity to report on (e.g., Contracts, Risks).
        *   **Filter Builder:** An intuitive UI to add/remove filter conditions.
        *   **Metrics & Dimensions:** UI to select fields for aggregation (`metrics`) and grouping (`groupBy`).
        *   **Visualization Picker:** A toolbar to select the chart type (Table, Bar, Line, etc.).
    *   **Interaction:** As the user modifies the configuration, the frontend will send the updated `configuration` object to the `POST /api/v1/reports/execute` endpoint and re-render the visualization with the new data.

*   **New Page (`/dashboard/reports/{report_id}`):** A page to display a single, saved report. It will fetch the report configuration, execute it, and render the resulting visualization.

## 5. Rollout Plan

1.  **Sprint 1 (Backend Foundation):** Implement the `CustomReport` model and the full set of CRUD API endpoints in `reports.py` for saving, listing, and managing report definitions.
2.  **Sprint 2 (Backend Engine):** Implement the `core/reporting_engine.py` service and the `POST /api/v1/reports/execute` endpoint. The initial version will support queries on the `Contract` model.
3.  **Sprint 3 (Frontend Builder):** Build the report builder UI at `/dashboard/reports/builder`. Implement all configuration components (filters, metrics, etc.).
4.  **Sprint 4 (Frontend Integration):** Connect the builder UI to the `/execute` endpoint to enable the live preview. Implement the data visualization components using our charting library.
5.  **Sprint 5 (Polish & Expand):** Build the main reports listing page (`/dashboard/reports`). Expand the reporting engine to support more complex data sources (e.g., joining `Contract` with `AnalysisSuggestion`). Write comprehensive E2E tests.