# Horizontal & Vertical Scaling Operations

This document establishes scaling guidelines, worker thread dimensioning, database read replica architecture, and caching strategies for the **Finance & Security: Real-Time Fraud & Anomaly Detection Platform**.

---

## 1. Multi-Tier Scaling Architecture

```mermaid
flowchart TD
    subgraph INGRESS["Edge Tier"]
        LB[Nginx / Cloud Load Balancer (Round-Robin / Least Conn)]
    end

    subgraph API_TIER["Stateless Backend API Tier (Horizontally Scalable)"]
        API1[Backend Pod 1 (Uvicorn 4 Workers)]
        API2[Backend Pod 2 (Uvicorn 4 Workers)]
        API3[Backend Pod N (Uvicorn 4 Workers)]
    end

    subgraph STATE_TIER["State & Cache Tier (Cluster / Sentinel)"]
        REDIS[(Redis Cluster / Sentinel Distributed Cache)]
    end

    subgraph DB_TIER["Persistence Tier (Primary + Read Replicas)"]
        PG_PRI[(PostgreSQL Primary: Writes & Ingestion)]
        PG_REP1[(PostgreSQL Read Replica: Historical Search & Analytics)]
        PG_REP2[(PostgreSQL Read Replica: Reporting & Audits)]
    end

    LB --> API1 & API2 & API3
    API1 & API2 & API3 --> REDIS
    API1 & API2 & API3 -->|Ingestion & Mutations| PG_PRI
    PG_PRI -.->|Streaming Replication| PG_REP1 & PG_REP2
    API1 & API2 & API3 -->|Search & Analytics Reads| PG_REP1 & PG_REP2
```

---

## 2. Horizontal Scaling Guidelines

### 2.1 Backend API Scaling
* **Stateless Design**: FastAPI backend instances are fully stateless, relying on Redis for session tokens, sliding velocity windows, and WebSocket pub/sub broadcasting.
* **Auto-Scaling Policy**:
  * **Scale Out Trigger**: Average CPU utilization $> 70\%$ for 3 minutes OR HTTP request queue latency $> 80\text{ms}$.
  * **Scale In Trigger**: Average CPU utilization $< 30\%$ for 10 minutes.
  * **Docker Scaling Command**:
    ```bash
    docker compose -f docker-compose.prod.yml up -d --scale backend=4
    ```

### 2.2 Redis Ingestion & Cache Tier
* Scale Redis memory limits dynamically based on transaction velocity keys.
* For multi-node deployments, utilize Redis Sentinel or Redis Cluster to distribute pub/sub message throughput.

---

## 3. Vertical Database Dimensioning

For high-throughput transaction environments, dimension the primary PostgreSQL database:

| Ingestion Throughput Tier | Target Transactions / Sec | Target vCPU / RAM | Storage / IOPS Target |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Small / Demo)** | $\le 100\text{ tx/s}$ | 4 vCPU / 8 GB RAM | 100 GB SSD (3,000 IOPS) |
| **Tier 2 (Mid-Scale Production)** | $100 - 1,000\text{ tx/s}$ | 8 vCPU / 32 GB RAM | 500 GB NVMe (10,000 IOPS) |
| **Tier 3 (High-Scale Enterprise)** | $> 1,000\text{ tx/s}$ | 16 vCPU / 64 GB RAM + Read Replicas | 2 TB NVMe (20,000+ IOPS) |

---

## 4. Database Read-Write Splitting

To ensure real-time transaction ingestion is never delayed by intensive analytical or historical queries:
* **Primary (Writer)**: Directs `POST /api/v1/transactions`, alert generation, rule writes, and case updates.
* **Read Replicas (Readers)**: Directs `GET /api/v1/search`, `GET /api/v1/analytics`, and audit log exports.
