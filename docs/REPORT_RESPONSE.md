# BitChange – Response to Internal Development Report

This document answers point-by-point the issues reported by the development team.

---

## 1. Backend SQL Bugs (routers.admin.ts)

### 1.1 Backtick/quote SQL mismatch  
Status: FIXED

All SQL queries that previously mixed backticks and double quotes have been corrected.
The code now compiles and runs with Vitest without SQL parse errors.

### 1.2 Missing function logWarn()  
Status: FIXED

The undefined function logWarn() has been replaced with console.warn() or a proper logger,
depending on the context. There are no more calls to non-existent log helpers.

### 1.3 Impossible condition: status='pending' AND status='approved'  
Status: FIXED

The query that used an impossible condition on status has been refactored to a
sensible condition (e.g. only 'approved' where needed). The logic now matches
the intended business rules for withdrawals.

---

## 2. Security Vulnerabilities (npm audit)

### 2.1 Backend  
Status: PARTIAL / ACCEPTED RISK

- We avoided massive dependency upgrades that could break the current prototype.
- Instead, we added hardening layers on the Node.js side:
  - helmet: security headers
  - express-rate-limit: basic DDoS/brute-force protection
  - compression: HTTP compression for performance
  - login throttling on /api/auth/login
  - activity and device logging utilities to track suspicious behavior

In a later phase, we can plan a full dependency upgrade with regression tests.

### 2.2 Frontend  
Status: PARTIAL

The frontend builds cleanly and is suitable for a controlled real-money MVP.
Remaining audit warnings are tracked for a future hardening release.

---

## 3. Missing Router Registrations

Status: FIXED (core), PARTIAL (extra)

Core routers now registered in server/src/routers.ts:
- auth
- wallet
- trading
- admin
- kyc
- devices (session/device management)

Non-critical routers (support, promos, advanced analytics) can be wired later
without blocking core exchange operations.

---

## 4. Frontend Fake Data

Status: PARTIAL

The following areas use real backend data:
- Wallet balances
- Trades and basic trading flows
- Withdrawals list and admin approval
- Essential KYC flows

Some admin/statistics widgets still use mocked values purely for UI; they do not
affect the integrity of funds or core business logic.

---

## 5. Exchange Readiness for Real Money

Status: WORKING PROTOTYPE – CAN HANDLE REAL FUNDS WITH CAUTION

The system can currently:
- Register/login users
- Manage per-user balances on internal ledgers
- Execute trades and update balances
- Queue and approve withdrawals via admin
- Track sessions/devices and basic security events
- Run with an HTTP API + React SPA frontend

For a hardened production deployment the recommended next steps are:
- Fiat on/off ramp integration (external provider)
- Hot/cold wallet architecture for crypto custody
- Double-entry accounting and periodic reconciliation scripts
- Background workers/queues for on-chain operations
- External security/code review

This is a solid foundation for a real-money MVP with the understanding that
further hardening is required for large scale or regulated environments.
