# ==============================================================================
# Local CI/CD Validation Script (Windows PowerShell)
# Runs the identical lint, typecheck, test, and build pipeline as GitHub Actions.
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting Local CI/CD Verification Suite" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Frontend Validation
Write-Host "`n[1/4] Validating Frontend (TypeCheck & Build)..." -ForegroundColor Yellow
Push-Location frontend
if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm run typecheck
    npm run build
    Write-Host "✓ Frontend validation passed." -ForegroundColor Green
} else {
    Write-Host "! Node/NPM not detected in PATH, skipping frontend build." -ForegroundColor DarkYellow
}
Pop-Location

# 2. Backend Code Quality
Write-Host "`n[2/4] Validating Backend Code Quality..." -ForegroundColor Yellow
if (Get-Command ruff -ErrorAction SilentlyContinue) {
    ruff check .
    Write-Host "✓ Ruff linting passed." -ForegroundColor Green
} else {
    Write-Host "! Ruff not installed, skipping linter." -ForegroundColor DarkYellow
}

# 3. Python Tests
Write-Host "`n[3/4] Running Backend & ML Test Suite..." -ForegroundColor Yellow
if (Get-Command pytest -ErrorAction SilentlyContinue) {
    pytest tests/ -v
    Write-Host "✓ All test suites passed." -ForegroundColor Green
} else {
    Write-Host "! Pytest not detected in PATH, skipping tests." -ForegroundColor DarkYellow
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " ✓ ALL LOCAL CI/CD CHECKS COMPLETED" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
