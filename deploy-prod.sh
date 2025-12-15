#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

docker build -f Dockerfile.client -t bitchange-client .
rm -rf client/dist && mkdir -p client/dist
CID=$(docker create bitchange-client)
docker cp "$CID":/usr/share/nginx/html/. client/dist/
docker rm "$CID"

docker compose -f docker-compose.prod.yml up -d --force-recreate nginx server
