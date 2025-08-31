# Technical Specification: Advanced Access Control (ABAC)

**Document ID:** LXP-TS-013
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for an Attribute-Based Access Control (ABAC) system within LexiContract AI. This feature is designed to meet the advanced security and compliance needs of our enterprise customers by allowing them to define fine-grained access policies for their contracts. This moves beyond our current Role-Based Access Control (RBAC) system (admin/member) to a more flexible and powerful model.

## 2. Goals

*   Allow organizations to control access to contracts based on a combination of user attributes and contract attributes.
*   Define policies that grant permissions (e.g., `view`, `edit`, `comment`, `delete`) based on these attributes.
*   Support attributes like `department` and `sensitivity_level`.
*   Build a scalable and performant policy enforcement engine.
*   Provide a clear API for managing access control policies.

## 3. Core ABAC Concepts

The system will be based on four core concepts:

1.  **Subject:** The user attempting an action. Key attributes: `role`, `department`.
2.  **Action:** The operation being performed. Examples: `view`, `edit`, `delete`, `share_externally`.
3.  **Resource:** The object being acted upon (the `Contract`). Key attributes: `department`, `sensitivity_level`.
4.  **Policy:** A rule that combines the above to grant or deny permission. Example: "Allow users in the 'Legal' department to 'edit' any contract with a 'High' sensitivity level."

## 4. Backend Architecture

### 4.1. Database Model Additions

To support ABAC, we will add attributes to existing models and introduce a new `AccessPolicy` model.

*   **`core/models.py` - `User` model additions:**
    *   `department` (String, nullable): The department the user belongs to (e.g., "Legal", "Sales").

*   **`core/models.py` - `Contract` model additions:**
    *   `department` (String, nullable): The department associated with the contract.
    *   `sensitivity_level` (Enum: `Low`, `Medium`, `High`, `Restricted`): The sensitivity classification of the contract.

*   **`core/models.py` - New `AccessPolicy` model:**
    *   `id` (PK)
    *   `name` (String): A human-readable name for the policy.
    *   `organization_id` (FK to `Organization`)
    *   `subject_attributes` (JSONB): e.g., `{"role": "admin"}` or `{"department": "Sales"}`
    *   `actions` (ARRAY(String)): e.g., `["view", "edit"]`
    *   `resource_attributes` (JSONB): e.g., `{"department": "Sales"}` or `{"sensitivity_level": "High"}`
    *   `effect` (Enum: `allow`): For V1, we will only support "allow" policies. The default behavior is to deny.

### 4.2. Policy Enforcement Engine

A new module, `core/access_control.py`, will contain the enforcement logic.

*   **`can(user: models.User, action: str, resource: models.Contract) -> bool`**: This will be the central function.
*   **Logic:**
    1.  The function will retrieve all policies for the user's organization.
    2.  It will iterate through each policy.
    3.  For a policy to match, all `subject_attributes` in the policy must match the user's attributes, AND the requested `action` must be in the policy's `actions` list, AND all `resource_attributes` in the policy must match the contract's attributes.
    4.  If any matching `allow` policy is found, the function returns `True`.
    5.  If no matching policy is found after checking all of them, it returns `False`.

### 4.3. API Changes

*   **New Policy Management Endpoints (`api/v1/endpoints/policies.py`):**
    *   `POST /policies`: Create a new access policy.
    *   `GET /policies`: List all policies for the organization.
    *   `DELETE /policies/{policy_id}`: Delete a policy.
*   **Existing Endpoint Integration:** Key endpoints like `GET /contracts/{contract_id}` will be modified. They will first fetch the contract, then call `access_control.can(user, 'view', contract)`. If it returns `False`, a `403 Forbidden` error will be raised.

## 5. Rollout Plan

1.  **Sprint 1 (Backend Foundation):** Implement the database model changes and create the `AccessPolicy` model and migrations.
2.  **Sprint 2 (Policy Engine):** Build the core policy enforcement engine in `core/access_control.py`.
3.  **Sprint 3 (API Integration):** Create the policy management APIs and integrate the `can()` check into critical contract endpoints.
4.  **Sprint 4 (Frontend UI):** Build the frontend interface for administrators to create and manage access policies.