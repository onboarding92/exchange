#!/usr/bin/env bash
set -e

# Simple checker for required env files and keys in BitChange.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_ENV="${ROOT_DIR}/.env.production"
FRONTEND_ENV="${ROOT_DIR}/../client/.env.production"

echo "=== BitChange env check ==="
echo "Root: ${ROOT_DIR}"
echo

missing=0

check_key () {
  local file="$1"
  local key="$2"

  if [ ! -f "$file" ]; then
    echo "  [MISSING FILE] $file"
    missing=1
    return
  fi

  if ! grep -q "^${key}=" "$file" 2>/dev/null; then
    echo "  [MISSING KEY]  ${key} in ${file}"
    missing=1
  else
    echo "  [OK]           ${key} in $(basename "${file}")"
  fi
}

echo "--- Backend env: ${BACKEND_ENV} ---"
check_key "${BACKEND_ENV}" "NODE_ENV"
check_key "${BACKEND_ENV}" "APP_DOMAIN"
check_key "${BACKEND_ENV}" "SESSION_SECRET"
check_key "${BACKEND_ENV}" "SMTP_HOST"
check_key "${BACKEND_ENV}" "SMTP_PORT"
check_key "${BACKEND_ENV}" "SMTP_USER"
check_key "${BACKEND_ENV}" "SMTP_PASS"
check_key "${BACKEND_ENV}" "SMTP_FROM"

echo
echo "--- Frontend env: ${FRONTEND_ENV} ---"
check_key "${FRONTEND_ENV}" "VITE_API_URL"

echo
if [ "${missing}" -eq 0 ]; then
  echo "=== RESULT: OK – required keys present (according to this checker)."
else
  echo "=== RESULT: MISSING VALUES – fix the lines above before production."
  exit 1
fi
