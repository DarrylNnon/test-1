# Technical Specification: Geopolitical Risk Analysis Module

**Document ID:** LXP-TS-004
**Version:** 1.0
**Author:** Gemini Code Assist, Lead Engineer
**Status:** Draft
**Related Docs:** `LXP-TS-001`, `LXP-TS-002`

## 1. Overview

This document outlines the technical design for the "Geopolitical Risk Analysis Module," a new feature within our Advanced Compliance Suite. This module will automatically identify "Governing Law" and "Jurisdiction" clauses in contracts, extract the specified country or region, and flag potential risks based on a predefined risk matrix.

This feature will be part of the "Enterprise" subscription plan.

## 2. Goals

*   Leverage our existing `CompliancePlaybook` framework to implement geopolitical risk analysis.
*   Accurately identify and extract country/state names from governing law clauses.
*   Provide clear, actionable risk ratings (e.g., Low, Medium, High) to users.
*   Ensure the risk data source is easily updatable without requiring a code deployment.

## 3. Backend Architecture

### 3.1. New Compliance Playbook

We will create a new, non-industry-specific playbook named "Geopolitical Risk Analysis." This playbook will be active for all enterprise customers by default.

*   **Rules:** The playbook will contain rules with regex patterns designed to find common phrasings for governing law clauses, such as:
    *   `governed by the laws of...`
    *   `subject to the exclusive jurisdiction of...`
    *   `venue for any dispute...`

### 3.2. Analysis Service (`analyzer.py`) Enhancements

The analysis logic will be enhanced to handle this new type of rule.

1.  **Pattern Matching:** The service will first use the regex from the playbook rule to find the entire governing law clause.
2.  **Entity Extraction:** After a match, a secondary step will extract the specific location (country or state) from the matched text. For V1, this can be achieved with a targeted list of known countries and U.S. states.
3.  **Risk Assessment:** The extracted location will be checked against a new internal risk data source.

### 3.3. Geopolitical Risk Data Source

A new JSON file, `core/data/geopolitical_risk.json`, will be created to store risk ratings. This allows for easy updates.

**Example `geopolitical_risk.json`:**
```json
{
  "Switzerland": { "risk": "Low", "comment": "Stable legal framework and strong contract enforcement." },
  "Delaware (USA)": { "risk": "Low", "comment": "Well-established and predictable corporate law." },
  "Russia": { "risk": "High", "comment": "Subject to international sanctions and legal unpredictability." }
}
```

## 4. Frontend Architecture

*   **No V1 Changes:** For the initial release, no frontend changes are required. The findings will be surfaced as standard `AnalysisSuggestion` cards, categorized under "Geopolitical Risk." This allows for rapid delivery of value. Future iterations can include dedicated UI elements on the Compliance Insights Dashboard.

## 5. Rollout Plan

1.  **Sprint 1 (Backend):** Create the `geopolitical_risk.json` data file. Update `analyzer.py` with the new extraction and risk assessment logic.
2.  **Sprint 2 (Backend):** Seed the new "Geopolitical Risk Analysis" playbook and its rules into the database.
3.  **Sprint 3 (Testing):** Write a comprehensive E2E test to verify that a contract with a high-risk jurisdiction clause correctly generates a "Geopolitical Risk" suggestion.
4.  **Launch:** Announce the new capability to all Enterprise customers.