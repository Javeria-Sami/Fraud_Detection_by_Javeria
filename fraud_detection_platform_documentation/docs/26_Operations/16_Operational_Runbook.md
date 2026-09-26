# Emergency Operational Runbooks

This document provides incident runbooks for the most common emergency failure scenarios on the **Finance & Security: Real-Time Fraud & Anomaly Detection Platform**.

---

## 1. Runbook 01: Ingestion API Service Down (`502 / 500`)

### Symptoms
* Upstream payment gateway receives `502 Bad Gateway` or `500 Internal Server Error`.
* `GET /health` fails or times out.

### Diagnostic Steps
1. Inspect backend container status:
   ```bash
   docker ps | grep fraudshield-prod-backend
   ```
2. Check last 100 lines of error logs:
   ```bash
   docker logs --tail 100 fraudshield-prod-backend
   ```

### Immediate Remediation
1. Restart the backend API container:
   ```bash
   docker compose -f docker-compose.prod.yml restart backend
   ```
2. Verify service restoration:
   ```bash
   curl -f http://localhost:8000/health/ready
   ```

---

## 2. Runbook 02: PostgreSQL Database Unreachable

### Symptoms
* API logs show `asyncpg.exceptions.CannotConnectNowError` or `ConnectionRefusedError`.
* `GET /health/ready` returns `{"database": "disconnected"}`.

### Diagnostic Steps
1. Verify PostgreSQL container status:
   ```bash
   docker exec -it fraudshield-prod-postgres pg_isready -U fraudshield_app
   ```
2. Check disk space on host database volume:
   ```bash
   df -h /var/lib/docker/volumes
   ```

### Immediate Remediation
1. If PostgreSQL stopped due to OOM or crash, restart container:
   ```bash
   docker compose -f docker-compose.prod.yml restart postgres
   ```
2. If disk is $100\%$ full, expand volume and clean old logs.
3. Once database responds, restart backend API to re-establish connection pool.

---

## 3. Runbook 03: Machine Learning Model Inference Failure

### Symptoms
* Backend logs show `MLInferenceException` or scikit-learn unpickling error.
* Model status in `/models` displays `DEGRADED` or `FAILED`.

### Immediate Remediation
1. Verify model artifact exists on disk:
   ```bash
   ls -lh ./ml/models/
   ```
2. If corrupted, re-run baseline training script to recreate artifact:
   ```bash
   python ml/train.py --output ./ml/models/isolation_forest_v1.joblib
   ```
3. Restart backend or click **Reload Model Artifact** in `/models`.
4. The system will continue scoring transactions using heuristic rules in the interim.

---

## 4. Runbook 04: Real-Time WebSocket Disconnection Storm

### Symptoms
* SOC analysts see `Disconnected` status banner in the browser.
* Real-time transaction feed stops updating.

### Immediate Remediation
1. Check Redis pub/sub responsiveness:
   ```bash
   docker exec -it fraudshield-prod-redis redis-cli ping
   ```
2. If Redis unresponsive, restart Redis:
   ```bash
   docker compose -f docker-compose.prod.yml restart redis
   ```
3. Analysts' browser clients will automatically reconnect within 5 seconds of Redis recovery.

---

## 5. Runbook 05: Database Backup Failure

### Symptoms
* No new `.sql.gz` snapshot in `./backups/` after scheduled 02:00 UTC cron run.
* Alertmanager fires `BackupJobFailed` alert.

### Immediate Remediation
1. Execute manual backup to capture failure logs:
   ```bash
   ./scripts/backup_db.sh
   ```
2. Common root causes:
   * Insufficient disk space on backup mount (`df -h`).
   * PostgreSQL user permissions revoked on `pg_dump`.
3. Resolve disk/permission issue and verify backup file is created ($> 0\text{ bytes}$).
