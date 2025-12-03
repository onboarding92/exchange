#!/usr/bin/env bash
set -e

echo "============================================"
echo "  BitChange – DEV DB RESET SCRIPT"
echo "============================================"
echo "This will DELETE the local SQLite database files:"
echo "  - exchange.db"
echo "  - exchange.db-wal"
echo "  - exchange.db-shm"
echo
echo "It is intended ONLY for LOCAL DEVELOPMENT."
echo "NEVER run this in production."
echo

read -p "Type YES to confirm: " CONFIRM
if [ "$CONFIRM" != "YES" ]; then
  echo "Aborted."
  exit 0
fi

echo "Deleting local DB files..."
rm -f exchange.db exchange.db-wal exchange.db-shm

echo "Recreating schema + seeding demo/admin via npm test..."
npm test

echo "============================================"
echo "Done. Local DB has been reset and reseeded."
echo "============================================"
