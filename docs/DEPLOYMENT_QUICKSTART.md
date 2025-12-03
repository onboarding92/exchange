# BitChange – Deployment Quickstart (v1)

This document explains, at a high level, how to deploy BitChange in production
on a single VPS using Docker Compose.

NOTE: This project is educational / prototype quality.
For real money you need reviews, monitoring and operational discipline.

--------------------------------------------------
1. Overview
--------------------------------------------------

Target architecture:

- 1 VPS (Linux, e.g. Ubuntu 22.04)
- Docker + docker-compose
- Backend container (NodeJS + SQLite for v1)
- Frontend container (React build served by Nginx or similar)
- Reverse proxy with HTTPS (Nginx / Traefik / etc.)
- Off-site backups of the SQLite database file "exchange.db"

This file is only documentation.
Actual commands on the real server will be executed later.

--------------------------------------------------
2. Repository layout (production)
--------------------------------------------------

Suggested layout on the server:

- /srv/exchange          (git clone of this repo)
  - server/              (backend NodeJS)
  - client/              (frontend React)
  - docker-compose.prod.yml
  - docs/
  - backups/             (SQLite backups)

--------------------------------------------------
3. Environment files (production)
--------------------------------------------------

On the server you will have:

- server/.env.production
- client/.env.production

They are based on:

- server/.env.production.example
- client/.env.production.example

Example variables (server):

- NODE_ENV=production
- PORT=3001
- APP_URL=https://your-exchange-domain.com
- SESSION_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_STRING
- SMTP_HOST=your.smtp.host
- SMTP_PORT=587
- SMTP_USER=your_smtp_user
- SMTP_PASS=your_smtp_password
- SMTP_FROM="BitChange <no-reply@your-domain.com>"

Example variables (client):

- VITE_API_URL=https://your-exchange-domain.com/api
- VITE_APP_NAME=BitChange

--------------------------------------------------
4. Healthcheck endpoint
--------------------------------------------------

The backend exposes:

GET /health

Expected JSON:

{ "ok": true, "ts": "2025-01-01T12:00:00.000Z" }

In production it will typically be reachable at:

https://your-exchange-domain.com/health

--------------------------------------------------
5. Seed accounts (default users)
--------------------------------------------------

Seed data creates:

- User:
  - demo@bitchange.money / demo123
- Admin:
  - admin@bitchange.money / admin123

In production you MUST:

- change admin password
- store new credentials in a password manager
- optionally remove or limit the demo user

--------------------------------------------------
6. Backups (concept)
--------------------------------------------------

There is a script:

- server/scripts/backup_db.sh

It creates timestamped copies of exchange.db for backup.
On the real server you will configure a cron job to run it daily.

