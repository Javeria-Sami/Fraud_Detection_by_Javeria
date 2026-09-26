#!/usr/bin/env bash
# ==============================================================================
# Production Deployment & Smoke Testing Script
# Orchestrates container startup, Alembic migrations, and post-deploy smoke tests.
# ==============================================================================

set -euo pipefail

echo "========================================================"
echo " Starting Fraud & Anomaly Detection Production Deployment"
echo "========================================================"

# 1. Validate Environment Configuration
if [ ! -f ".env.production" ] && [ ! -f ".env" ]; then
    echo "! Warning: No .env.production file found. Generating from template..."
    cp .env.example .env.production
fi

# 2. Build & Launch Docker Stack
echo "[1/4] Building and launching multi-service production containers..."
docker compose -f docker-compose.production.yml up -d --build

# 3. Wait for PostgreSQL and Backend Readiness
echo "[2/4] Waiting for backend readiness probe..."
MAX_ATTEMPTS=30
ATTEMPT=0

until curl -s -f http://localhost/health/ready > /dev/null || [ $ATTEMPT -ge $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo "  Waiting for system readiness... ($ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
done

if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
    echo "✗ Error: Deployment failed readiness check."
    docker compose -f docker-compose.production.yml logs --tail=50 backend
    exit 1
fi

echo "✓ Readiness probe passed."

# 4. Run Alembic Database Migrations inside container
echo "[3/4] Applying database migrations..."
docker compose -f docker-compose.production.yml exec -T backend alembic upgrade head
echo "✓ Migrations aligned."

# 5. Post-Deployment Smoke Test
echo "[4/4] Executing post-deployment smoke test suite..."

# Health Check
curl -s -f http://localhost/health/live > /dev/null
curl -s -f http://localhost/health > /dev/null

echo "========================================================"
echo " ✓ PRODUCTION DEPLOYMENT & SMOKE TESTS COMPLETED NOMINALLY"
echo " Access Platform: http://localhost"
echo " API Docs:        http://localhost/docs"
echo " Observability:   http://localhost/admin/observability"
echo "========================================================"
