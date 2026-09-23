# Transaction Lifecycle & Status Transitions

## 1. Lifecycle State Progression

```text
               ┌───────────────┐
               │    PENDING    │
               └───────┬───────┘
                       │
         ┌─────────────┼─────────────┬─────────────┐
         ▼             ▼             ▼             ▼
   ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
   │ COMPLETED │ │  DECLINED │ │   FAILED  │ │ CANCELLED │
   │(APPROVED) │ │ (BLOCKED) │ │           │ │           │
   └─────┬─────┘ └───────────┘ └───────────┘ └───────────┘
         │
         ▼
   ┌───────────┐
   │  REVERSED │
   └───────────┘
```

---

## 2. Transition Rules

1. **PENDING → COMPLETED**: Transaction validated, risk scored within acceptable threshold, and approved.
2. **PENDING → DECLINED (BLOCKED)**: Transaction blocked due to critical risk or high-severity deterministic rule trigger.
3. **PENDING → FAILED**: Transaction failed due to network/payment gateway error or bank refusal.
4. **PENDING → CANCELLED**: Customer or merchant aborted before authorization.
5. **COMPLETED → REVERSED**: Post-authorization refund or chargeback processed.
