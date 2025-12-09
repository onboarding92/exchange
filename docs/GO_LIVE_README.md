# BitChange – Go Live Overview

This document is for non-technical stakeholders who need to understand
what is ready, what remains, and how to use the platform safely.

---

## 1. What you have today

BitChange is a small crypto exchange with:

- User area:
  - Registration / login with email + password
  - Wallet balances in multiple assets
  - Deposit / withdraw flows (on-chain integration depends on infra)
  - Simple spot trading (limit/market style, low volume)
  - Basic KYC flow (documents + admin review)
  - Security center (password change, login history, sessions)

- Admin area:
  - Login as admin
  - View users, KYC submissions, withdrawals
  - Approve / reject KYC
  - Approve / reject withdrawals
  - Basic audit logs and activity logs

- Technical features:
  - Backend fully covered by unit/integration tests (Vitest)
  - Frontend built with React + Vite + tRPC
  - SQLite database (simple to operate, good for low/medium traffic)
  - Security middleware (helmet, rate limiting, etc.)
  - Health endpoint (`/health`) for monitoring
  - Scripts for:
    - DB backup
    - Dev reset DB
    - Pre-production check

This is **NOT** a Binance-scale engine. It is a small, educational-grade
exchange that can be used with **limited volume and users**,
provided that the operator understands the risks and limitations.

---

## 2. What still depends on infrastructure

To use real money, you still need to:

- Deploy on a real VPS with:
  - Docker
  - Nginx + HTTPS
- Configure:
  - SMTP (emails for login alerts, recovery, admin notifications)
  - ENV secrets (`SESSION_SECRET`, SMTP credentials, domain, etc.)
- Set up:
  - Backups for SQLite DB (cron + off-site)
  - Basic monitoring (uptime, disk space, error rate)

There is a separate document with concrete steps:
- `docs/DEPLOYMENT_STEP_BY_STEP.md`

---

## 3. Safe capacity (approximate)

With the current architecture (single VPS, SQLite, no HFT),
a reasonable starter target is:

- up to ~100 active users per day
- limited number of concurrent orders / withdrawals
- no high-frequency trading

If traffic and capital managed grow, you should:

- move from SQLite to PostgreSQL
- separate app and DB on different servers
- implement more advanced monitoring and alerting

---

## 4. Operator responsibilities

Before accepting real money, the operator must:

- Change ALL default passwords (admin, demo)
- Configure strong admin credentials
- Review and follow:
  - `docs/SECURITY_CHECKLIST.md`
  - `docs/RISK_LIMITS_AND_POLICIES.md`
  - `docs/INFRASTRUCTURE_PLAN.md`

The platform does **not** automatically protect you from all:
- regulatory constraints
- AML / KYC obligations
- custody risks

Those are business / legal responsibilities of the operator.

---

## 5. Pre-launch recommended command

Technical operator should run:

- `cd server && npm test`
- `cd client && npm run build`
- Or simply:

  - `./server/scripts/preprod_check.sh`

If all steps succeed, and the checklists are satisfied,
the system is technically ready to be deployed to production.

