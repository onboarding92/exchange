# BitChange – Operations Runbook (v1)

This document is for day-to-day operation of the exchange.

It describes what you do on the production server, but here we only
document the logic. Actual commands will be executed later.

--------------------------------------------------
1. Concepts
--------------------------------------------------

- The app runs via Docker Compose (backend plus frontend plus proxy)
- Database is a single SQLite file named exchange.db
- Backups are timestamped copies of that file

--------------------------------------------------
2. Basic operational tasks (conceptual)
--------------------------------------------------

Check if services are running:

- backend container is running
- frontend or proxy container is running

View logs:

- backend logs (Node)
- frontend or proxy logs (Nginx or similar)

--------------------------------------------------
3. Deploy a new version (conceptual)
--------------------------------------------------

Typical workflow:

1. Backup the database (exchange.db)
2. Pull latest code from git
3. Rebuild images (backend and frontend)
4. Restart services
5. Perform a quick smoke test:
   - login with test user
   - place a small order
   - open admin pages

--------------------------------------------------
4. Restore from backup (conceptual)
--------------------------------------------------

If something goes wrong:

1. Stop the app
2. Replace exchange.db with a chosen backup copy
3. Start the app again
4. Check:
   - user balances
   - trading history

--------------------------------------------------
5. Emergency actions
--------------------------------------------------

Freeze withdrawals:

- temporarily disable withdrawal endpoints at backend level, or
- remove withdrawal buttons from frontend and redeploy

Full shutdown:

- Stop all services
- Optionally serve maintenance page from the proxy
- After investigation, restore the database if needed and restart services

--------------------------------------------------
6. Routine checks
--------------------------------------------------

- Verify backup job produced a recent backup
- Check free disk space
- Review logs for:
  - suspicious login patterns
  - high error rates
- Apply OS security patches

