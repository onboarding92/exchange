#!/usr/bin/env bash
set -e

# BitChange – pre-release sanity check.
#
# This script is intended to be run locally or in CI before a release.
# It will:
#   - run backend tests
#   - build the frontend in production mode

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== BitChange – pre-release sanity check ==="
echo "Root directory: $ROOT_DIR"
echo

cd "$ROOT_DIR/server"
echo "=== 1) Backend: npm test ==="
npm test

cd "$ROOT_DIR/client"
echo
echo "=== 2) Frontend: npm run build ==="
npm run build

echo
echo "=== ALL GOOD: backend tests + frontend build succeeded ==="
