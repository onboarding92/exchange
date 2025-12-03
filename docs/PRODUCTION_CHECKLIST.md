# BitChange – Production Checklist (v1)

This checklist is for **launching BitChange with real money** for a **small number of users**
(~hundreds of active users/day, no HFT).

It assumes:
- Backend tests: **all green** (`cd server && npm test`)
- Frontend build: **OK** (`cd client && npm run build`)

---

## 1. Codebase sanity

- [ ] `cd server && npm test` passes (trading, wallet, KYC, withdrawals, staking).
- [ ] `cd client && npm run build` succeeds (Vite build).
- [ ] No Prisma runtime usage (all Prisma files are legacy-only).
- [ ] `server/exchange.db*` are **NOT** tracked in git (SQLite is runtime data).
- [ ] Routers wired:
  - [ ] `auth`, `wallet`, `trading`, `admin`, `kyc`, `devices` are exported in `server/src/routers.ts`.
- [ ] Security middleware present:
  - [ ] `helmet`, `compression`, global rate limit, login rate limit in `server/src/index.ts`.
- [ ] KYC tables exist in `db.ts` and tests for KYC are green.

---

## 2. Environment variables (backend)

Create `server/.env.production` based on `.env.production.example` and ensure:

- [ ] `NODE_ENV=production`
- [ ] `PORT` (or `APP_PORT`) set to the backend port (e.g. `3001`)
- [ ] `SESSION_SECRET` – long random string (at least 32 chars)
- [ ] `JWT_SECRET` – independent long random string
- [ ] `APP_URL` – public URL (e.g. `https://exchange.yourdomain.com`)

SMTP (emails):

- [ ] `SMTP_HOST` – SMTP server host
- [ ] `SMTP_PORT` – usually `587` (STARTTLS)
- [ ] `SMTP_USER`
- [ ] `SMTP_PASS`
- [ ] `SMTP_FROM` – from address like `no-reply@yourdomain.com`

Optional tuning:

- [ ] `MAX_LOGIN_ATTEMPTS_PER_5MIN` (default: 20)
- [ ] `GLOBAL_RATE_LIMIT_PER_15MIN` (default: 300)

---

## 3. Environment variables (frontend)

Create `client/.env.production` (or `.env.production.local` depending on your setup):

- [ ] `VITE_API_URL` – URL of the backend API, e.g. `https://exchange.yourdomain.com/api`
- [ ] Optional flags for UI (e.g. maintenance mode, branding).

Then:

- [ ] `cd client && npm run build` – produces `client/dist`.

---

## 4. Database & data

For **SQLite v1**:

- [ ] `server/exchange.db` will be created automatically on first run by `db.ts`.
- [ ] Seed function `seedIfEmpty()` inserts:
  - [ ] demo user (`demo@bitchange.money`)
  - [ ] admin user (`admin@bitchange.money`)
- [ ] Confirm basic flows on a fresh DB:
  - [ ] user register / login
  - [ ] deposit simulation (if wired)
  - [ ] spot trade demo (small test orders)
  - [ ] internal transfer
  - [ ] withdraw request (admin approval flow)

Backups:

- [ ] `server/scripts/backup_db.sh` exists and is executable
- [ ] You have a cron line planned, e.g.:
  - `0 3 * * * /srv/exchange/server/scripts/backup_db.sh /srv/exchange/backups >> /var/log/bitchange_backup.log 2>&1`
- [ ] Off-site sync strategy defined (S3 / B2 / etc.) for `/srv/exchange/backups`.

---

## 5. Security & sessions

- [ ] Rate limiting active for:
  - [ ] global `/api` usage
  - [ ] `/auth/login` endpoint
- [ ] All admin routes require `role === 'admin'` in `ctx.user`.
- [ ] Device/session management:
  - [ ] `routers.device.ts` is wired under `devices` router in `routers.ts`.
  - [ ] Frontend page uses this to list sessions and revoke tokens.
- [ ] Login alerts:
  - [ ] `emailAlerts.ts` (or equivalent) is wired so new-device logins send an email.
- [ ] 2FA:
  - [ ] If enabled in UI, ensure backend validates OTP where required (withdrawals, security changes).

---

## 6. Manual QA before going live

With a staging environment (or local with real SMTP):

- [ ] Signup + login with a new user.
- [ ] KYC submit + admin review (even if you don't enforce real KYC in production).
- [ ] Password reset flow (email).
- [ ] Admin login + dashboard:
  - [ ] see pending withdrawals
  - [ ] approve / reject one
- [ ] Place a few spot trades:
  - [ ] Market buy/sell
  - [ ] Limit orders that rest on the book, then get matched.
- [ ] Check:
  - [ ] wallet balances update correctly
  - [ ] transaction history shows correct rows
  - [ ] logs (activity log, login alerts) behave as expected.

---

## 7. Known limitations (v1)

- Single-node setup (one VPS, no HA).
- SQLite instead of PostgreSQL (OK for low/moderate volume, must be backed up properly).
- No multi-region redundancy.
- SMS recovery / phone flows depend on a real SMS provider (not configured by default).

---

## 8. Future improvements (Phase 2+)

- Migrate DB to managed PostgreSQL.
- Split services (API, frontend, worker) on different nodes.
- Add:
  - Monitoring (Prometheus/Grafana or hosted APM)
  - Log aggregation (ELK / Loki / etc.)
  - WAF and more advanced DDoS protection.
