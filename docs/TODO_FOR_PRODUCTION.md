# BitChange – TODO for Production (v1)

This document lists what must be done before running BitChange with
real money and up to ~100 active users/day.

---

## A. Before provisioning the server

1. **Choose VPS provider**
   - Target spec:
     - 4 vCPU
     - 8 GB RAM
     - 160–200 GB SSD
     - Ubuntu 22.04 LTS
   - Example providers: Hetzner, DigitalOcean, OVH, AWS Lightsail, etc.

2. **Domain & DNS**
   - Decide the production hostname, e.g.:
     - `exchange.yourdomain.com`
   - Create:
     - `A` record → VPS public IP

3. **SMTP / Email provider**
   - Create an account at Mailgun / SendGrid / Postmark / SES / etc.
   - Prepare:
     - SMTP host
     - SMTP port
     - SMTP username / password
     - From email address (e.g. `no-reply@yourdomain.com`)
   - Configure on the domain:
     - SPF record
     - DKIM keys
     - DMARC policy (optional but recommended)

---

## B. Server base setup (once VPS is ready)

4. **Base hardening**
   - Create non-root user, e.g.:
     - `adduser exchange`
     - `usermod -aG sudo exchange`
   - Update the OS:
     - `apt update && apt upgrade -y`
   - Configure firewall (UFW):
     - `ufw allow OpenSSH`
     - `ufw allow 80/tcp`
     - `ufw allow 443/tcp`
     - `ufw enable`

5. **Install Docker & docker compose plugin**
   - Follow official Docker instructions for Ubuntu 22.04.
   - Add `exchange` user to `docker` group.

6. **Clone repository**
   - Suggested structure:
     - `/srv/exchange`
   - Commands:
     - `mkdir -p /srv/exchange`
     - `chown exchange:exchange /srv/exchange`
     - `cd /srv/exchange`
     - `git clone https://github.com/onboarding92/exchange.git .`

---

## C. Production environment configuration

7. **Backend: server/.env.production**
   - Copy:
     - `cp server/.env.production.example server/.env.production`
   - Set values:
     - `SESSION_SECRET=<strong_random_secret>`
       - Long, random, not reused anywhere else.
     - `APP_DOMAIN=https://exchange.yourdomain.com`
     - SMTP settings:
       - `SMTP_HOST`
       - `SMTP_PORT`
       - `SMTP_USER`
       - `SMTP_PASS`
       - `SMTP_FROM`
     - Any optional keys for integrations you plan to enable.

8. **Frontend: client/.env.production**
   - Copy:
     - `cp client/.env.production.example client/.env.production`
   - Set values:
     - `VITE_API_URL=https://exchange.yourdomain.com/api`

9. **Admin and demo credentials**
   - Change default passwords for:
     - `demo@bitchange.money`
     - `admin@bitchange.money`
   - Decide whether to:
     - disable demo login in production, or
     - clearly mark it as demo with low balances and no real withdrawals.

---

## D. Technical verification on the server

10. **Backend tests**
    - `cd server`
    - `npm install`
    - `npm test`
    - All Vitest suites must pass.

11. **Frontend build**
    - `cd client`
    - `npm install`
    - `npm run build`
    - Vite build must complete successfully.

12. **Pre-production check script (optional but recommended)**
    - From repo root:
      - `cd server`
      - `./scripts/preprod_check.sh` (or `bash scripts/preprod_check.sh`)
    - This runs:
      - backend tests
      - frontend build
      - summary of status

13. **Run with Docker compose**
    - From repo root (`/srv/exchange`):
      - `docker compose -f docker-compose.prod.yml build`
      - `docker compose -f docker-compose.prod.yml up -d`

14. **Runtime checks**
    - Healthcheck:
      - `curl https://exchange.yourdomain.com/health`
    - Functional tests (manual, with small internal group):
      - User registration / login
      - Password reset
      - Login alerts (if SMTP configured)
      - Wallet balances
      - Small trades
      - Staking
      - Withdrawals (in controlled environment with test amounts)

---

## E. Security, backups & risk controls

15. **Backups**
    - Use the provided script:
      - `server/scripts/backup_db.sh /srv/exchange/backups`
    - Create a cron entry (example):
      - `0 3 * * * /srv/exchange/server/scripts/backup_db.sh /srv/exchange/backups >> /var/log/bitchange_backup.log 2>&1`
    - Plan off-site backups:
      - Sync `/srv/exchange/backups` to S3 / B2 / Spaces / Wasabi / etc.

16. **Monitoring & alerts**
    - Monitor:
      - `/health` endpoint
      - CPU, RAM, disk usage
      - Application logs (errors, 5xx)
    - Alerts:
      - service down
      - high error rate
      - disk usage > 80%

17. **Risk limits**
    - Decide operational exposure cap:
      - e.g. total capital <= 250k–500k EUR for initial phase.
    - Define withdrawal policies:
      - per-user daily limits
      - manual approval threshold (e.g. > 5,000 EUR)
      - procedure to pause withdrawals in emergencies.
    - See also:
      - `docs/RISK_LIMITS_AND_POLICIES.md`

18. **Admin access & credentials**
    - Ensure:
      - admin passwords are strong and rotated.
      - only trusted operators have admin accounts.
      - IP allowlist / VPN for admin panel (if possible).
      - 2FA usage on email / password managers for admins.

---

## F. Operational procedures

19. **Operations runbook**
    - Review and adapt:
      - `docs/OPERATIONS_RUNBOOK.md`
    - Make sure it covers:
      - what to do if:
        - the site is down
        - users report missing funds
        - suspicious withdrawals are seen
      - how to:
        - restore from backup
        - rotate secrets
        - temporarily freeze withdrawals

20. **Internal beta before public launch**
    - Invite a small group (team / friends).
    - Run with:
      - small balances
      - logging enabled
      - close monitoring.
    - Fix any issues before opening to the public.

---

If all the items above are addressed, BitChange can be considered
ready for a careful, controlled production launch with real money and
moderate user volume.
