#!/usr/bin/env bash
set -e

# BitChange pre-production check script.
# Runs:
#  - backend tests
#  - frontend build
# and prints a short summary.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "=== BitChange pre-production check ==="
echo "Repo root: ${REPO_ROOT}"
echo

################################
# 1) Backend tests
################################
echo "[1/3] Backend tests (server/npm test)"
cd "${REPO_ROOT}/server" || {
  echo "ERROR: cannot cd to ${REPO_ROOT}/server"
  exit 1
}

if npm test; then
  echo "Backend tests: OK"
else
  echo "Backend tests: FAILED"
  exit 1
fi

################################
# 2) Frontend build
################################
echo
echo "[2/3] Frontend build (client/npm run build)"
cd "${REPO_ROOT}/client" || {
  echo "ERROR: cannot cd to ${REPO_ROOT}/client"
  exit 1
}

if npm run build; then
  echo "Frontend build: OK"
else
  echo "Frontend build: FAILED"
  exit 1
fi

################################
# 3) Summary & manual checks
################################
echo
echo "[3/3] Summary"
echo " - Backend tests: OK"
echo " - Frontend build: OK"
echo
echo "Now manually review these docs before go-live:"
echo " - docs/SECURITY_CHECKLIST.md"
echo " - docs/RISK_LIMITS_AND_POLICIES.md"
echo " - docs/INFRASTRUCTURE_PLAN.md"
echo " - docs/DEPLOYMENT_STEP_BY_STEP.md"
echo
echo "If everything looks good, you can proceed with the production deployment."
echo "=== Pre-production check completed ==="
