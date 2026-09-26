#!/usr/bin/env bash
# ==============================================================================
# Database Disaster Recovery & Restore Script
# Safely restores a PostgreSQL database from a compressed .sql.gz snapshot.
# ==============================================================================

set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <path_to_backup_file.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file '$BACKUP_FILE' not found."
    exit 1
fi

echo "========================================================"
echo " WARNING: THIS WILL OVERWRITE THE CURRENT DATABASE"
echo " Target Backup: $BACKUP_FILE"
echo "========================================================"

read -p "Are you sure you want to proceed with restore? (y/N): " -r CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "Restore aborted by user."
    exit 0
fi

echo "[1/2] Decompressing and applying SQL dump..."

if command -v docker &> /dev/null && docker ps | grep -q "fraudshield-prod-postgres"; then
    gunzip -c "$BACKUP_FILE" | docker exec -i fraudshield-prod-postgres psql -U "${POSTGRES_USER:-fraudshield_app}" -d "${POSTGRES_DB:-fraudshield_prod}"
else
    gunzip -c "$BACKUP_FILE" | psql "${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/fraudshield}"
fi

echo "[2/2] Running Alembic migration check..."
alembic upgrade head

echo "========================================================"
echo " ✓ DATABASE RESTORE COMPLETED SUCCESSFULLY"
echo "========================================================"
