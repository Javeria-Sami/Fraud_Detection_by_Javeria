# Controlled Transaction Statuses

## 1. Status Reference

| Status Code | Description | Risk / Disposition Impact |
| :--- | :--- | :--- |
| `PENDING` | Received and awaiting completion of security evaluation | Processing |
| `COMPLETED` | Approved and successfully settled | Cleared |
| `APPROVED` | Approved by risk engine (compatibility alias) | Cleared |
| `REVIEW_REQUIRED` | Flagged for manual investigation by an analyst | In Triage Queue |
| `FLAGGED` | Medium risk transaction flagged for behavioral monitoring | Monitored |
| `DECLINED` / `BLOCKED` | Rejected due to critical risk or sanction/blacklist rules | Blocked |
| `FAILED` | Technical or banking failure | Terminal failure |
| `REVERSED` | Chargeback, dispute, or customer refund | Settled reversal |
| `CANCELLED` | Aborted prior to clearing | Cancelled |
