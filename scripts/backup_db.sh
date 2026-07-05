#!/bin/bash

BACKUP_DIR="/home/hv/DuAn/DAVictory/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="DAVictory"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-your_password}"
DB_HOST="${DB_HOST:-localhost}"
RETENTION_DAYS=2

mkdir -p "$BACKUP_DIR/"{db,data}

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup..."

mysqldump -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" \
  --routines --events --triggers --single-transaction --quick \
  "$DB_NAME" | gzip > "$BACKUP_DIR/db/${DB_NAME}_${TIMESTAMP}.sql.gz"

if [ $? -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] MySQL backup OK: ${DB_NAME}_${TIMESTAMP}.sql.gz"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] MySQL backup FAILED!"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deleting backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR/db" -type f -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completed."
