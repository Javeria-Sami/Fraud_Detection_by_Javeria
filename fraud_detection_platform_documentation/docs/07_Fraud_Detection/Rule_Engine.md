# Fraud Rule Engine Architecture & Execution Lifecycle

## 1. Overview & Architecture

The **Rule-Based Fraud Engine** is a deterministic, configurable, versioned, explainable, and production-grade security component. It evaluates streaming financial transactions against historical feature snapshots without dynamic code evaluation (`eval()`), ensuring complete auditability and injection safety.

```text
Transaction Context + Feature Snapshot
                 ↓
    FraudRuleEngineService
                 │
  ┌──────────────┼──────────────┐
  │              │              │
Rule 1: HIGH_AMOUNT (v1.0)      │
Rule 2: RAPID_TRANSACTIONS (v1.0)
Rule 3: NEW_DEVICE (v1.0)       │
Rule 4: UNUSUAL_LOCATION (v1.0) │
Rule 5: UNUSUAL_TIME (v1.0)     │
Rule 6: FAILED_ATTEMPTS (v1.0)  │
Rule 7: SUDDEN_SPENDING (v1.0)  │
Rule 8: MERCHANT_ANOMALY (v1.0) │
Rule 9: BEHAVIOR_DEVIATION (v1.0)
                 ↓
  Structured Rule Evaluation Results
                 ↓
  Persist RuleExecution Records (Audit Trail)
                 ↓
  Return Deterministic Rule Signals & Explanations
```

---

## 2. Core Principles & Design Guarantees

1. **Deterministic Execution**: Given identical transaction details and feature snapshots, rule evaluation produces strictly identical results, scores, reasons, and evidence.
2. **Dynamic Version Resolution**: Rules are associated with version records (`fraud_rule_versions`). Only the designated active version executes, while historical executions maintain immutable references to the exact version used at evaluation time.
3. **Safe JSON Configuration Validation**: Rules accept structured JSON configuration parameters validated via `RuleConfigValidator`. Negative thresholds, invalid data types, unknown feature keys, and script injection payloads are strictly rejected.
4. **Fault Tolerance & Error Isolation**: Each rule executes inside an isolated error boundary. If a single rule fails due to an unexpected edge case or data irregularity, the error is logged, an error result is recorded, and all remaining rules continue normal evaluation.
5. **Full Explainability & Evidence**: Triggered rules produce human-readable, factual natural-language explanations and structured evidence dictionaries (feature name, actual value, threshold, operator) for dashboard analysis.

---

## 3. Rule Interface (`BaseRule`)

```python
class BaseRule(ABC):
    code: str
    name: str
    description: str
    category: RuleCategory
    default_severity: RuleSeverity
    default_weight: float

    def run(
        self,
        transaction: Dict[str, Any],
        features: Dict[str, Any],
        configuration: Optional[Dict[str, Any]] = None,
        version: str = "1.0",
        rule_id: Optional[str] = None,
        rule_version_id: Optional[str] = None,
        weight_override: Optional[float] = None,
        severity_override: Optional[RuleSeverity] = None
    ) -> RuleEvaluationResult:
        ...

    @abstractmethod
    def evaluate(
        self,
        transaction: Dict[str, Any],
        features: Dict[str, Any],
        configuration: Dict[str, Any],
        version: str
    ) -> RuleEvaluationResult:
        ...
```

---

## 4. Execution Persistence (`RuleExecution`)

All evaluated rules produce auditable records in the `rule_executions` table:

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (String 36) | Unique execution identifier |
| `transaction_id` | String 50 | Foreign key to `transactions.id` |
| `rule_id` | String 50 | Foreign key to `fraud_rules.id` |
| `rule_version_id` | UUID (String 36) | Foreign key to `fraud_rule_versions.id` |
| `triggered` | Boolean | Whether rule condition was met |
| `score` | Float | Score points awarded |
| `reason` | Text | Human-readable explanation |
| `execution_time_ms` | Float | Micro-benchmark latency in milliseconds |
| `execution_detail` | JSON | Structured evidence and matched features snapshot |
| `created_at` | DateTime (UTC) | Execution timestamp |

---

## 5. Micro-Performance Benchmarks

- **Evaluator Latency**: Sub-0.1ms per rule on local test environment.
- **Batch Evaluation**: 100 complete rule engine evaluations (9 rules each = 900 rule executions) executed in < 0.20 seconds (~1.8 ms total pipeline duration per evaluation).
