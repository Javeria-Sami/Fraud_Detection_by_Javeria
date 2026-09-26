# FraudShield — Real-Time Financial Fraud & Anomaly Detection Platform

A production-grade, financial cyber defense and anomaly detection platform designed for modern Security Operations Centers (SOC). The system ingests transactions in real time, evaluates configurable deterministic security rules alongside multidimensional machine learning anomaly models (Isolation Forest), calculates explainable risk scores (0–100), generates prioritized alerts with deduplication and storm suppression, and provides analysts with live monitoring, 360° entity risk profiling, case management, and audit logging.

---

## Architecture Overview

```text
                                 ┌───────────────────────────────────┐
                                 │       TRANSACTION SOURCES         │
                                 │   (API Ingestion / Simulator)     │
                                 └─────────────────┬─────────────────┘
                                                   │ POST /api/v1/transactions
                                                   ▼
                                 ┌───────────────────────────────────┐
                                 │   VALIDATION & IDEMPOTENCY        │
                                 │ (Pydantic / Duplicate Check / IP) │
                                 └─────────────────┬─────────────────┘
                                                   │
                                                   ▼
                                 ┌───────────────────────────────────┐
                                 │     FEATURE ENGINEERING STORE     │
                                 │ (Velocities, Rolling Baselines,   │
                                 │  Device Hashes, Geolocation Dist) │
                                 └────────┬─────────────────┬────────┘
                                          │                 │
                  ┌───────────────────────┴─┐             ┌─┴───────────────────────┐
                  ▼                         │             │                         ▼
       ┌─────────────────────┐              │             │              ┌─────────────────────┐
       │     RULE ENGINE     │              │             │              │      ML ENGINE      │
       │  • HIGH_AMOUNT      │              │             │              │  • IsolationForest  │
       │  • RAPID_VELOCITY   │              │             │              │  • Feature Scorer   │
       │  • NEW_DEVICE       │              │             │              │  • Model Registry   │
       │  • GEO_LEAP         │              │             │              │  • Drift Tracking   │
       │  • FAILED_SPIKES    │              │             │              └──────────┬──────────┘
       └──────────┬──────────┘              │             │                         │
                  │                         │             │                         │
                  └─────────────────────────┼─────────────┼─────────────────────────┘
                                            ▼             ▼
                                 ┌───────────────────────────────────┐
                                 │            RISK ENGINE            │
                                 │  • Weighted Multi-Factor Formula  │
                                 │  • Score Calibration (0–100)      │
                                 │  • Factor Explainability Matrix   │
                                 └─────────────────┬─────────────────┘
                                                   │
                                                   ▼
                                 ┌───────────────────────────────────┐
                                 │           ALERT ENGINE            │
                                 │  • Thresholding (LOW/MED/HI/CRIT) │
                                 │  • Deduplication & Cooldown       │
                                 │  • Auto-Triage & Grouping         │
                                 └────────┬─────────────────┬────────┘
                                          │                 │
                    ┌─────────────────────┴──┐           ┌──┴─────────────────────┐
                    ▼                        ▼           ▼                        ▼
         ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
         │     PostgreSQL      │  │  WebSocket Server   │  │   CASE MANAGEMENT   │
         │ (Transactions, Risk,│  │  (/ws/live stream)  │  │ (Investigation,     │
         │  Alerts, Audits)    │  └──────────┬──────────┘  │  Evidence, Outcome) │
         └─────────────────────┘             │             └─────────────────────┘
                                             ▼
                                  ┌─────────────────────┐
                                  │   FINANCIAL SOC UI  │
                                  │  (React/TS/Tailwind │
                                  │   Live Feeds/Charts)│
                                  └─────────────────────┘
```

---

## Core Capabilities

