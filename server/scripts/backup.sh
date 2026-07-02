#!/bin/bash
set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-./backups}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

echo "=== Starting backup: $TIMESTAMP ==="

# PostgreSQL backup
echo "Backing up PostgreSQL..."
docker compose exec -T postgres pg_dump -U smartdoor smartdoor > "$BACKUP_DIR/db_$TIMESTAMP.sql"
gzip "$BACKUP_DIR/db_$TIMESTAMP.sql"

# Redis backup
echo "Backing up Redis..."
docker compose exec -T redis redis-cli SAVE

# MinIO backup (list objects)
echo "Listing MinIO objects..."
docker compose exec -T minio mc ls --recursive local/smartdoor > "$BACKUP_DIR/minio_$TIMESTAMP.txt"

echo "Backup complete: $BACKUP_DIR"
