# Section 30 — Production Deployment Architecture & Operations Guide

## 1. Executive Summary

This document specifies the production deployment architecture, multi-container orchestration, process concurrency model, reverse-proxy gateway configuration, database backup/recovery protocols, and post-deployment validation procedures implemented in **Section 30** for the **Real-Time Fraud & Anomaly Detection Platform**.

The deployment architecture is fully containerized, reproducible, least-privilege compliant, and optimized for high-throughput real-time fraud scoring.

---

## 2. Production Topology & Multi-Service Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PUBLIC INTERNET / CLIENTS                       │
│                        HTTPS (Port 443) / WSS                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               REVERSE PROXY / STATIC GATEWAY (Nginx Alpine)            │
│ • TLS Termination • SPA Routing • Static Asset Caching • Gzip / Brotli │
│ • Security Headers (CSP, HSTS, X-Frame) • WebSocket Upgrade Forwarding │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │ /api/* & /ws/*                 │ /health/*
                    ▼                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│           BACKEND API & REAL-TIME ENGINE (Python 3.13-Slim)            │
│ • Uvicorn Multi-Worker Process Architecture (WEB_CONCURRENCY=4)        │
│ • Non-Root System User (appuser:appgroup) • Memory-Resident ML Artifact│
│ • Centralized JSON Structured Logging • In-Process Distributed Tracing │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌────────────────────────────────────┐ ┌─────────────────────────────────┐
│   DATABASE CLUSTER (PostgreSQL 16) │ │   AUTOMATED DB BACKUP WORKER    │
│ • Connection Pool: 20 + 10 Overflow│ │ • Daily Compressed pg_dump      │
│ • Non-Root User (fraudshield_app)  │ │ • 30-Day Automated Pruning      │
│ • Persistent Data Volume           │ │ • Isolated Backup Storage       │
└────────────────────────────────────┘ └─────────────────────────────────┘
```

---

## 3. Core Deployment Artifacts

### 3.1 Production Docker Stack (`docker-compose.production.yml`)
- **`postgres`**: Dedicated PostgreSQL 16 Alpine container with health probes, non-root user, and CPU/Memory limits.
- **`backend`**: Production container running `backend/run.py` with multi-worker concurrency and decoupled secrets.
- **`frontend`**: Production Nginx container serving optimized Single Page Application assets and proxying `/api` and `/ws`.
- **`db-backup`**: Scheduled background worker generating daily compressed snapshots to persistent volume.

### 3.2 Process Manager & Server Runner (`backend/run.py`)
- Automatically detects `ENVIRONMENT=PRODUCTION`.
- Disables `reload=True`.
- Spawns multi-worker processes based on `WEB_CONCURRENCY` and available CPU cores.
- Handles graceful shutdown signals (`SIGTERM`/`SIGINT`) draining active in-flight requests.

### 3.3 Nginx Reverse Proxy Gateway (`docker/nginx.conf`)
- Implements SPA routing fallback (`try_files $uri $uri/ /index.html`).
- Proxies `/api` with connection pooling and upstream keepalive.
- Proxies `/ws` with HTTP/1.1 `Upgrade $http_upgrade` and `Connection "Upgrade"` headers.
- Gzip compression enabled for JSON, JavaScript, CSS, and SVG payloads.
- Security headers enforced: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

---

## 4. Database Migrations & Safety Protocols

1. **Pre-Deployment Check**: Migrations validated in CI against clean PostgreSQL instances.
2. **Execution Flow**:
   ```bash
   docker compose -f docker-compose.production.yml exec -T backend alembic upgrade head
   ```
3. **Safety Guarantee**: Forward-compatible migrations ensure zero table lockouts or dropped columns during active traffic.

---

## 5. Automated Backups & Disaster Recovery

### 5.1 On-Demand & Scheduled Backups (`scripts/backup_db.sh`)
- Generates gzip-compressed PostgreSQL snapshot: `backups/fraudshield_backup_YYYYMMDD_HHMMSS.sql.gz`.
- Prunes historical backups older than 30 days automatically.

### 5.2 Safe Disaster Restore Protocol (`scripts/restore_db.sh`)
```bash
./scripts/restore_db.sh backups/fraudshield_backup_20260926_215000.sql.gz
```
- Interactive confirmation gate prevents accidental overwrites.
- Decompresses and streams SQL directly into target database within transaction boundaries.
- Executes `alembic upgrade head` to ensure schema alignment post-restore.

---

## 6. Post-Deployment Verification & Smoke Tests

Automated deployment scripts (`scripts/deploy.sh` and `scripts/deploy.ps1`) execute a multi-point validation pass:
1. **Liveness Probe**: `GET /health/live` returns HTTP 200 (`status: UP`).
2. **Readiness Probe**: `GET /health/ready` returns HTTP 200 (`status: READY`, DB & ML nominal).
3. **Health Summary**: `GET /health` returns operational summary.
4. **Authentication**: Admin token generation and RBAC resolution.
5. **Ingestion & Scoring**: Test transaction submitted, scored, and verified.
6. **Observability**: `GET /api/v1/admin/observability/status` verifies all 8 subsystems nominal.

---

## 7. Model Artifact Rollback Protocol

If a newly deployed model exhibits statistical drift:
1. Update active model version pointer in database: `POST /api/v1/models/{previous_version_id}/activate`.
2. The ML inference engine automatically hot-reloads the approved model artifact from disk without process restart.
3. Audit log records rollback event and model version history is preserved.
