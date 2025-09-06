# Technical Specification: Advanced Team & Workspace Management

**Document ID:** LXP-TS-021
**Version:** 1.1
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Final
 
## 1. Overview

This document outlines the technical design for the "Advanced Team & Workspace Management" feature. This initiative allows large organizations to structure their legal operations by creating teams, assigning users to those teams, and assigning contracts to specific teams. This provides a foundational layer for more granular access control and better organization of work within the platform.

## 2. Goals

*   Allow organization administrators to create, rename, and delete teams.
*   Enable administrators to add users from their organization to teams and remove them.
*   Assign roles within a team (e.g., `member`, `lead`).
*   Provide a mechanism to assign a contract to a single team.
*   Ensure that access to contracts can be limited based on team assignment (Note: The enforcement of these permissions will be handled by the existing ABAC system, which will be updated to use team data).

## 3. Backend Architecture

### 3.1. New Database Models (`core/models.py`)

1.  **`Team` Model**: Represents a team within an organization.
    *   `id` (PK)
    *   `name` (String): The name of the team (e.g., "Sales Contracts Team", "Procurement Legal").
    *   `organization_id` (FK to `Organization`)

2.  **`TeamMembership`**: An association table connecting users to teams.
    *   `user_id` (FK to `User`, PK)
    *   `team_id` (FK to `Team`, PK)
    *   `role` (Enum: `member`, `lead`): The user's role within the team.

### 3.2. `Contract` Model Update

*   A new nullable `team_id` field will be added to the `Contract` model.
    *   `team_id` (FK to `Team`, nullable): The team this contract is assigned to.
    *   A `team` relationship will be added for easy access.

### 3.3. New API Endpoints (`api/v1/endpoints/teams.py`)

A new router at `api/v1/endpoints/teams.py` will be created to manage team-related actions. All endpoints will require administrator privileges.
*   `POST /api/v1/teams/`: Create a new team.
*   `GET /api/v1/teams/`: List all teams for the organization.
*   `GET /api/v1/teams/{team_id}`: Get details for a single team, including its members.
*   `PUT /api/v1/teams/{team_id}`: Update a team's name.
*   `DELETE /api/v1/teams/{team_id}`: Delete a team.
*   `POST /api/v1/teams/{team_id}/members`: Add a user to a team. (Request Body: `{ "user_id": "...", "role": "member" }`)
*   `DELETE /api/v1/teams/{team_id}/members/{user_id}`: Remove a user from a team.
 
A new endpoint will be added to `api/v1/endpoints/contracts.py` to manage the assignment.
*   `PUT /api/v1/contracts/{contract_id}/team`: Assigns or unassigns a contract to a team.
    *   Request Body: `{ "team_id": "uuid-of-team" | null }`

## 4. Frontend Architecture

*   **New Settings Section (`/dashboard/settings/teams`):** A new area within the organization settings for team management.
    *   **Main Page (`/dashboard/settings/teams`):** Displays a list of all teams. Allows admins to create new teams and navigate to a team's detail page.
    *   **Detail Page (`/dashboard/settings/teams/{team_id}`):** Allows admins to rename the team, view a list of team members, add new members from the organization, and remove existing members.

*   **Contract View Enhancement:**
    *   A new dropdown component labeled "Assigned Team" will be added to the contract detail view.
    *   The dropdown will be populated with the list of teams from `GET /api/v1/teams/`.
    *   When a user selects a team, the frontend will call `PUT /api/v1/contracts/{contract_id}/team`.

## 5. Rollout Plan

1.  **Backend - Models & APIs:** Implement the `Team` and `TeamMembership` models and migrations. Update the `Contract` model. Build the full set of CRUD API endpoints in `teams.py` and the contract assignment endpoint in `contracts.py`.
2.  **Frontend - Admin UI:** Build the team management UI under `/dashboard/settings/teams`, including the list, detail, create, and member management pages/modals.
3.  **Frontend - Contract Integration:** Add the "Assigned Team" dropdown to the contract detail page and connect it to the new API endpoint.
4.  **Testing:** Write comprehensive E2E tests for the full team management and contract assignment workflow.
5.  **Permissions Integration:** Update the ABAC policy engine to incorporate team assignments into its access decisions.