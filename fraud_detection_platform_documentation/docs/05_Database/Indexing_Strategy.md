# Indexing & Query Optimization Strategy

To support high-throughput financial transactions and sub-second investigation analytics, the database utilizes targeted single-column and composite B-Tree indexes:

| Table | Index Field(s) | Query Intent & Optimization |
| :--- | :--- | :--- |
| `users` | `email`, `username` | Fast authentication lookups and uniqueness enforcement. |
| `merchants` | `merchant_code` | Foreign key resolution and merchant filtering. |
| `devices` | `device_identifier` | Rapid novel/known device fingerprint lookup during ingestion. |
| `transactions` | `transaction_id`, `user_id`, `merchant_id`, `device_id`, `status`, `transaction_timestamp` | Primary real-time stream querying, user transaction history, and time-range filtering. |
| `alerts` | `alert_id`, `status`, `severity`, `assigned_to`, `created_at` | Security Operations Center (SOC) queue prioritization, status triage, and assignment. |
| `cases` | `case_id`, `status`, `assigned_to`, `created_at` | Analyst caseload filtering and SLA tracking. |
| `audit_logs` | `actor_user_id`, `entity_type`, `entity_id`, `created_at` | Compliance discovery, security forensics, and chronological audits. |
| `fraud_rules` | `rule_code`, `is_active`, `category` | In-memory/active rule retrieval during pipeline execution. |
| `risk_scores` | `transaction_id`, `risk_level` | High-risk triage and score distribution analytics. |
