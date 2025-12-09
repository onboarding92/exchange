# BitChange – Launch Status Summary (v1)

This document summarizes the current status of the BitChange exchange
and what remains to safely run it with real money and ~100 users/day.

---

## 1. Codebase status (TECHNICAL)

### 1.1. Backend (server)

- Language: TypeScript (Node.js)
- Framework: Express + tRPC
- DB: SQLite (`exchange.db`) with WAL enabled
- Tests:
  - ✅ `npm test` (all Vitest suites green)
    - trading
    - wallet
    - staking
    - withdrawals (admin)
    - KYC basics
    - auth/login
- Extra tools:
  - `/health` endpoint for monitoring
  - `scripts/dev_reset_db.sh` (reset DB in dev)
  - `scripts/backup_db.sh` (SQLite backups)
  - `scripts/smoke_test.sh` (basic runtime health)
  - `scripts/preprod_check.sh` (full pre-production check: tests + frontend build)

### 1.2. Frontend (client)

- Language: TypeScript + React
- Tooling: Vite, tRPC client, Tailwind, etc.
- Build:
  - ✅ `npm run build` succeeds
- Features:
  - User login
  - Wallet view
  - Trading UI
  - Staking UI
  - KYC pages
  - Admin panel sections (withdrawals, KYC, logs, etc.)

---

## 2. Documentation status

Already present in `docs/`:

- `PRODUCTION_NOTES.md`  
- `INFRASTRUCTURE_PLAN.md`  
- `DEPLOYMENT_STEP_BY_STEP.md`  
- `RISK_LIMITS_AND_POLICIES.md`  
- `SECURITY_CHECKLIST.md`  
- `GO_LIVE_README.md`  
- `OPERATIONS_RUNBOOK.md`  
- `ENV_REFERENCE.md`  
- `TODO_FOR_PRODUCTION.md`  
- `LAUNCH_STATUS_SUMMARY.md` (this file)

These cover:

- How to deploy on a single VPS with Docker
- Operational procedures
- Risk & withdrawal policies (v1)
- Security checklist
- Environment variables needed
- Remaining TODO before real-money launch

---

## 3. What is READY

From a **code point of view**, the following is done:

- ✅ Backend logic for:
  - users, auth, sessions
  - wallets and balances
  - trading engine (basic limit orders)
  - staking
  - KYC records
  - admin withdrawals
- ✅ Tests in `server` all green
- ✅ Frontend build in `client` passes
- ✅ Several operational scripts exist for:
  - tests
  - backup
  - preprod check
  - basic smoke tests

You can run, in the repo root:

- `cd server && npm test`
- `cd client && npm run build`
- `cd server && ./scripts/preprod_check.sh` (or `bash scripts/preprod_check.sh`)

---

## 4. What is NOT READY (BLOCKERS for real money)

These points should be considered **blocking** for running with real money:

1. **Production server not yet provisioned**
   - Need a VPS (4 vCPU, 8GB RAM, 160GB SSD – see `INFRASTRUCTURE_PLAN.md`)

2. **Secrets & ENV**
   - `SESSION_SECRET` must be strong and unique
   - SMTP credentials must be configured
   - Domain (`APP_DOMAIN`, `VITE_API_URL`) must be set for production URLs

3. **SMTP / Email provider**
   - A real SMTP provider must be configured
   - Login alerts / device alerts / password reset mails must be tested end-to-end

4. **Backups & off-site storage**
   - `server/scripts/backup_db.sh` must be wired to cron on the server
   - Off-site backup pipeline (e.g. S3/B2) must be defined and tested

5. **Admin account hardening**
   - Default admin/demo credentials must be changed before go-live
   - Admin panel access must be tested and restricted

6. **Monitoring & alerts**
   - `/health` must be monitored externally
   - CPU/RAM/disk and errors should trigger alerts

All these are detailed in `TODO_FOR_PRODUCTION.md` and `SECURITY_CHECKLIST.md`.

---

## 5. Risk and capacity

This version of BitChange is intended for:

- A **single-node** deployment (one VPS)
- **Moderate traffic**, e.g. up to ~100 active users/day
- No high-frequency trading
- Controlled real-money exposure (recommended cap in `RISK_LIMITS_AND_POLICIES.md`)

---

## 6. Next concrete steps

To move from "code ready" to "production ready", do in order:

1. Provision VPS (see `INFRASTRUCTURE_PLAN.md`)
2. Follow `DEPLOYMENT_STEP_BY_STEP.md` on that VPS
3. Configure `.env.production` files for:
   - server
   - client
4. Run `server/scripts/preprod_check.sh` on the VPS
5. Set up:
   - backups
   - monitoring
   - admin passwords change
6. Do a **small internal beta** (friends/team only) before opening to real users.

