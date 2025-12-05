# BitChange – Real Money Ready Checklist (v1)

This checklist is meant to be used RIGHT BEFORE allowing **real money** on the platform.
It focuses on the *practical* items that must be true.

---

## 1. Code & tests

- [ ] Backend tests green:
      Run from `server/`:
      - `npm test`
- [ ] Frontend production build OK:
      Run from `client/`:
      - `npm run build`
- [ ] No local "temporary" hacks or debug flags active.

---

## 2. Configuration (env vars)

### Backend (`server/.env.production`)

- [ ] `NODE_ENV=production`
- [ ] `PORT=3001` (or your chosen port)
- [ ] `SESSION_SECRET` is:
      - long (32+ chars)
      - random
      - NOT checked into git
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` set
- [ ] `MAIL_FROM` is a valid sender (aligned with SPF/DKIM)
- [ ] `APP_BASE_URL` set (e.g. `https://exchange.yourdomain.com`)

### Frontend (`client/.env.production`)

- [ ] `VITE_API_BASE_URL` points to backend (e.g. `https://exchange.yourdomain.com/api`)
- [ ] `VITE_APP_ENV=production` (or similar flag if used)

---

## 3. Database & backups

- [ ] DB file path known (SQLite v1: `server/exchange.db`)
- [ ] Daily backup configured using:
      - `server/scripts/backup_db.sh /srv/exchange/backups`
- [ ] Off-site copy (S3/B2/Spaces/etc.) configured for backups
- [ ] Restore procedure tested at least once:
      - Take a backup
      - Restore to a dev/stage environment
      - Run tests / smoke tests

---

## 4. Email / security flows

- [ ] Email sending tested on production SMTP:
      - login alert email
      - device / session email
      - password reset email (if implemented)
- [ ] From address is not going to spam (SPF/DKIM at least minimally OK)
- [ ] Users can:
      - log in
      - see wallet
      - do a small deposit / internal test flow (on a small amount)

---

## 5. HTTPS / network

- [ ] HTTPS configured (Let’s Encrypt or equivalent)
- [ ] Nginx (or similar) in front:
      - reverse proxy to backend
      - serves frontend build
- [ ] `app.set("trust proxy", 1)` enabled in backend (done in code)
- [ ] Port 80/443 only (other ports firewalled unless strictly needed)

---

## 6. Monitoring & logs

- [ ] Basic uptime monitoring:
      - ping `/health` endpoint
- [ ] Disk / CPU / RAM metrics (provider dashboard or a lightweight agent)
- [ ] Log retention policy:
      - Backend logs
      - Activity/security logs (admin actions, logins)
- [ ] At least one person receives alerts (email/telegram/etc.)

---

## 7. Operational processes

- [ ] Who has SSH access documented (minimal set)
- [ ] Who has admin account(s) on the exchange documented
- [ ] Procedure in case of:
      - user password reset
      - suspected compromised account
      - emergency shutdown (how to stop all trading / withdrawals)

---

## 8. Future improvements (not blocking MVP)

These are recommended but not blockers for a small, low-traffic real-money MVP:

- [ ] Move from SQLite to PostgreSQL when volume or concurrency grows
- [ ] Deeper 2FA everywhere withdrawals are initiated
- [ ] More granular admin permission levels
- [ ] External security review of infra + running setup
