# Rule Management & Administration

## 1. Overview
The Rule Administration engine provides a secure, version-controlled, auditable lifecycle interface for enterprise fraud detection rules. It allows authorized fraud risk architects and security administrators to adjust detection heuristics, parameter boundaries, severity levels, and risk weights without touching application source code or restarting services.

## 2. Security & Anti-Injection Architecture
To ensure strict security and maintain compliance with financial regulations:
- **Zero Arbitrary Executable Code**: Under no circumstances does the platform accept Python `eval()`, `exec()`, arbitrary SQL expressions, JavaScript runtimes, or dynamic shell commands.
- **Predefined Rule Types**: All rules strictly adhere to predefined, domain-tested algorithmic models:
  - `HIGH_AMOUNT`: Evaluates user spending baseline deviations and absolute amounts.
  - `RAPID_TRANSACTIONS`: Velocity monitoring within sliding minute windows.
  - `NEW_DEVICE`: Novel device identifier identification and risk penalty.
  - `UNUSUAL_LOCATION`: Geo-hop velocity (km/h) and novel country travel detection.
  - `UNUSUAL_TIME`: Off-hours transactions (UTC) with baseline expenditure multipliers.
  - `FAILED_ATTEMPTS`: Consecutive authentication / CVV failure accumulation.
  - `SUDDEN_SPENDING_INCREASE`: Hourly velocity spikes and transaction burst ratios.
  - `MERCHANT_ANOMALY`: High-risk merchant categories (Crypto, Casinos, Wire Transfer) and novel merchants.
  - `BEHAVIOR_DEVIATION`: Compound multi-vector behavioral anomalies.
- **Server-Side Validation**: `RuleConfigValidator` validates schema keys, ranges (e.g., $1 \le \text{window} \le 1440$), bounds, types, and feature registry dependencies prior to version creation.

## 3. Immutable Versioning & Lifecycle State Machine
```
[ Draft Configuration ]
        │
        ▼ (Validate Schema & Bounds)
[ Validated Version ]
        │
        ▼ (Admin Activation & Audit Log)
 [ Active Version (vN) ] ──(Supersedes)──► [ Retired Version (vN-1) ]
```
- **Historical Immutability**: Existing rule versions stored in `fraud_rule_versions` are never updated in place. Once a version evaluates a transaction, its configuration is frozen to ensure audit reproducibility.
- **Atomic Activation**: Database transactions ensure that activating a new version atomically marks the predecessor version as inactive/retired while updating the parent `fraud_rules` table with the active version pointer, threshold, and score weight.
- **Reproducibility Guarantee**: Every `rule_executions` record permanently links to the exact `rule_version_id` that evaluated the transaction, ensuring forensic fidelity years into the future.

## 4. Rule Simulation Workbench
- **In-Memory Dry Run**: Administrators can evaluate new or existing configurations against synthetic transactions or baseline scenarios.
- **Zero Production Side Effects**: Simulation strictly executes through in-memory rule instances without emitting websocket alerts, persisting database executions, incrementing risk scores, or triggering downstream notification channels.
- **Diagnostic Feedback**: Returns execution latency, trigger boolean, observed vs threshold values, calculated score contribution, and detailed natural language rationale.

## 5. Audit Logging & Concurrency
- Every version creation, activation, retirement, and update emits an immutable record in `audit_logs` capturing the administrator ID, resource ID, action name, before/after parameters, and IP address context.
- Optimistic locking and version checking prevent conflicting concurrent configuration changes.
