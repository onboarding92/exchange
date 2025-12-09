#!/usr/bin/env bash
set -e

# Simple smoke test script for BitChange backend.
# Usage:
#   ./scripts/smoke_test.sh http://localhost:3001
#   ./scripts/smoke_test.sh https://exchange.yourdomain.com

BASE_URL="${1:-http://localhost:3001}"

echo "=== BitChange smoke test ==="
echo "Target: ${BASE_URL}"

HEALTH_URL="${BASE_URL%/}/health"

echo
echo "-> Checking /health at ${HEALTH_URL} ..."
HTTP_CODE=$(curl -s -o /tmp/bitchange_health.json -w "%{http_code}" "${HEALTH_URL}" || echo "000")

if [ "${HTTP_CODE}" != "200" ]; then
  echo "ERROR: /health returned HTTP ${HTTP_CODE}"
  exit 1
fi

echo "OK: /health HTTP ${HTTP_CODE}"
echo "Response:"
cat /tmp/bitchange_health.json || true
echo
echo "=== Smoke test completed ==="
