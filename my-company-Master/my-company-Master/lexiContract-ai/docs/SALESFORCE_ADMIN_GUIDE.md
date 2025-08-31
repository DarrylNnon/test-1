# LexiContract AI: Salesforce Integration Setup Guide

**Audience:** Salesforce Administrators
**Version:** 1.0

## 1. Overview

This guide provides step-by-step instructions for configuring your Salesforce organization to integrate with LexiContract AI. This integration allows your sales team to automatically initiate a contract review in LexiContract AI directly from an Opportunity record by changing its stage.

This setup involves creating a small Apex class and an Apex trigger in your Salesforce environment.

### Prerequisites
*   A LexiContract AI account with an active Enterprise plan.
*   Your Salesforce edition must support Apex triggers (e.g., Enterprise, Unlimited, or Developer Edition).
*   You must have Salesforce administrator permissions to create Apex classes and triggers.

---

## 2. Step 1: Create a Custom Field in Salesforce

To see the contract status from LexiContract AI in Salesforce, you must first create a custom field on the Opportunity object.

1.  In Salesforce Setup, go to **Object Manager**.
2.  Find and click on the **Opportunity** object.
3.  Go to the **Fields & Relationships** section and click **New**.
4.  Select **Text** as the Data Type and click Next.
5.  Enter the following details:
    *   **Field Label:** `LexiContract Status`
    *   **Length:** `50`
    *   **Field Name:** `LexiContract_Status__c`
6.  Click through the remaining steps, accepting the defaults, and then click **Save**.

---

## 2. Step 1: Get Your LexiContract AI Credentials

Before you begin in Salesforce, you need two pieces of information from your LexiContract AI account.

1.  Navigate to **Settings > Integrations** in LexiContract AI.
2.  Find the connected **Salesforce** integration card.
3.  Click **"View Credentials"** or a similar button to reveal your unique `Organization ID` and `Webhook Secret`.
4.  Copy these two values. You will need them in Step 3.

---

## 3. Step 2: Create the Apex Class

This Apex class contains the logic that sends the information to LexiContract AI. We use a `@future` method to make the callout asynchronously, which is a Salesforce best practice.

1.  In Salesforce, navigate to **Setup**.
2.  In the Quick Find box, type `Apex Classes` and select it.
3.  Click **New**.
4.  Copy and paste the following code into the editor.

```apex
public class LexiContractTriggerHandler {

    @future(callout=true)
    public static void initiateContractReview(Id opportunityId, Id organizationId) {
        // In a production environment, fetch the Webhook Secret securely,
        // for example from a Custom Metadata Type or a Protected Custom Setting.
        // For this guide, we will hardcode it.
        // IMPORTANT: Replace 'YOUR_WEBHOOK_SECRET' with the value from LexiContract AI.
        String webhookSecret = 'YOUR_WEBHOOK_SECRET';

        // Construct the request body
        Map<String, String> bodyMap = new Map<String, String>{
            'opportunity_id' => opportunityId,
            'organization_id' => organizationId
        };
        String requestBody = JSON.serialize(bodyMap);

        // Construct the HTTP request
        HttpRequest req = new HttpRequest();
        // IMPORTANT: Replace 'https://api.your-company.com' with your LexiContract AI instance URL.
        req.setEndpoint('https://api.your-company.com/api/v1/integrations/salesforce/webhook');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json;charset=UTF-8');
        req.setHeader('X-Webhook-Secret', webhookSecret);
        req.setBody(requestBody);

        // Send the request
        Http http = new Http();
        try {
            HttpResponse res = http.send(req);
            if (res.getStatusCode() == 202) {
                System.debug('Successfully initiated contract review for Opportunity ' + opportunityId);
            } else {
                System.debug('Error calling LexiContract webhook. Status: ' + res.getStatus() + ' Body: ' + res.getBody());
            }
        } catch(Exception e) {
            System.debug('An exception occurred while calling LexiContract webhook: ' + e.getMessage());
        }
    }
}
```

5.  **IMPORTANT:**
    *   Replace `YOUR_WEBHOOK_SECRET` with the secret you copied from LexiContract AI.
    *   Replace `https://api.your-company.com` with the actual API URL for your LexiContract AI instance if it's different.
6.  Click **Save**.

---

## 4. Step 3: Create the Apex Trigger

This trigger will fire when an Opportunity is updated. It checks if the stage has been changed to "Needs Legal Review" and, if so, calls the Apex class we just created.

1.  In Salesforce Setup, go to **Object Manager**.
2.  Find and click on the **Opportunity** object.
3.  Go to the **Triggers** section and click **New**.
4.  Copy and paste the following code into the editor.

```apex
trigger OpportunityContractReview on Opportunity (after update) {
    // IMPORTANT: Replace with your LexiContract AI Organization ID.
    Id lexiContractOrgId = 'YOUR_LEXICONTRACT_ORGANIZATION_ID';

    // The stage name that will trigger the contract review process.
    // Adjust this value if you use a different stage name.
    String triggerStageName = 'Needs Legal Review';

    for (Opportunity opp : Trigger.new) {
        Opportunity oldOpp = Trigger.oldMap.get(opp.Id);

        // Check if the stage was changed to our target stage
        if (opp.StageName == triggerStageName && oldOpp.StageName != triggerStageName) {
            // Call the future method to send the data to LexiContract AI
            LexiContractTriggerHandler.initiateContractReview(opp.Id, lexiContractOrgId);
        }
    }
}
```

5.  **IMPORTANT:** Replace `YOUR_LEXICONTRACT_ORGANIZATION_ID` with the ID you copied from LexiContract AI. You can also change the `triggerStageName` variable if your organization uses a different stage name.
6.  Click **Save**.

---

## 5. Testing

Your integration is now active. To test it:
1.  Navigate to any Opportunity in Salesforce.
2.  Change its **Stage** to **Needs Legal Review**.
3.  Save the record.
4.  Navigate to your LexiContract AI dashboard. You should see a new contract record appear within a few moments, named after the Opportunity.