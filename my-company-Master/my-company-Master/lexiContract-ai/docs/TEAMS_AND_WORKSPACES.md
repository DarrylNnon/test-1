# Technical Specification: Advanced Team & Workspace Management

**Document ID:** LXP-TS-021
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for the "Advanced Team & Workspace Management" feature. This functionality is essential for our enterprise customers, enabling them to organize users into teams, assign contracts to those teams, and manage permissions at a team level. This enhances security, streamlines collaboration, and simplifies contract administration for large organizations.

## 2. Goals

*   Allow organization administrators to create, rename, and delete teams.
*   Allow admins to add existing users from their organization to teams and remove them.
*   Allow users with appropriate permissions to assign a contract to a single team.
*   Provide a dedicated UI within the settings area for admins to manage teams.
*   Integrate team assignment directly into the contract detail view.

## 3. Backend Architecture

The backend implementation will leverage the existing `Team` and `TeamMembership` models, which are already defined in `core/models.py`. The existing API endpoints in `api/v1/endpoints/teams.py` provide the necessary CRUD operations for managing teams and their members.

### 3.1. Existing Database Models (`core/models.py`)

*   **`Team`**: Represents a team within an organization.
*   **`TeamMembership`**: A join table linking `User` and `Team`.
*   **`Contract`**: The model already contains a `team_id` (ForeignKey to `Team`) and a `team` relationship, allowing a contract to be associated with one team.

### 3.2. Existing API Endpoints (`api/v1/endpoints/teams.py`)

The following admin-protected endpoints are already implemented and will be used by the frontend:
*   `POST /api/v1/teams/`: Create a new team.
*   `GET /api/v1/teams/`: List all teams for the organization.
*   `GET /api/v1/teams/{team_id}`: Get details for a single team, including its members.
*   `PUT /api/v1/teams/{team_id}`: Update a team's name.
*   `DELETE /api/v1/teams/{team_id}`: Delete a team.
*   `POST /api/v1/teams/{team_id}/members`: Add a user to a team.
*   `DELETE /api/v1/teams/{team_id}/members/{user_id}`: Remove a user from a team.

### 3.3. New API Endpoint (`api/v1/endpoints/contracts.py`)

A new endpoint must be added to manage the assignment of a contract to a team.

*   **`PUT /api/v1/contracts/{contract_id}/team`**:
    *   **Description:** Assigns or unassigns a contract to a team.
    *   **Request Body:** `schemas.ContractTeamAssignment` -> `{ "team_id": "uuid-of-team" | null }`
    *   **Permissions:** Restricted to organization admins or users with future "editor" roles.
    *   **Logic:** The endpoint will call a new CRUD function, `assign_contract_to_team`, to update the `team_id` on the specified contract record.

## 4. Frontend Architecture

*   **New Settings Page (`/dashboard/settings/teams`):**
    *   This page will be accessible to organization admins.
    *   It will list all existing teams and provide a "Create Team" button that opens a creation modal.
    *   Each team in the list will link to its detail page.

*   **New Team Detail Page (`/dashboard/settings/teams/{team_id}`):**
    *   Displays the team name (with an edit/rename option).
    *   Lists all current team members.
    *   Provides an "Add Member" modal to add existing organization users to the team.
    *   Provides a "Remove" button next to each member.
    *   Includes a "Delete Team" button with a confirmation dialog.

*   **Contract Detail Page Enhancement (`/dashboard/contracts/{contract_id}`):**
    *   A new dropdown/select component labeled "Assigned Team" will be added to the contract detail view.
    *   The dropdown will be populated with the list of teams fetched from `GET /api/v1/teams/`.
    *   When a user selects a team, the frontend will call `PUT /api/v1/contracts/{contract_id}/team` with the selected `team_id`.

## 5. Rollout Plan

1.  **Sprint 1 (Backend):** Implement the new `PUT /api/v1/contracts/{contract_id}/team` endpoint and the corresponding `assign_contract_to_team` CRUD function.
2.  **Sprint 2 (Frontend - Admin UI):** Build the team management UI under `/dashboard/settings/teams`, including the list, detail, create, and member management pages.
3.  **Sprint 3 (Frontend - Contract Integration):** Add the "Assigned Team" dropdown to the contract detail page and connect it to the new API endpoint.
4.  **Sprint 4 (Testing):** Write comprehensive E2E tests for the full team management and contract assignment workflow.