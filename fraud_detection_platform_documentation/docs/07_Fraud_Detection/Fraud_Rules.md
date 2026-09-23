# Fraud Detection Rules Catalog & Lifecycle

The platform implements 9 deterministic, modular fraud rules. Each rule is implemented as a standalone class inheriting from `BaseRule`, registered in the `RuleRegistry`, and evaluated by `FraudRuleEngineService`.

## Summary Table

| Rule Code | Category | Default Severity | Default Weight | Key Trigger Condition |
| :--- | :--- | :--- | :--- | :--- |
| `HIGH_AMOUNT` | AMOUNT | HIGH | 25.0 | Spend exceeds 5.0x historical baseline average |
| `RAPID_TRANSACTIONS` | VELOCITY | HIGH | 25.0 | >= 4 transactions within 5 minutes |
| `NEW_DEVICE` | DEVICE | MEDIUM | 20.0 | Unrecognized device fingerprint for customer |
| `UNUSUAL_LOCATION` | LOCATION | HIGH | 30.0 | Hop velocity > 700 km/h or unseen foreign country |
| `UNUSUAL_TIME` | TIME | LOW | 15.0 | Overnight window (01:00-05:00 UTC) with elevated amount |
| `FAILED_ATTEMPTS` | FAILED_ATTEMPTS | HIGH | 25.0 | >= 2 failed PIN/CVV authorizations preceding txn |
| `SUDDEN_SPENDING_INCREASE` | BEHAVIOR | MEDIUM | 20.0 | >= 10 transactions in 1 hour or sudden surge |
| `MERCHANT_ANOMALY` | MERCHANT | HIGH | 25.0 | Crypto/casino high-risk category with deviation |
| `BEHAVIOR_DEVIATION` | BEHAVIOR | CRITICAL | 35.0 | Simultaneous novel device + location leap |

---

## Rule Lifecycle & Versioning

```text
[Draft Configuration] → [Validation via RuleConfigValidator] → [Create FraudRuleVersion]
                                                                          ↓
                                                               [Activate Version]
                                                                          ↓
                                                      [Executed in Ingestion Pipeline]
                                                                          ↓
                                                      [Persist in rule_executions]
```

- **Immutability**: Changing rule configuration creates a new `FraudRuleVersion` record (`v1.1`, `v2.0`). Existing historical `RuleExecution` records point directly to their evaluation-time `rule_version_id` to guarantee audit trail fidelity.
