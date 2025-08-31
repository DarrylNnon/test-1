# Technical Specification: Advanced Compliance Modules V2

**Document ID:** LXP-TS-002
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft
**Related Docs:** `LXP-TS-001` (Compliance Modules V1)

## 1. Overview

This document outlines the technical design for the second iteration of the "Advanced Compliance Modules" feature. Building on the successful V1 framework, this phase focuses on developing **Industry-Specific Playbooks**, starting with:

1.  **HIPAA Playbook:** For customers in the healthcare sector handling Protected Health Information (PHI).
2.  **FAR Playbook:** For customers engaged in U.S. federal government contracting.

These playbooks will be part of the "Enterprise" subscription and will solidify our position as a must-have tool for companies in regulated industries.

## 2. Goals

*   Extend the existing `CompliancePlaybook` framework to support industry-specific rule sets.
*   Implement the initial HIPAA and FAR playbooks with a focus on identifying key clauses and requirements.
*   Introduce a mechanism for organizations to optionally enable or disable specific industry playbooks relevant to their business.
*   Enhance the frontend to provide users with more context about which compliance checks were performed.

## 3. Backend Architecture Enhancements

The V1 architecture is largely sufficient, but minor enhancements are needed for better targeting and management.

### 3.1. Database Model Updates

We will add a new field to the `CompliancePlaybook` model in `core/models.py`:

*   **`industry` (str, nullable):** An optional field to categorize playbooks. e.g., "Healthcare", "Government", "Finance". This allows for better organization and filtering.

We will also introduce a new association table to manage which organizations have enabled which industry-specific playbooks:

*   **`OrganizationPlaybookAssociation`**:
    *   `organization_id` (FK to `organizations`)
    *   `playbook_id` (FK to `compliance_playbooks`)

This provides explicit control over which playbooks run for a given customer, preventing irrelevant findings for out-of-scope industries.

### 3.2. Analysis Service (`analyzer.py`) Update

The `analyze_contract` function will be modified. Instead of fetching all active playbooks, it will now fetch:
1.  All active playbooks where `industry` is `NULL` (i.e., general playbooks like GDPR/CCPA).
2.  All active playbooks that the contract's organization has explicitly enabled via the `OrganizationPlaybookAssociation` table.

This ensures the analysis is precisely tailored to the customer's business context.

## 4. Frontend Changes

*   **Organization Settings Page:** A new section will be added for "Compliance Settings." Here, organization admins can see a list of available industry playbooks (HIPAA, FAR) and toggle them on or off.
*   **Contract Detail View:** We will add a small UI element (e.g., an info icon or a "Compliance" section in the sidebar) that lists which playbooks were run during the analysis (e.g., "GDPR/CCPA PII Detection," "HIPAA Compliance"). This increases transparency and reinforces the value of the feature.

## 5. Rollout Plan

1.  **Sprint 1 (Backend):** Implement the database model changes and update the `analyzer.py` logic to respect organization-specific playbook settings.
2.  **Sprint 2 (Backend):** Research and seed the initial rules for the HIPAA and FAR playbooks using the admin CRUD endpoints.
3.  **Sprint 3 (Frontend):** Build the "Compliance Settings" UI in the organization management dashboard.
4.  **Sprint 4 (Frontend & Testing):** Implement the UI enhancement on the contract detail page. Write E2E tests to verify the new settings are respected and the correct playbooks are run.
5.  **Launch:** Announce the new industry-specific capabilities to relevant customer segments.