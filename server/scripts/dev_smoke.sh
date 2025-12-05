#!/usr/bin/env bash
set -e

# Simple dev "smoke test" script for BitChange.
# Run from ANYWHERE:
#   /srv/exchange/server/scripts/dev_smoke.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$SERVER_DIR/.." && pwd)"

echo "== [1/2] Backend tests =="
cd "$SERVER_DIR"
npm test

echo
echo "== [2/2] Frontend production build =="
cd "$ROOT_DIR/client"
npm run build

echo
echo "Smoke tests completed successfully."