- **Real-Time Streaming Ingestion**: REST endpoint `POST /api/v1/transactions` and WebSocket `/ws/live` stream with sub-millisecond pipeline latency.
- **Explainable Multi-Factor Risk Engine**: Calculates a calibrated 0–100 score blending Deterministic Rules (45%), ML Isolation Forest Anomaly Probability (35%), Velocity Burst Factors (10%), and Identity/Device Novelty (10%).
- **Machine Learning Pipeline (`ml/`)**: Isolation Forest model trained on cyclical time vectors, velocity windows (5m, 1h, 24h), normalized deviations, failed attempt spikes, and high-risk merchant categories. Includes Drift tracking (PSI) and active versioning.
- **Configurable Fraud Rules**: 9 active, editable rules with live weight tuning, sandbox testing, and audit trails:
  1. `HIGH_TRANSACTION_AMOUNT`
  2. `RAPID_TRANSACTION_SEQUENCE`
  3. `NEW_DEVICE`
  4. `UNUSUAL_LOCATION`
  5. `UNUSUAL_TIME`
  6. `FAILED_ATTEMPT_SPIKE`
  7. `SPENDING_VELOCITY_ANOMALY`
  8. `MERCHANT_ANOMALY`
  9. `BEHAVIOR_DEVIATION`
- **Analyst Case Management**: End-to-end investigation workspace with threaded notes, forensic evidence locker, and verified resolution recording (*Confirmed Fraud*, *False Positive*, etc.) feeding back into future ML evaluation sets.
- **360° Risk Profiling**: Entity tracking for Users, Devices, and Merchants.
- **Interactive Transaction Simulator**: Docked widget capable of injecting traffic bursts, whale transactions, impossible geo-hops, card testing, and account takeover vectors on demand.
- **Role-Based Access Control (RBAC)**: Enforced roles (`admin`, `analyst`, `viewer`) with tamper-evident audit logging on all administrative actions.

---

## Technology Stack

- **Backend**: Python 3.13, FastAPI, SQLAlchemy (Async), Pydantic v2, SQLite / PostgreSQL (asyncpg), WebSockets.
- **Machine Learning**: scikit-learn (Isolation Forest), NumPy, Pandas, Joblib.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Testing & DevOps**: Pytest, AsyncIO, Docker, Docker Compose, Nginx.

---

## Quick Start (Local Development)

### 1. Install Backend Dependencies
```bash
pip install -r backend/requirements.txt
```

### 2. Train Initial ML Model Artifact
```bash
python ml/train.py
```

### 3. Run Backend Server (Port 8000)
```bash
python backend/run.py
```
*The database and initial seed users/rules/history are created automatically on startup.*

### 4. Install & Run Frontend (Port 3000)
```bash
cd frontend
npm install
npm run dev
```

Open your browser at `http://localhost:3000`.

---

## Pre-Seeded Default Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@fraudshield.io` | `Admin@123456` | Full Control, User Provisioning, Rule Weights, Model Deployment, Settings |
| **Security Analyst** | `analyst@fraudshield.io` | `Analyst@123456` | Live Monitoring, Alert Triage, Case Management, Notes, Evidence, Resolution |
| **Executive Viewer** | `viewer@fraudshield.io` | `Viewer@123456` | Read-only access to Dashboards, Transactions, Analytics, and Profiles |

*A convenient 1-click role switcher is embedded in the top navbar and login page for demonstration.*

---

## Running Automated Tests

```bash
pytest -v
```

---

## Docker Compose Deployment

