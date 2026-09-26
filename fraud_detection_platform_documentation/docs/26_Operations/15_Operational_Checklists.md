# Operational Checklists Suite

This document aggregates operational checklists across daily, weekly, monthly, quarterly, and release maintenance cycles for the **Finance & Security: Real-Time Fraud & Anomaly Detection Platform**.

---

## 1. Daily Operational Checklist

* [ ] **API & Container Health**: Verify `GET /health` and `GET /health/ready` return `200 OK`.
* [ ] **Ingestion Stream**: Confirm real-time transactions are flowing in Transaction Explorer.
* [ ] **Alert Generation**: Confirm alerts are generating for transactions with score $\ge 70$.
* [ ] **WebSocket Live Indicator**: Verify status is **Connected** in SOC navigation bar.
* [ ] **Backup Verification**: Check `./backups/` to confirm previous night's backup succeeded.
* [ ] **ML Anomaly Health**: Verify Population Stability Index (PSI) is $< 0.10$ in `/models`.
* [ ] **Audit Trail Inspection**: Review `/admin/audit-logs` for failed admin actions.

---

## 2. Weekly Operational Checklist

* [ ] **Database Growth & Bloat**: Run dead tuple check and verify PostgreSQL autovacuum is running.
* [ ] **Slow Query Review**: Review PostgreSQL logs for queries exceeding $100\text{ms}$.
* [ ] **Alert Triage Backlog**: Review unresolved alert queues and escalate overdue cases.
* [ ] **Redis Memory Usage**: Ensure Redis cache memory is $< 70\%$ of allocated threshold.
* [ ] **Log Storage Cleanup**: Ensure log rotation has compressed old container logs.
* [ ] **Security Vulnerability Scan**: Run `pip-audit` and `npm audit` on staging branches.

---

## 3. Monthly Operational Checklist

* [ ] **Access & Role Review**: Audit user accounts in `/admin/users`; suspend stale accounts ($> 60\text{ days}$ idle).
* [ ] **ML Drift & Retraining Review**: Review rolling 30-day PSI drift curves and schedule retraining if needed.
* [ ] **Backup Restoration Validation**: Restore a backup snapshot into a staging database to verify integrity.
* [ ] **Rule Performance Analysis**: Review rule trigger frequencies in Analytics (`/analytics`) to identify noisy false-positive rules.
* [ ] **SSL/TLS Certificate Expiration**: Check certificate validity ($> 30\text{ days}$ remaining).

---

## 4. Pre-Release Deployment Checklist

* [ ] **CI Pipeline Passed**: All unit, integration, and security checks green.
* [ ] **Alembic Migrations Validated**: Migration scripts tested with backward-compatible schema changes.
* [ ] **Pre-Release Snapshot Captured**: `./scripts/backup_db.sh` executed successfully.
* [ ] **Inference Latency Benchmark**: Model evaluated at $< 15\text{ms}$ per item.
* [ ] **Staging Smoke Verification**: Ingested test transactions verified end-to-end on staging.
* [ ] **Rollback Plan Documented**: Previous release tag and downgrade migration ready.
