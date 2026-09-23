# Entity Relationship Diagram (ERD) & Relational Model

This document specifies the complete production-grade relational database architecture implemented for the **Real-Time Fraud & Anomaly Detection Platform** (Section 02).

## High-Level Relational Diagram (Mermaid)

```mermaid
erDiagram
    ROLES ||--o{ ROLE_PERMISSIONS : "assigned"
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : "assigned"
    ROLES ||--o{ USERS : "assigned_to"
    
    USERS ||--o{ TRANSACTIONS : "initiates"
    USERS ||--o{ DEVICES : "owns/operates"
    USERS ||--o{ USER_RISK_PROFILES : "has_profile"
    USERS ||--o{ AUDIT_LOGS : "acts_in"
    USERS ||--o{ CASES : "subject_or_assigned"
    USERS ||--o{ ALERTS : "subject_or_assigned"

    MERCHANTS ||--o{ TRANSACTIONS : "receives"
    MERCHANTS ||--o{ MERCHANT_RISK_PROFILES : "has_profile"

    DEVICES ||--o{ TRANSACTIONS : "originates"
    DEVICES ||--o{ DEVICE_RISK_PROFILES : "has_profile"

    TRANSACTIONS ||--o{ FEATURE_SNAPSHOTS : "generates"
    TRANSACTIONS ||--o{ RULE_EXECUTIONS : "evaluates"
    TRANSACTIONS ||--o{ ML_PREDICTIONS : "predicted_by"
    TRANSACTIONS ||--o{ RISK_SCORES : "scored_as"
    TRANSACTIONS ||--o{ ALERTS : "triggers"
    TRANSACTIONS ||--o{ CASE_TRANSACTIONS : "linked_to"

    FRAUD_RULES ||--o{ FRAUD_RULE_VERSIONS : "versioned_as"
    FRAUD_RULES ||--o{ RULE_EXECUTIONS : "executed_in"

    MODEL_VERSIONS ||--o{ ML_PREDICTIONS : "infers"

    ALERTS ||--o{ CASE_ALERTS : "grouped_into"
    CASES ||--o{ CASE_ALERTS : "contains"
    CASES ||--o{ CASE_TRANSACTIONS : "references"
    CASES ||--o{ CASE_NOTES : "contains"
    CASES ||--o{ CASE_EVIDENCE : "contains"
    CASES ||--o{ CASE_HISTORY : "tracks"
```

## Relational Invariants & Integrity Rules

1. **Transaction Integrity**: Every `transaction` record references a valid `user_id`, optional `merchant_id` (or indexed `merchant_name`), and optional `device_id`.
2. **Deterministic & ML Explainability**: Every evaluation against a transaction generates a permanent audit trail via `rule_executions`, `ml_predictions`, and `risk_scores` linked with foreign keys and cascade rules.
3. **Investigation Lifecycles**: Cases aggregate both alerts (`case_alerts`) and direct transactions (`case_transactions`) alongside auditable notes (`case_notes`), tamper-evident timeline events (`case_history`), and structured artifacts (`case_evidence`).
4. **Zero Anonymous Mutations**: Notes, historical changes, evidence uploads, and system configurations capture authenticated `author_id` or `actor_user_id`.
