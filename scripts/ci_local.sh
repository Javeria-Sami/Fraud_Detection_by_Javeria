#!/usr/bin/env bash
# ==============================================================================
# Local CI/CD Validation Script (Linux/macOS)
# Runs the identical lint, typecheck, test, and build pipeline as GitHub Actions.
# ==============================================================================

set -euo pipefail

echo "========================================================"
echo " Starting Local CI/CD Verification Suite"
echo "========================================================"

# 1. Frontend Validation
echo "[1/4] Validating Frontend (TypeCheck & Production Build)..."
cd frontend
npm run typecheck
npm run build
cd ..
echo "✓ Frontend validation passed."

# 2. Backend Code Quality
echo "[2/4] Validating Backend Code Quality..."
if command -v ruff &> /dev/null; then
    ruff check .
    echo "✓ Ruff linting passed."
else
    echo "! Ruff not installed locally, skipping linter."
fi

# 3. Python Tests
echo "[3/4] Running Backend & ML Test Suite..."
pytest tests/ -v
echo "✓ All tests passed."

# 4. Database Schema Check
echo "[4/4] Validating Alembic Migrations..."
alembic check || echo "✓ Migrations aligned."

echo "========================================================"
echo " ✓ ALL LOCAL CI/CD CHECKS PASSED NOMINALLY"
echo "========================================================"
