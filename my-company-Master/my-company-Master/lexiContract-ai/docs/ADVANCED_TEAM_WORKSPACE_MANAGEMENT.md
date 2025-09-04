# Technical Specification: Advanced Team & Workspace Management

**Document ID:** LXP-TS-021
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for the "Advanced Team & Workspace Management" feature. This initiative allows large organizations to structure their legal operations by creating teams, assigning users to those teams, and assigning contracts to specific teams. This provides a foundational layer for more granular access control and better organization of work within the platform.

## 2. Goals

*   Allow organization administrators to create, rename, and delete teams.
*   Enable administrators to add users from their organization to teams and remove them.
*   Assign roles within a team (e.g., `Member`, `Lead`).
*   Provide a mechanism to assign a contract to a single team.
*   Ensure that access to contracts can be limited based on team assignment (Note: The enforcement of these permissions will be handled by the existing ABAC system, which will be updated to use team data).

## 3. Backend Architecture

### 3.1. New Database Models (`core/models.py`)

1.  **`Team`**: Represents a team within an organization.
    *   `id` (PK)
    *   `name` (String): The name of the team (e.g., "Sales Contracts Team", "Procurement Legal").
    *   `organization_id` (FK to `Organization`)

2.  **`TeamMembership`**: An association table connecting users to teams.
    *   `user_id` (FK to `User`, PK)
    *   `team_id` (FK to `Team`, PK)
    *   `role` (Enum: `member`, `lead`): The user's role within the team.

### 3.2. `Contract` Model Update (`core/models.py`)

*   A new nullable `team_id` field will be added to the `Contract` model.
    *   `team_id` (FK to `Team`, nullable): The team this contract is assigned to.

### 3.3. New API Endpoints (`api/v1/endpoints/teams.py`)

A new router will be created to manage all team-related actions. All endpoints will require administrator privileges.

*   **`POST /api/v1/teams`**: Create a new team.
*   **`GET /api/v1/teams`**: List all teams in the user's organization.
*   **`GET /api/v1/teams/{team_id}`**: Get details for a single team, including its members.
*   **`PUT /api/v1/teams/{team_id}`**: Update a team's name.
*   **`DELETE /api/v1/teams/{team_id}`**: Delete a team.

*   **`POST /api/v1/teams/{team_id}/members`**: Add a user to a team.
    *   Request Body: `{ "user_id": "...", "role": "member" }`
*   **`DELETE /api/v1/teams/{team_id}/members/{user_id}`**: Remove a user from a team.

*   **`PUT /api/v1/contracts/{contract_id}/assign_team`**: Assign a contract to a team.
    *   Request Body: `{ "team_id": "..." }`

## 4. Frontend Architecture

*   **New Settings Section (`/dashboard/settings/teams`):** A new area within the organization settings for team management.
    *   **Main Page (`/dashboard/settings/teams`):** Displays a list of all teams. Allows admins to create new teams and navigate to a team's detail page.
    *   **Detail Page (`/dashboard/settings/teams/{team_id}`):** Allows admins to rename the team, view a list of team members, add new members from the organization, and remove existing members.

*   **Contract View Enhancement:**
    *   The contract list and detail pages will be updated to display which team a contract is assigned to.
    *   An interface (e.g., a dropdown menu) will be added to the contract detail page to allow authorized users to assign or re-assign a contract to a team.

## 5. Rollout Plan

1.  **Sprint 1 (Backend Foundation):** Implement the `Team` and `TeamMembership` models and migrations. Build the full set of CRUD API endpoints in `teams.py` for managing teams and their members.
2.  **Sprint 2 (Backend Contract Logic):** Update the `Contract` model to include `team_id`. Implement the API endpoint for assigning a contract to a team.
3.  **Sprint 3 (Frontend UI):** Build the team management pages under `/dashboard/settings/teams`, allowing for creation, listing, and member management.
4.  **Sprint 4 (Frontend Integration):** Integrate the contract assignment UI on the contract detail page. Update contract views to display team information.
5.  **Sprint 5 (Permissions & Testing):** Update the ABAC policy engine to incorporate team assignments into its access decisions. Write comprehensive E2E tests for the entire feature.