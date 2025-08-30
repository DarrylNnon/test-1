# Technical Specification: Notification Service

**Document ID:** LXP-TS-007
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for the backend notification service. This service will proactively alert users about upcoming contract milestones, such as expiration dates and renewal notice deadlines. This is a critical component of the "Post-Signature Management" feature set, ensuring users never miss an important date.

## 2. Goals

*   Create a scalable system for generating and sending notifications.
*   Notify users about milestones at predefined intervals (e.g., 90, 60, 30, 7, and 1 day before the milestone date).
*   Support different notification channels, starting with email.
*   Ensure notifications are not sent multiple times for the same event.
*   Provide a clear audit trail of sent notifications.

## 3. Architecture

The service will consist of a new database model, a scheduled job for generating notifications, a dispatcher for sending them, and an email service.

### 3.1. Database Model (`core/models.py`)

A new `Notification` model will be introduced.

*   `id` (PK)
*   `user_id` (FK to `User`): The recipient of the notification.
*   `contract_id` (FK to `Contract`): The related contract.
*   `milestone_id` (FK to `ContractMilestone`): The specific milestone triggering the notification.
*   `notification_type` (Enum: `Email`, `InApp`): The delivery channel. Default: `Email`.
*   `status` (Enum: `Pending`, `Sent`, `Failed`): The status of the notification. Default: `Pending`.
*   `send_at` (DateTime): The scheduled time for sending the notification.
*   `sent_at` (DateTime, nullable): The actual time the notification was sent.
*   `details` (Text, nullable): e.g., "Reminder: 30 days until expiration".

### 3.2. Scheduled Jobs

We will use a library like `APScheduler` or a simple cron job to run Python scripts.

1.  **`jobs/milestone_scanner.py` (Runs daily at 01:00 UTC)**
    *   **Logic:**
        1.  Define notification windows: `[90, 60, 30, 7, 1]`.
        2.  For each window, calculate the target date (`today + X days`).
        3.  Query for all `ContractMilestone`s where `milestone_date` equals the target date.
        4.  For each found milestone, get all users associated with the contract's organization.
        5.  For each user, check if a `Notification` for this `milestone_id` and `user_id` already exists for this window.
        6.  If no notification exists, create a new `Notification` record with `status='Pending'` and `send_at` set to the current time. The `details` field will be populated (e.g., "90-day reminder for Renewal Notice Deadline").

2.  **`jobs/dispatcher.py` (Runs every 5 minutes)**
    *   **Logic:**
        1.  Query for all `Notification` records where `status='Pending'` and `send_at <= now()`.
        2.  For each pending notification, call the `email_service.send_milestone_reminder(...)` and update the notification `status` to `Sent` or `Failed`.

### 3.3. Email Service (`core/email.py`)

*   A new module will be created to handle email sending logic. For development, it will simply `print()` the email content to the console. In production, this would integrate with a transactional email provider (e.g., SendGrid, AWS SES).

## 4. Rollout Plan

1.  **Sprint 1 (Models & Services):** Implement the `Notification` model and migration. Create the `core/email.py` service with a mock (print-based) sender.
2.  **Sprint 2 (Job Logic):** Implement the `milestone_scanner.py` and `dispatcher.py` job scripts.
3.  **Sprint 3 (Integration & Testing):** Set up a job scheduler (e.g., `APScheduler` integrated with FastAPI). Write tests to verify that notifications are created and "sent" correctly.