# Fraud Rule Configuration & Validation

## 1. Safe JSON Schema Validation

All rule configurations are strictly verified using `RuleConfigValidator` before being persisted as active `FraudRuleVersion` records. Dynamic evaluation (`eval()`, `exec()`, `lambda`) is strictly prohibited.

### Validation Rules:
- **No Negative Numbers**: Multipliers, window durations, count thresholds, and minimum amounts must be non-negative.
- **Strict Data Types**: Counts and hours must be integers; multipliers and amounts must be numerical.
- **Allowed Feature Names**: Only features exposed by Section 06 `FeatureSnapshot` are accepted.
- **Forbidden Payloads**: Keys containing `__`, `eval`, `exec`, `import`, or system commands trigger an immediate `RuleConfigValidationError` (`HTTP 422`).

---

## 2. Admin Version Management API

### List Rule Versions
```http
GET /api/v1/admin/rules/{rule_id}/versions
Authorization: Bearer <ADMIN_JWT>
```

### Create & Activate New Rule Version
```http
POST /api/v1/admin/rules/{rule_id}/versions
Authorization: Bearer <ADMIN_JWT>
Content-Type: application/json

{
  "version": "2.0",
  "configuration": {
    "multiplier": 6.0,
    "min_amount": 750.0,
    "mode": "user_deviation"
  },
  "threshold": 750.0,
  "weight": 30.0,
  "is_active": true
}
```

When a new active version is created, prior active versions for that rule are smoothly deactivated, ensuring deterministic single-active-version resolution while preserving historical execution links.
