# Technical Specification: Compliance & Audit Hub

**Document ID:** LXP-TS-020
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for the "Compliance & Audit Hub." This feature will create a centralized dashboard for compliance officers and administrators to provide a unified view of the organization's security and compliance posture. It will aggregate data and provide quick access to managing Compliance Playbooks, reviewing Audit Logs, and overseeing Access Policies.

## 2. Goals

*   Provide a single pane of glass for all compliance-related activities.
*   Offer at-a-glance summaries of key compliance metrics.
*   Streamline navigation to detailed management pages for playbooks, logs, and policies.
*   Enhance the value proposition for security-conscious enterprise customers.

## 3. Backend Architecture

The backend work for this feature is minimal, as it primarily involves aggregating data from existing sources.

### 3.1. New API Endpoint (`api/v1/endpoints/compliance.py`)

A new endpoint will be created to fetch all the data needed for the hub in a single request.

*   `GET /api/v1/compliance/hub-summary`:
    *   **Logic:**
        1.  Fetches a summary of enabled Compliance Playbooks (e.g., count of enabled playbooks).
        2.  Fetches the 5 most recent Audit Log entries.
        3.  Fetches a summary of Access Policies (e.g., total policy count).
    *   **Response:** A single JSON object containing the aggregated data.
        ```json
        {
          "playbook_summary": { "enabled_count": 3, "total_count": 5 },
          "recent_audit_logs": [ ... ],
          "access_policy_summary": { "policy_count": 12 }
        }
        ```

## 4. Frontend Architecture

### 4.1. New Dashboard Page

A new page will be created at `/compliance`. This page will be accessible to organization administrators only.

### 4.2. Dashboard Components

The page will be a dashboard composed of several widgets:

1.  **Compliance Playbooks Widget:**
    *   Displays the number of enabled playbooks.
    *   Provides a "Manage Playbooks" button that links to the existing playbook management page.

2.  **Access Policies Widget:**
    *   Displays the total number of active access policies.
    *   Provides a "Manage Policies" button that links to the existing ABAC policy management page (`/settings/policies`).

3.  **Recent Activity (Audit Log) Widget:**
    *   Displays a list of the 5 most recent audit log entries.
    *   Includes the user, the action, and the timestamp for each entry.
    *   Provides a "View All Logs" button that links to a full audit log page.

## 5. Rollout Plan

1.  **Sprint 1 (Backend):** Implement the `GET /api/v1/compliance/hub-summary` endpoint.
2.  **Sprint 2 (Frontend):** Build the frontend dashboard page and its individual widgets (Playbooks, Policies, Audit Logs).
3.  **Sprint 3 (Integration & Testing):** Connect the frontend dashboard to the backend API and write E2E tests for the hub.