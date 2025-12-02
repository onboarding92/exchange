#!/usr/bin/env bash
set -e

# Simple environment sanity-check for BitChange.
# Run this on the VPS before starting containers:
#   cd /srv/exchange
#   server/scripts/check_env.sh

RED="$(printf '\033[31m')"
YELLOW="$(printf '\033[33m')"
GREEN="$(printf '\033[32m')"
RESET="$(printf '\033[0m')"

echo "== BitChange environment check =="

SERVER_ENV="server/.env.production"
CLIENT_ENV="client/.env.production"

check_file() {
  local f="$1"
  if [ ! -f "$f" ]; then
    echo "${RED}[MISSING]${RESET} $f does not exist"
    return 1
  else
    echo "${GREEN}[OK]${RESET} $f exists"
  fi
}

check_var() {
  local f="$1"
  local var="$2"
  if ! grep -E "^${var}=" "$f" >/dev/null 2>&1; then
    echo "${RED}[MISSING VAR]${RESET} $var in $f"
    return 1
  fi

  local val
  val="$(grep -E "^${var}=" "$f" | head -n1 | cut -d '=' -f2-)"
  if [ -z "$val" ] || echo "$val" | grep -qi "changeme"; then
    echo "${YELLOW}[WARN]${RESET} $var in $f seems empty or placeholder: '$val'"
  else
    echo "${GREEN}[OK]${RESET} $var in $f"
  fi
}

overall_ok=0

# 1) Server env
check_file "$SERVER_ENV" || overall_ok=1
echo
echo "-- Checking critical server variables --"
for v in SESSION_SECRET APP_URL SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS FROM_EMAIL; do
  check_var "$SERVER_ENV" "$v" || overall_ok=1
done

echo
echo "-- Optional but recommended server vars --"
for v in CORS_ORIGIN FRONTEND_ORIGIN LOGIN_ALERTS_ENABLED; do
  if grep -E "^${v}=" "$SERVER_ENV" >/dev/null 2>&1; then
    check_var "$SERVER_ENV" "$v" || overall_ok=1
  else
    echo "${YELLOW}[WARN]${RESET} $v not set in $SERVER_ENV (optional but recommended)"
  fi
done

# 2) Client env
echo
check_file "$CLIENT_ENV" || overall_ok=1
echo
echo "-- Checking critical client variables --"
for v in VITE_API_BASE VITE_APP_URL; do
  check_var "$CLIENT_ENV" "$v" || overall_ok=1
done

echo
if [ $overall_ok -eq 0 ]; then
  echo "${GREEN}Environment check PASSED (no blocking issues detected).${RESET}"
else
  echo "${RED}Environment check finished with issues. See messages above.${RESET}"
  exit 1
fi
