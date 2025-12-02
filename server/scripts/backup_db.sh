#!/usr/bin/env bash
set -e

# Simple SQLite backup script for BitChange.
# Usage:
#   ./backup_db.sh /path/to/backups
# or with cron:
#   0 3 * * * /srv/exchange/server/scripts/backup_db.sh /srv/exchange/backups >> /var/log/bitchange_backup.log 2>&1

BACKUP_DIR="${1:-./backups}"
DB_FILE="exchange.db"

mkdir -p "$BACKUP_DIR"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR}/exchange-${TS}.db"

if [ ! -f "$DB_FILE" ]; then
  echo "ERROR: $DB_FILE not found in $(pwd)" >&2
  exit 1
fi

# Use sqlite3 online backup if available, fallback to cp
if command -v sqlite3 >/dev/null 2>&1; then
  echo "Using sqlite3 .backup"
  sqlite3 "$DB_FILE" ".backup '$OUT'"
else
  echo "sqlite3 not found, using cp (make sure you run this with app downtime or WAL fsync)."
  cp "$DB_FILE" "$OUT"
fi

# Optional: keep only last N backups
N_KEEP=30
ls -1t "$BACKUP_DIR"/exchange-*.db 2>/dev/null | tail -n +$((N_KEEP+1)) | xargs -r rm -f

echo "Backup completed: $OUT"
