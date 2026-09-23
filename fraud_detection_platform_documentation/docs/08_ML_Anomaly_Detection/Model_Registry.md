# Model Registry & Deployment Lifecycle

## 1. Model Lifecycle States

```text
[Training Completed] → CANDIDATE / APPROVED
                             ↓
                 [POST /models/{id}/deploy]
                             ↓
                         PRODUCTION
                             ↓
              [Subsequent Model Deployed]
                             ↓
                          RETIRED
```

- **APPROVED**: Trained model validated and eligible for production consideration.
- **PRODUCTION / DEPLOYED**: Currently active in-memory model servicing real-time transaction inference.
- **RETIRED**: Previously deployed model preserved for historical audit trails and backtesting.

---

## 2. Model Deployment API

```http
POST /api/v1/models/{model_id}/deploy
Authorization: Bearer <ADMIN_JWT>
```

Executing deployment performs:
1. Demotion of current production models to `RETIRED`.
2. Promotion of target model to `PRODUCTION` and timestamping `deployed_at`.
3. In-memory hot reload in `MLInferenceService` without application restart.
4. Immutable audit logging in `audit_logs` table.