```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## Documentation

- **User Documentation**: [docs/25_User_Documentation/](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/25_User_Documentation/README.md)
  - [Getting Started & Navigation](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/25_User_Documentation/01_Getting_Started.md)
  - [Roles & Permissions Matrix](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/25_User_Documentation/02_Roles_and_Permissions.md)
  - [Security Operations (SOC) Dashboard](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/25_User_Documentation/03_SOC_Dashboard.md)
  - [Transaction Explorer & Deep Inspector](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/25_User_Documentation/04_Transaction_Explorer.md)
  - [Alert Center & Triage](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/25_User_Documentation/05_Alert_Center.md)
  - [Case Management & Evidence Locker](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/25_User_Documentation/06_Case_Management.md)
  - [Entity Risk Profiles (User / Device / Merchant)](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/25_User_Documentation/07_Risk_Profiles.md)
  - [Historical Search & Forensic Querying](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/25_User_Documentation/08_Historical_Search.md)
  - [Analytics & Visual Insights](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/25_User_Documentation/09_Analytics_and_Insights.md)
  - [Fraud Rules Administration & Simulation](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/25_User_Documentation/10_Fraud_Rules_Administration.md)
  - [ML Monitoring & Model Retraining](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/25_User_Documentation/11_ML_Monitoring_and_Retraining.md)
  - [Notification Center](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/25_User_Documentation/12_Notification_Center.md)
  - [Admin Panel, Governance & Audit Trail](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/25_User_Documentation/13_Admin_Panel_and_Governance.md)
  - [Security Best Practices & Privacy](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/25_User_Documentation/14_Security_and_Privacy.md)
  - [Troubleshooting, Error Guide & FAQ](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/25_User_Documentation/15_Troubleshooting_and_FAQ.md)
- **Operations & Maintenance Documentation**: [docs/26_Operations/](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/README.md)
  - [Operations Overview & Governance](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/01_Operations_Overview.md)
  - [Daily Operations & Checklists](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/02_Daily_Operations.md)
  - [System Health & Prometheus Monitoring](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/03_Health_Monitoring.md)
  - [Incident Response & Severity Protocols](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/04_Incident_Response.md)
  - [Systematic Troubleshooting & RCA](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/05_Troubleshooting.md)
  - [Database Maintenance & Growth Operations](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/06_Database_Maintenance.md)
  - [Backup & Disaster Restore Runbooks](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/07_Backup_and_Restore.md)
  - [Security Maintenance, Secrets & TLS](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/08_Security_Maintenance.md)
  - [ML Model Operations & Drift (MLOps)](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/09_Model_Operations.md)
  - [Performance Maintenance & SLOs](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/10_Performance_Maintenance.md)
  - [Log & Metric Management Standards](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/11_Log_and_Metric_Management.md)
  - [Release, Upgrade & Update Operations](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/12_Release_and_Update_Operations.md)
  - [Horizontal & Vertical Scaling](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/13_Scaling.md)
  - [Disaster Recovery & Catastrophe Playbook](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/14_Disaster_Recovery.md)
  - [Operational Checklists Suite](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/15_Operational_Checklists.md)
  - [Emergency Operational Runbooks](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/16_Operational_Runbook.md)
- **Final System Review (Section 33)**: [docs/27_Final_System_Review/](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/27_Final_System_Review/README.md)
  - [Requirements Traceability Matrix](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/27_Final_System_Review/requirements-traceability.md)
  - [Architecture & Topology Audit](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/27_Final_System_Review/architecture-review.md)
  - [Database & Persistence Integrity](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/27_Final_System_Review/database-review.md)
  - [Security & Vulnerability Audit](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/27_Final_System_Review/security-review.md)
  - [Performance, Latency & Throughput Review](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/27_Final_System_Review/performance-review.md)
  - [Automated Testing & Coverage Review](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/27_Final_System_Review/testing-review.md)
  - [Deployment & Infrastructure Audit](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/27_Final_System_Review/deployment-review.md)
  - [Documentation Accuracy Review](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/27_Final_System_Review/documentation-review.md)
  - [End-to-End Production Scenarios Validation](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/27_Final_System_Review/end-to-end-validation.md)
  - [Issue Register & Technical Debt](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/27_Final_System_Review/issue-register.md)
  - [Final Release Readiness Certification](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/27_Final_System_Review/release-readiness.md)
- **Technical & Architecture Documentation**: [fraud_detection_platform_documentation/docs/](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/)

---

## License
MIT License.

