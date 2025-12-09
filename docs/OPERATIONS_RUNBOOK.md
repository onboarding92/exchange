BitChange – Operations Runbook (v1)
===================================

This document is for the operator / sysadmin of BitChange.
It covers common tasks and first-response actions.

------------------------------------------------------------
1. Check if the platform is alive
------------------------------------------------------------

From any machine (or monitoring system), call the health endpoint:

- URL: https://exchange.yourdomain.com/health

Expected JSON response (example):

- ok: true
- ts: current timestamp

If this fails or returns error, the backend may be down or misconfigured.

------------------------------------------------------------
2. Restart the platform (Docker Compose)
------------------------------------------------------------

From the directory containing docker-compose.prod.yml, usually:

- /srv/exchange

Main commands:

- docker compose -f docker-compose.prod.yml ps
  to see running containers.

- docker compose -f docker-compose.prod.yml restart
  to restart containers without rebuilding.

When you have updated the code and need to rebuild:

- docker compose -f docker-compose.prod.yml build
- docker compose -f docker-compose.prod.yml up -d

------------------------------------------------------------
3. Check backend logs
------------------------------------------------------------

From /srv/exchange:

- docker compose -f docker-compose.prod.yml logs server -f

Look for:

- repeated 5xx errors
- DB errors
- failed SMTP connections
- suspicious patterns in auth / withdrawal flows

------------------------------------------------------------
4. Perform a manual DB backup (SQLite)
------------------------------------------------------------

From /srv/exchange/server (inside the container or on host if volume):

- ./scripts/backup_db.sh /srv/exchange/backups

This creates a timestamped copy of exchange.db.

Recommendations:

- Configure a cron job to run this script daily.
- Sync /srv/exchange/backups to off-site storage (S3, B2, Spaces, etc.).

------------------------------------------------------------
5. Temporarily pause withdrawals (incident scenario)
------------------------------------------------------------

In case of suspected compromise or bug:

1) Restrict admin access to trusted staff only.
2) Use the admin panel to:
   - reject or pause pending withdrawals where possible.
3) If needed, temporarily disable public endpoints (e.g. firewall rules,
   taking frontend offline, etc.).
4) Communicate clearly with users that withdrawals are temporarily paused.

If in the future you add a dedicated "maintenance / withdrawals paused"
flag in the backend, document how to flip it here.

------------------------------------------------------------
6. Deploying a new version (high level)
------------------------------------------------------------

1) Pull changes from git:

- cd /srv/exchange
- git pull origin main

2) Optional but recommended – run tests locally:

- cd server
- npm install
- npm test

- cd ../client
- npm install
- npm run build

3) Rebuild and restart with Docker:

- cd /srv/exchange
- docker compose -f docker-compose.prod.yml build
- docker compose -f docker-compose.prod.yml up -d

4) Check health endpoint again:

- curl https://exchange.yourdomain.com/health

------------------------------------------------------------
7. First steps in case of suspected incident
------------------------------------------------------------

Checklist (high level):

1) Do not panic. Act methodically.
2) Pause withdrawals.
3) Take a fresh DB backup.
4) Export relevant logs:
   - auth/login logs
   - withdrawal logs
   - admin action logs (if available)
5) Identify:
   - which accounts might be affected
   - which transactions are suspicious
6) Inform stakeholders and, if needed, users.
7) After mitigation:
   - patch the vulnerability
   - improve monitoring and alerts to catch similar issues earlier.

