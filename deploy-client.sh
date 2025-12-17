#!/usr/bin/env bash
set -euo pipefail

cd /home/exchange/bitchange

docker build --no-cache -f Dockerfile.client -t bitchange-client .

rm -rf client/dist
mkdir -p client/dist

CID=$(docker create bitchange-client)
docker cp "$CID":/usr/share/nginx/html/. client/dist/
docker rm "$CID"

docker compose -f docker-compose.prod.yml up -d --force-recreate nginx
