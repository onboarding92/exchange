# BitChange – Production Quickstart (SQLite, Single VPS)

This document describes a minimal but realistic way to deploy BitChange
to a single VPS using Docker, SQLite and nginx as reverse proxy.

## 1. Build frontend

On your CI or local machine:

```bash
cd client
cp .env.production.example .env.production
# edit .env.production with your real API URL
npm install
npm run build
