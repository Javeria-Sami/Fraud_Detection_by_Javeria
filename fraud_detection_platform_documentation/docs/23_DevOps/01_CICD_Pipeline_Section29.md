# Section 29 — DevOps & CI/CD Pipeline Technical Architecture

## 1. Executive Summary

This document specifies the automated Continuous Integration and Continuous Delivery (CI/CD) pipeline, quality-assurance gates, security scanning workflows, database migration validation, and release preparation architecture implemented in **Section 29** for the **Real-Time Fraud & Anomaly Detection Platform**.

The CI/CD pipeline guarantees that every code contribution is automatically validated across frontend typing, backend logic, ML artifacts, database migrations, security anti-patterns, and startup health before merging into protected branches.

---

## 2. Pipeline Architecture & Execution Flow

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER WORKFLOW                              │
│         Git Push / Pull Request targeting main/develop                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  CONTINUOUS INTEGRATION (ci.yml)                       │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ 1. Frontend Gate  │ 2. Backend Gate   │ 3. Database Migration Gate     │
│ • TypeScript Check│ • Python Matrix   │ • Ephemeral PostgreSQL 16      │
│ • Production Build│ • Ruff Linting    │ • Alembic Upgrade Head         │
│ • Bundle Integrity│ • 30 Test Suites  │ • Schema Integrity Tests       │
├───────────────────┴───────────────────┴────────────────────────────────┤
│ 4. ML Validation Gate                 5. Startup Smoke Test Gate       │
│ • Feature Schema Compatibility        • Live FastBoot Probe            │
│ • Deterministic Inference Verification • Liveness & Readiness Tests    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               SECURITY SCANNING (security.yml)                         │
│ • Gitleaks Secret Detection • Bandit SAST • pip/npm Vulnerability Audit│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               RELEASE VALIDATION (release-validation.yml)              │
│ • Full Multi-Stage Test Pass • Multi-Stage Docker Image Build Check    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. GitHub Actions Workflows

### 3.1 Main CI Pipeline (`.github/workflows/ci.yml`)
1. **`frontend-ci`**:
   - Environment: Node.js 20 on Ubuntu latest.
   - Cache: NPM cache keyed against `frontend/package.json`.
   - Commands: `npm run typecheck`, `npm run build`.
2. **`backend-ci`**:
   - Environment: Python matrix (3.11, 3.12) on Ubuntu latest.
   - Cache: Pip cache keyed against `backend/requirements.txt`.
   - Quality: Ruff linting and formatting check (`ruff check .`).
   - Testing: Pytest execution across all 30 test suites (`pytest tests/ -v`).
3. **`database-migration-ci`**:
   - Service: Ephemeral `postgres:16-alpine` with health check verification.
   - Migrations: `alembic upgrade head` validating clean schema generation.
   - Tests: Executes database schema integration tests against live PostgreSQL.
4. **`ml-validation-ci`**:
   - Verifies model artifact training, serialization, loading, and inference determinism.
5. **`smoke-test-ci`**:
   - Boots application instance in test mode.
   - Verifies `/health/live`, `/health/ready`, and `/health` endpoints with active curl assertions.

### 3.2 Security Scanning Pipeline (`.github/workflows/security.yml`)
1. **Dependency Audit**: `pip-audit` for Python and `npm audit --audit-level=high` for Node.js.
2. **Secret Detection**: `gitleaks-action` scanning repository history for accidental private keys or tokens.
3. **SAST Analysis**: `bandit -r backend/` scanning Python source for security vulnerabilities.

### 3.3 Release Gate Pipeline (`.github/workflows/release-validation.yml`)
- Triggered on version tags (`v*`) or manual release dispatch.
- Executes full multi-stage test suite and validates `docker/Dockerfile.backend` and `docker/Dockerfile.frontend` image builds.

---

## 4. Local CI Parity & Developer Tooling

Developers can execute the identical CI checks locally prior to committing:

### Linux / macOS
```bash
chmod +x scripts/ci_local.sh
./scripts/ci_local.sh
```

### Windows PowerShell
```powershell
.\scripts\ci_local.ps1
```

---

## 5. Security & Configuration Boundaries

- **No Secrets in CI**: Workflows use disposable test-specific credentials.
- **Zero Production Deployment**: Deployment infrastructure and rollout orchestration remain cleanly segregated for Section 30.
- **Resource Protection**: Workflow concurrency cancellation prevents wasted CI minutes on stale pull-request commits.
