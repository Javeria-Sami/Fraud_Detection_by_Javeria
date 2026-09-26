#!/usr/bin/env bash
# ==============================================================================
# Database Backup Script
# Creates a compressed, timestamped PostgreSQL snapshot with 30-day retention.
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/fraudshield_backup_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "========================================================"
echo " Starting Automated PostgreSQL Database Backup"
echo " Timestamp: $TIMESTAMP"
echo " Destination: $FILENAME"
echo "========================================================"

if command -v docker &> /dev/null && docker ps | grep -q "fraudshield-prod-postgres"; then
    echo "[1/2] Capturing PostgreSQL dump from Docker container..."
    docker exec -t fraudshield-prod-postgres pg_dump -U "${POSTGRES_USER:-fraudshield_app}" "${POSTGRES_DB:-fraudshield_prod}" | gzip > "$FILENAME"
else
    echo "[1/2] Capturing PostgreSQL dump from local/host database..."
    pg_dump "${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/fraudshield}" | gzip > "$FILENAME"
fi

FILESIZE=$(du -h "$FILENAME" | cut -f1)
echo "[2/2] Backup created successfully ($FILESIZE)."

# Retention cleanup (remove backups older than 30 days)
find "$BACKUP_DIR" -type f -name "fraudshield_backup_*.sql.gz" -mtime +30 -delete
echo "✓ Old backups pruned (>30 days)."
echo "========================================================"
