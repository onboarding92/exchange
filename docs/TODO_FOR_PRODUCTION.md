# BitChange – Production TODO Checklist (v1)

This file summarizes what is still needed to safely run BitChange
with **real money** and ~100 active users/day (non-HFT usage).

It focuses on *operations & security*, since the codebase already:
- passes backend tests (`server/npm test`)
- builds the frontend (`client/npm run build`)
- has admin panel, trading, wallets, staking, KYC, logs, device sessions, etc.

---

## 1. MUST-HAVE before handling real money

These are **blocking** items before letting real users deposit/withdraw.

### 1.1. Secrets & ENV configuration

- [ ] Generate strong, unique values for:
  - `SESSION_SECRET` in `server/.env.production`
  - any other secrets (JWT/crypto/email signing if added)
- [ ] NEVER commit `.env.production` to Git
- [ ] Store the secrets somewhere safe (password manager, etc.)

### 1.2. SMTP / Email provider

Used for:
- login alerts
- device/session notifications
- password recovery flows
- optional KYC / support communications

Tasks:
- [ ] Choose provider (Mailgun / SES / SendGrid / Postmark / etc.)
- [ ] Create SMTP user + password
- [ ] Configure:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_FROM` (e.g., no-reply@yourdomain.com)
- [ ] Set SPF, DKIM and (optionally) DMARC for the domain
- [ ] Test:
  - [ ] login alert email
  - [ ] password reset email
  - [ ] new device email

### 1.3. Domain + HTTPS

- [ ] Buy/assign a domain (e.g. `exchange.yourdomain.com`)
- [ ] Point DNS A record to VPS IP
- [ ] Configure HTTPS (Lets Encrypt / Certbot / or provider)
- [ ] Verify:
  - [ ] `https://exchange.yourdomain.com` serves the frontend
  - [ ] `https://exchange.yourdomain.com/health` returns `{ ok: true }`

### 1.4. Backups (database)

Currently DB = **SQLite** (`server/exchange.db`).

You already have `server/scripts/backup_db.sh`.

Must:
- [ ] Decide local backup path (e.g. `/srv/exchange/backups`)
- [ ] Create cron job on the server:
  - e.g. `0 3 * * * /srv/exchange/server/scripts/backup_db.sh /srv/exchange/backups`
- [ ] Periodically copy backups off-server to object storage (S3/B2/etc.)
- [ ] Test restore procedure in a dev environment.

### 1.5. Access control & admin safety

- [ ] Change **admin password** from default (`admin123`) to a strong one.
- [ ] Change **demo password** or disable demo account in production.
- [ ] Verify admin panel is not accessible to non-admin users.
- [ ] Keep a private admin account not shared among multiple people.

### 1.6. Real blockchain integration (if used)

If BitChange is used with real crypto:

- [ ] Decide hot wallet strategy (which chains, which tokens).
- [ ] Use providers (e.g. Infura/Alchemy/etc.) or your own node.
- [ ] Store API keys and private keys **outside** Git.
- [ ] Keep very small balance in hot wallet, majority in cold storage.
- [ ] Implement manual or semi-manual large withdrawals review.

---

## 2. SHOULD-HAVE soon after go-live

Important, but not strictly blocking for a controlled first launch.

### 2.1. Monitoring & alerting

- [ ] Set up basic server monitoring (CPU, RAM, disk):
  - provider tools or external services (UptimeRobot, HetrixTools, etc.)
- [ ] Monitor:
  - `/health` endpoint
  - number of 5xx errors
  - DB file size
  - withdrawal queue size
- [ ] Configure alerts:
  - downtime
  - high error rate
  - disk > 80%
  - too many failed logins

### 2.2. Logs & retention

- [ ] Centralize logs (journalctl, docker logs, or external log service).
- [ ] Decide log retention:
  - e.g. keep 30–90 days depending on legal and privacy.

### 2.3. Legal & UX basics

Even if not a fully regulated exchange:

- [ ] Add Terms of Service page.
- [ ] Add basic Privacy Policy.
- [ ] Explain risks of crypto, no guarantee of profits, etc.
- [ ] Show clear contact/support info.

---

## 3. LATER / NICE-TO-HAVE (Phase 2+)

When traffic and capital increase.

### 3.1. Database migration

- [ ] Migrate from **SQLite** to **PostgreSQL** (managed service preferred).
- [ ] Update DB layer:
  - use Sequelize/Prisma/Drizzle or custom SQL on Postgres.
- [ ] Keep strict schema migrations.

### 3.2. Infrastructure hardening

- [ ] Separate DB on a different host or managed service.
- [ ] Add a WAF or Cloudflare in front of the exchange.
- [ ] Add multi-region backups.
- [ ] Implement full observability stack (Prometheus/Grafana or similar).

### 3.3. Advanced security features

- [ ] Optional IP allowlisting for admin.
- [ ] More granular rate limits per route.
- [ ] Device fingerprinting / anomaly detection.
- [ ] External code security review / pentest.

---

## 4. Manual checklist before going live

Before enabling real deposits/withdrawals:

- [ ] All tests GREEN: `cd server && npm test`
- [ ] Frontend build OK: `cd client && npm run build`
- [ ] All ENV variables set and documented.
- [ ] SMTP tested (alerts + recovery).
- [ ] Backups configured + test restore done.
- [ ] Admin accounts hardened.
- [ ] Monitoring & basic alerts online.
- [ ] Legal pages visible to users.
- [ ] A rollback / shutdown plan exists in case of incident.

