# LexiContract AI: HubSpot Integration Setup Guide

**Audience:** HubSpot Administrators
**Version:** 1.0

## 1. Overview

This guide provides step-by-step instructions for configuring your HubSpot account to integrate with LexiContract AI. This integration allows your team to automatically initiate a contract review in LexiContract AI directly from a HubSpot Deal.

This setup involves creating a custom property for status tracking and a simple HubSpot Workflow to trigger our service.

### Prerequisites
*   A LexiContract AI account with an active Enterprise plan.
*   A HubSpot account with permissions to create custom properties and workflows (e.g., Professional or Enterprise subscription).
*   The HubSpot integration must be connected in your LexiContract AI settings (`/settings/integrations`).

---

## 2. Step 1: Create a Custom Property in HubSpot

To see the contract status from LexiContract AI in HubSpot, you must first create a custom property on the Deal object.

1.  In HubSpot, navigate to **Settings** (the gear icon in the top right).
2.  In the left sidebar, go to **Properties** (under Data Management).
3.  Ensure the "Deal properties" tab is selected and click **Create property**.
4.  Configure the property with the following details:
    *   **Object type:** `Deal`
    *   **Group:** `Deal information`
    *   **Label:** `LexiContract Status`
    *   **Internal name:** `lexicontract_status` (This must be exact)
5.  Click **Next**.
6.  For **Field type**, select **Single-line text**.
7.  Click **Create**. This property will now be available on your Deal records and will be automatically updated by LexiContract AI.

---

## 3. Step 2: Get Your LexiContract AI Organization ID

You will need your unique Organization ID to configure the webhook.

1.  In LexiContract AI, navigate to **Settings > Organization**.
2.  Copy your **Organization ID**. You will need this in the next step.

---

## 4. Step 3: Create the HubSpot Workflow

This workflow will automatically trigger the contract review process.

1.  In HubSpot, navigate to **Automation > Workflows**.
2.  Click **Create workflow** and choose **From scratch**.
3.  Select **Deal-based** and click **Next**.

### Workflow Trigger

1.  Click **Set up triggers**.
2.  Select **Deal property** as the filter type.
3.  Choose the **Deal stage** property.
4.  Select the stage that should initiate the review (e.g., **"Contract Sent"** or a custom stage like **"Legal Review"**).
5.  Click **Save**.

### Workflow Action (Webhook)

1.  Click the **+** icon to add an action.
2.  Under "Workflow", select **Send a webhook**.
3.  Set the **Method** to `POST`.
4.  Set the **Webhook URL** to your LexiContract AI instance's webhook endpoint:
    `https://api.your-company.com/api/v1/integrations/hubspot/webhook`
5.  In the **Request body** section, select **Customize request body**.
6.  Paste the following JSON into the text area. **This structure is critical.**
    ```json
    {
      "deal_id": "{DEAL_ID}",
      "organization_id": "YOUR_ORGANIZATION_ID"
    }
    ```
7.  Use the **"Token"** dropdown to replace `{DEAL_ID}`. Search for and select the **"Deal ID"** property.
8.  Replace `YOUR_ORGANIZATION_ID` with the ID you copied from LexiContract AI in Step 2.
9.  Click **Save**.

### Finalize Workflow

1.  Click **Review and publish** in the top right.
2.  Give your workflow a name (e.g., "LexiContract AI Trigger").
3.  Review the settings and turn the workflow **on**.

Your integration is now active. When a deal is moved to the trigger stage, a new contract will automatically be created in LexiContract AI.