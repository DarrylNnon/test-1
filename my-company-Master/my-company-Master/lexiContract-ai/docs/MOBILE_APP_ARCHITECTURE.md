# Technical Specification: Mobile Application (Read-Only Companion)

**Document ID:** LXP-TS-022
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft

## 1. Overview

This document outlines the technical design for the "Mobile Application (Read-Only Companion)." This is a native mobile application for iOS and Android that provides users with read-only access to key contract information. The primary goal is to increase user engagement and provide value outside of the core desktop negotiation workflow by delivering timely information and notifications.

## 2. Goals

*   Allow users to securely log in to their LexiContract AI account.
*   View a list of their contracts.
*   View key details for a specific contract, including its status and upcoming milestones.
*   Receive push notifications for important events, such as upcoming renewal deadlines.
*   Provide a consistent and high-quality user experience on both iOS and Android.

## 3. Technology Choices

*   **Framework:** **React Native with Expo**. This allows us to build a cross-platform application from a single codebase, significantly reducing development time and effort. Expo provides a robust ecosystem of tools, including a managed workflow for builds, updates, and push notifications, which simplifies the development and deployment process.
*   **Push Notifications:** **Expo Push Notifications**. This service provides a unified API for sending notifications to both Apple Push Notification service (APNS) and Firebase Cloud Messaging (FCM) without needing to manage platform-specific code.

## 4. Backend Architecture Changes

### 4.1. New Database Model (`core/models.py`)

A new model is required to store user device tokens for push notifications.

1.  **`UserDevice`**: Represents a specific mobile device registered by a user.
    *   `id` (PK)
    *   `user_id` (FK to `User`)
    *   `device_token` (String, unique): The unique push notification token provided by Expo/APNS/FCM.
    *   `device_type` (Enum: `ios`, `android`): The operating system of the device.
    *   `created_at` (DateTime)

### 4.2. New API Endpoint (`api/v1/endpoints/users.py`)

A new endpoint will be added to allow the mobile app to register a device for push notifications.

*   **`POST /api/v1/users/me/devices`**:
    *   **Request Body:** `{ "token": "...", "type": "ios" | "android" }`
    *   **Logic:** Creates or updates a `UserDevice` record for the currently authenticated user.

### 4.3. Notification Dispatcher Enhancement (`jobs/dispatcher.py`)

The existing notification dispatcher job will be updated to send push notifications in addition to emails.

*   **Logic:** When processing a pending notification, the dispatcher will:
    1.  Check the user's notification preferences (future feature).
    2.  Fetch all `UserDevice` tokens for the recipient user.
    3.  For each token, construct a push notification payload and send it via the Expo Push Notifications API.

## 5. Mobile App Architecture

*   **Authentication:**
    *   The app will use the same JWT-based authentication as the web client.
    *   Tokens will be stored securely on the device using `expo-secure-store`.
*   **Navigation:**
    *   We will use `react-navigation` to manage the app's screen flow.
*   **Key Screens:**
    *   **Login Screen:** For users to enter their credentials.
    *   **Contracts Dashboard:** A list view of all contracts accessible to the user.
    *   **Contract Detail Screen:** A read-only view showing contract status, key dates, and obligations.
    *   **Notifications Screen:** A list of in-app notifications received.
    *   **Settings Screen:** To manage account settings and log out.
*   **Push Notification Handling:**
    *   On login, the app will request permission for push notifications.
    *   If granted, it will get the device token and send it to our backend via the new `POST /users/me/devices` endpoint.
    *   The app will include listeners to handle notifications when the app is in the foreground, background, or closed.

## 6. Rollout Plan

1.  **Sprint 1 (Backend):** Implement the `UserDevice` model and the API endpoint for registering device tokens.
2.  **Sprint 2 (Backend):** Update the notification dispatcher to send push notifications via the Expo API.
3.  **Sprint 3 (Mobile App Foundation):** Set up the React Native project with Expo. Implement the authentication flow and secure token storage.
4.  **Sprint 4 (Mobile App UI):** Build the Contracts Dashboard and Contract Detail screens.
5.  **Sprint 5 (Push Notifications & Testing):** Integrate push notification handling into the mobile app. Write E2E tests for the full mobile workflow.
6.  **Sprint 6 (Deployment):** Prepare and submit the application to the Apple App Store and Google Play Store.