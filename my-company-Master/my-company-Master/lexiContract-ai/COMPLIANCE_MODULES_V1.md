# Technical Specification: Advanced Compliance Modules V1

**Document ID:** LXP-TS-001
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for the first iteration of the "Advanced Compliance Modules" feature, as defined in our strategic `ROADMAP.md`. The initial focus is on building a flexible framework for compliance analysis, with the first concrete implementation being **GDPR/CCPA PII Detection**.

This feature will be a premium offering, gated by the "Enterprise" subscription plan.

## 2. Goals

*   Create a reusable backend framework for defining and applying compliance rule sets (Playbooks) to contracts.
*   Implement a PII Detection Playbook to automatically scan contracts for clauses related to personal data.
*   Surface these compliance-related findings in the contract detail view alongside existing analysis suggestions.
*   Ensure the system is extensible for future playbooks (e.g., HIPAA, FAR) without major architectural changes.

## 3. Backend Architecture

### 3.1. Database Models

We will introduce two new models in `core/models.py`:

1.  **`CompliancePlaybook`**: Represents a collection of rules for a specific regulation.
    *   `id` (int, PK)
    *   `name` (str, unique): e.g., "GDPR/CCPA PII Detection"
    *   `description` (str): A brief explanation of the playbook's purpose.
    *   `is_active` (bool): Allows us to enable/disable playbooks system-wide.
    *   `rules` (relationship): One-to-many relationship to `PlaybookRule`.

2.  **`PlaybookRule`**: Represents a single rule within a playbook.
    *   `id` (int, PK)
    *   `playbook_id` (int, FK to `CompliancePlaybook`)
    *   `name` (str): e.g., "Data Processing Clause"
    *   `description` (str): Explains what the rule looks for and why it's important.
    *   `pattern` (str): A regular expression used to find matching text in a contract.
    *   `risk_category` (str): e.g., "PII", "Data Privacy".

### 3.2. Analysis Service (`analyzer.py`)

The `analyze_contract` function will be updated:

1.  After the initial text extraction, it will retrieve all `active` `CompliancePlaybooks` from the database.
2.  It will iterate through each playbook and its associated rules.
3.  For each rule, it will use the `pattern` (regex) to search the contract's `full_text`.
4.  If a match is found, a new `AnalysisSuggestion` will be created with the `risk_category` and `comment` from the `PlaybookRule`. This seamlessly integrates compliance findings into our existing suggestion system.

### 3.3. API Endpoints

No new public-facing API endpoints are required for V1. The compliance analysis will be triggered as part of the existing contract upload and analysis flow. We will, however, need internal CRUD endpoints for managing playbooks and rules, accessible only to system administrators.

## 4. Frontend Changes

*   **Contract Detail View:** No major changes are needed initially. The compliance findings will appear as standard `AnalysisSuggestion` cards, distinguished by their `risk_category` (e.g., "PII").
*   **Future Enhancements:** We will later add UI elements to filter suggestions by type (e.g., "AI Suggestions" vs. "Compliance Flags") and provide more context about the specific playbook that triggered the finding.

## 5. Gating & Entitlements

The compliance analysis logic in `analyzer.py` will be wrapped in a check against the organization's subscription status.

```python
# In analyzer.py
db_org = crud.get_organization_by_id(db, organization_id=...)
if db_org.subscription_plan == "enterprise":
    # ... run compliance playbook logic ...
```

## 6. Rollout Plan

1.  **Sprint 1 (Backend):** Implement `CompliancePlaybook` and `PlaybookRule` models and schemas. Create admin CRUD endpoints for management.
2.  **Sprint 2 (Backend):** Update `analyzer.py` to incorporate the playbook analysis logic. Seed the database with the initial GDPR/CCPA playbook.
3.  **Sprint 3 (Frontend & Testing):** Verify that compliance suggestions appear correctly in the UI. Add comprehensive E2E tests for the new logic.
4.  **Launch:** Announce the new feature to Enterprise customers.