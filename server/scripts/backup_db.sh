#!/usr/bin/env bash
set -e

# Simple SQLite backup script for BitChange.
#
# This script is meant to be run on the production server.
# It creates a timestamped copy of exchange.db in a backup directory.
#
# Usage example on the server:
#   ./scripts/backup_db.sh /srv/exchange/backups
#
# The cron configuration and remote sync to object storage
# will be done later.

BACKUP_DIR="${1:-./backups}"
DB_FILE="exchange.db"

mkdir -p "$BACKUP_DIR"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR}/exchange-${TS}.db"

if [ ! -f "$DB_FILE" ]; then
  echo "ERROR: $DB_FILE not found in $(pwd)" >&2
  exit 1
fi

# If sqlite3 is available, use its online backup feature.
if command -v sqlite3 >/dev/null 2>&1; then
  echo "Using sqlite3 .backup -> $OUT"
  sqlite3 "$DB_FILE" ".backup '$OUT'"
else
  echo "sqlite3 not found, using cp (ensure the app is stopped or WAL synced)."
  cp "$DB_FILE" "$OUT"
fi

# Optional: keep only the last N backups
N_KEEP=30
ls -1t "$BACKUP_DIR"/exchange-*.db 2>/dev/null | tail -n +$((N_KEEP+1)) | xargs -r rm -f

echo "Backup completed: $OUT"
