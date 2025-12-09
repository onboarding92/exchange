# BitChange – Security Checklist (v1)

This checklist is intended for the operator before going live with real money.

---

## 1. Secrets & Environment

- [ ] `SESSION_SECRET` is:
  - long (>= 32 chars)
  - random (generated with `openssl rand -hex 32` or similar)
  - different between staging / production
- [ ] SMTP credentials configured in `server/.env.production` (NOT committed)
- [ ] No `.env` files present in git status
- [ ] Admin password changed from default (`admin123`)

---

## 2. Accounts & Access

- [ ] Default admin user password changed to a strong one
- [ ] 2FA enabled for admin account (if used)
- [ ] SSH access to server:
  - [ ] password login disabled
  - [ ] only key-based auth
- [ ] `sudo` restricted to minimal trusted operators

---

## 3. Application Config

- [ ] `APP_DOMAIN` / `VITE_API_URL` set correctly for production
- [ ] TLS/HTTPS enabled (Let’s Encrypt or equivalent)
- [ ] `/health` endpoint reachable only for monitoring (optional IP limit)

---

## 4. Database & Backups

- [ ] SQLite DB file is stored on SSD with limited access
- [ ] `server/scripts/backup_db.sh` configured in cron (daily)
- [ ] Backups synced off-site (S3 / B2 / etc.)
- [ ] Restore procedure tested at least once

---

## 5. Logs & Monitoring

- [ ] Server logs:
  - [ ] rotated (logrotate / journald)
  - [ ] stored at least 30 days
- [ ] Monitoring in place for:
  - [ ] uptime
  - [ ] error rate (5xx)
  - [ ] disk usage (>80% alert)
- [ ] Login alerts via email configured and tested

---

## 6. Business Rules

- [ ] Withdrawal limits defined (per-day / per-user)
- [ ] Emergency procedure:
  - [ ] Ability to pause withdrawals quickly
  - [ ] Clear runbook for incidents

---

## 7. Final Pre-Launch Check

- [ ] Backend unit tests: `npm test` (in `server/`) all green
- [ ] Frontend build: `npm run build` (in `client/`) successful
- [ ] Manual end-to-end test with small real transaction on mainnet/test environ
