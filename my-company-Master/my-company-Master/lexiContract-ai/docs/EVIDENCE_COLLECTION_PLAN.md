# LexiContract AI - SOC 2 Evidence Collection Plan

**Document ID:** LXP-AUD-001
**Version:** 1.0
**Effective Date:** 2023-10-28
**Owner:** Security Officer

## 1.0 Purpose

This document provides a structured plan for gathering the evidence required for the SOC 2 Type II audit. It serves as a checklist to ensure all necessary artifacts are collected and prepared for the auditors, demonstrating that our policies and controls are operating effectively over the specified review period.

## 2.0 Evidence Collection Checklist

The Security Officer is responsible for collecting and organizing the following evidence for a representative sample of items within the audit period.

### Control Area: Change Management (Ref: `LXP-SEC-002`)

*   **[ ] Evidence 1.1:** A sample of 5-10 merged pull requests from the audit period.
    *   **Artifact:** Direct links to GitHub PRs. Each PR must show: required peer approval, passing CI/CD checks (including security scans), and a link to the deployment log.
*   **[ ] Evidence 1.2:** Proof of enforcement for the change management process.
    *   **Artifact:** Screenshot of the GitHub branch protection rules for the `main` branch, showing that status checks and approvals are required before merging.

### Control Area: Access Control (Ref: `LXP-SEC-006`)

*   **[ ] Evidence 2.1:** Proof of quarterly access reviews.
    *   **Artifact:** The completed and signed attestation forms/tickets from the most recent quarterly review for AWS IAM, GitHub, and production database access.
*   **[ ] Evidence 2.2:** Proof of timely access revocation upon termination.
    *   **Artifact:** HR offboarding ticket for a recently terminated employee, along with corresponding logs showing access was revoked within the 24-hour SLA.
*   **[ ] Evidence 2.3:** Proof of MFA enforcement.
    *   **Artifact:** Screenshots from AWS IAM and GitHub organization settings demonstrating that MFA is mandatory for all users.

### Control Area: Vulnerability Management (Ref: `security.yml`)

*   **[ ] Evidence 3.1:** Proof of automated vulnerability scanning.
    *   **Artifact:** Links to several `security.yml` workflow runs, showing successful Snyk and Trivy scan steps.
*   **[ ] Evidence 3.2:** Proof of vulnerability remediation.
    *   **Artifact:** A ticket from our issue tracker for a `HIGH` or `CRITICAL` vulnerability identified by a scan, showing the discussion, assignment, and the linked PR that remediated the issue.

### Control Area: Incident Response (Ref: `LXP-SEC-003`)

*   **[ ] Evidence 4.1:** Proof of IR plan testing.
    *   **Artifact:** The post-mortem report from our most recent annual IR tabletop exercise, including the scenario, participants, lessons learned, and any resulting action items.

### Control Area: Availability & Recovery (Ref: `LXP-SEC-004`)

*   **[ ] Evidence 5.1:** Proof of backup recovery testing.
    *   **Artifact:** The documented results from the last quarterly backup recovery test, including the time taken to restore (verifying RTO) and confirmation of data integrity.
*   **[ ] Evidence 5.2:** Proof of backup security.
    *   **Artifact:** Screenshots of the AWS S3 bucket configuration for backups, showing that encryption-at-rest and cross-region replication are enabled.

### Control Area: Security Awareness (Ref: `LXP-SEC-001`)

*   **[ ] Evidence 6.1:** Proof of employee training.
    *   **Artifact:** A report from our training platform showing a 100% completion rate for the annual security awareness module for all active employees.