# Database Maintenance & Growth Operations

This document establishes routine maintenance procedures, growth management, index optimization, connection pool tuning, and migration controls for the **PostgreSQL 16** persistence tier of the **Finance & Security: Real-Time Fraud & Anomaly Detection Platform**.

---

## 1. High-Volume Table Architecture & Growth Management

In a high-throughput financial fraud detection platform, data tables accumulate millions of records. The table below outlines growth rates and archival policies:

| Table Name | Growth Velocity | Index Strategy | Retention / Archival Policy |
| :--- | :--- | :--- | :--- |
| `transactions` | **High** ($100\text{k}+ / \text{day}$) | Composite B-Tree on `(user_id, created_at)`, `(device_id, created_at)` | Hot: 90 Days. Partitioned / Cold Archive: 7 Years. |
| `alerts` | **Medium** ($1\text{k}-5\text{k} / \text{day}$) | Indexes on `(status, severity)`, `(transaction_id)` | Hot: 1 Year. Cold Archive: 7 Years. |
| `cases` | **Low** ($50-200 / \text{day}$) | Indexes on `(status, assignee_id)` | Indefinite (Forensic Audit). |
| `audit_logs` | **Medium** ($5\text{k} / \text{day}$) | Immutable Append-Only; Indexes on `(actor_id, created_at)` | Indefinite (Non-repudiation Compliance). |
| `notifications` | **Medium** ($5\text{k} / \text{day}$) | Indexes on `(user_id, is_read, created_at)` | Pruned after 90 Days for read records. |

---

## 2. Routine PostgreSQL Maintenance Tasks

```mermaid
flowchart TD
    AUTOVAC[Autovacuum Daemon (Continuous)] --> DBPG[(PostgreSQL Database)]
    WKLY[Weekly: Bloat Check & REINDEX Concurrently] --> DBPG
    MTHLY[Monthly: Table Partitioning & Vacuum Full Maintenance] --> DBPG
    ALM[Alembic Migration Verification] --> DBPG
```

### 2.1 Autovacuum Configuration
PostgreSQL autovacuum must remain active to prevent dead tuple bloat in high-velocity tables:
```ini
# Recommended postgresql.conf settings
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 1min
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50
autovacuum_vacuum_scale_factor = 0.05
autovacuum_analyze_scale_factor = 0.02
```

### 2.2 Reindexing High-Velocity Tables
To prevent B-Tree index fragmentation on high-churn tables (`transactions`, `notifications`), execute non-blocking concurrent reindexing:
```sql
-- Safe concurrent reindexing (zero table locking)
REINDEX TABLE CONCURRENTLY transactions;
REINDEX TABLE CONCURRENTLY alerts;
REINDEX TABLE CONCURRENTLY notifications;
```

---

## 3. Database Connection Pool Tuning

The platform uses asynchronous connection pooling via SQLAlchemy + asyncpg.

* **Pool Size Configuration** (`backend/app/core/database.py`):
  * `pool_size`: 20 connections per API worker process.
  * `max_overflow`: 10 burst connections.
  * `pool_timeout`: 30 seconds.
  * `pool_recycle`: 1800 seconds (30 minutes) to prevent stale connection leaks.
* **PostgreSQL Server Limit**:
  * Set `max_connections = 200` in PostgreSQL configuration to ensure headroom for background workers, DBA maintenance sessions, and replica streams.

---

## 4. Alembic Migration Operational Workflow

1. Always generate and test migrations in local/staging environments:
   ```bash
   alembic revision --autogenerate -m "add_performance_composite_index"
   ```
2. Inspect the generated migration script in `alembic/versions/` to verify zero destructive column drops or unindexed table locks.
3. Apply migration to staging and verify application startup:
   ```bash
   alembic upgrade head
   ```
4. In production releases, migrations are executed automatically during the deployment initialization sequence before traffic routing.
