# LexiContract AI - Access Control Review Procedure

**Policy ID:** LXP-SEC-006
**Version:** 1.0
**Effective Date:** 2023-10-28
**Owner:** Chief Technology Officer (CTO)
**Review Cycle:** Annual

## 1.0 Purpose

This document outlines the official procedure for conducting periodic reviews of user access to LexiContract AI's information systems. The purpose is to enforce the principle of least privilege, ensuring that personnel only have the access required to perform their job functions. This procedure directly supports the Access Control section of the Information Security Policy (`LXP-SEC-001`).

## 2.0 Scope

This procedure applies to all systems that store or process data classified as "Confidential" or "Restricted," including but not limited to:
*   Cloud infrastructure provider consoles (e.g., AWS IAM).
*   Source code management systems (e.g., GitHub).
*   Production databases and servers.
*   Third-party SaaS platforms with access to sensitive company or customer data.

## 3.0 Roles and Responsibilities

*   **Security Officer:** Owns and coordinates the end-to-end review process. Responsible for generating reports, tracking completion, and archiving evidence.
*   **System Owner / Manager:** The individual responsible for a specific system or for managing a team of users. They act as the "Reviewer."
*   **Reviewer:** The System Owner or Manager who reviews the access rights of users under their purview and attests to their appropriateness.

## 4.0 Quarterly Review Procedure

1.  **Initiation:** During the first week of each calendar quarter (Jan, Apr, Jul, Oct), the Security Officer will initiate the access review process.
2.  **Report Generation:** The Security Officer will generate and distribute user access reports from all in-scope systems to the designated Reviewers. Each report will list the user and their assigned roles/permissions.
3.  **Review and Attestation:** The Reviewer must examine the access list for their system/team and, for each user, attest in writing (e.g., via a signed document or a ticket in a tracking system) to the following:
    *   Is the user's access still required for their job function?
    *   Are the user's permission levels appropriate and in line with the principle of least privilege?
4.  **Remediation:** If a Reviewer identifies unnecessary or excessive permissions, they must create a remediation request. The Security Officer or system administrator will revoke or modify the access within five (5) business days.
5.  **Documentation:** All completed review reports, attestations, and evidence of remediation will be centrally archived by the Security Officer for a minimum of three (3) years to serve as audit evidence.

## 5.0 Event-Driven Reviews

In addition to quarterly reviews, access reviews must be performed under the following circumstances:

*   **Employee Termination:** All access for a departing employee or contractor must be revoked within 24 hours of their last day of employment. The manager is responsible for notifying the Security Officer.
*   **Role Change:** When an employee transfers to a new role or department, their manager must immediately request an access review to ensure their permissions are realigned with their new responsibilities. Previous, unnecessary permissions must be revoked.

## 6.0 Enforcement

Timely completion of access reviews is mandatory. The Security Officer will track all reviews to completion. Any reviews not completed within the designated quarterly window will be escalated to the CTO.