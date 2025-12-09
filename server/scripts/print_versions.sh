#!/usr/bin/env bash
set -e

echo "=== BitChange Environment Versions ==="
echo "Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo
echo "Node version:"
node -v || echo "Node NOT FOUND"

echo
echo "NPM version:"
npm -v || echo "npm NOT FOUND"

echo
echo "Backend package.json version:"
if [ -f server/package.json ]; then
jq '.name, .version' server/package.json 2>/dev/null || echo "jq missing"
else
echo "server/package.json missing"
fi

echo "=== END ==="
