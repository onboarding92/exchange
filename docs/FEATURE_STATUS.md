# BitChange – Feature Status (High Level)

This document summarizes the current status of main features in the BitChange
exchange codebase, based on the latest repository state and automated tests.

Status legend:
- ✅ Implemented & covered by tests
- 🟡 Implemented but partial / needs more integration
- 🔴 Not implemented / stub only

---

## 1. Core Platform

### 1.1 Authentication & Sessions
- ✅ User registration & login (email + password)
- ✅ Session management via `sessions` table
- ✅ Admin login (separate admin account)
- ✅ Basic 2FA support (TOTP) – as in original project
- ✅ Login attempts protection via rate limiting (backend middleware)
- 🟡 Device/session listing & revoke:
  - Backend helpers and router present (`deviceSessions` / `routers.device.ts`)
  - Frontend integration minimal; could be improved (UX, auto-refresh).
- 🟡 Login alert emails:
  - Backend utility present (`emailAlerts.ts`).
  - Requires proper SMTP configuration in production `.env`.

### 1.2 Users & Profile
- ✅ Basic profile data (email, creation date)
- ✅ Login history (IP, user agent) persisted
- 🟡 Security center screens on frontend:
  - Show login history, possibly device sessions.
  - Some parts still use static or simplified data.

---

## 2. Wallet & Balances

### 2.1 On-platform Wallet
- ✅ Multi-asset wallets stored in SQLite (`wallets`, `walletBalances`, etc.).
- ✅ Internal transfers between users.
- ✅ Deposit & withdrawal requests data model.
- ✅ Admin approval flow for withdrawals with tests.

### 2.2 Deposits & Withdrawals (real money integration)
- ✅ Backend side:
  - Tables and APIs to *register* deposits/withdrawals.
  - Admin side can mark withdrawals as approved/denied.
- 🔴 Real blockchain / bank integration:
  - No direct connection to external wallets / nodes.
  - You (the operator) must manually manage transfers on-chain / banking
    and then reflect them into the DB via admin tools.
- 🟡 Risk management:
  - No advanced AML, sanctions checks, or velocity limits.
  - Only basic limits and flags on the admin/interface side.

---

## 3. Trading Engine

- ✅ Order book model (buy/sell limit orders).
- ✅ Matching engine implemented and covered by tests.
- ✅ Trading integration test (happy path).
- ✅ Basic market overview + order placement from frontend.
- 🟡 No advanced features like:
  - stop-loss / take-profit
  - margin / leverage
  - cross-asset risk engine

For a small user base and spot-only trading, this is acceptable but not HFT-grade.

---

## 4. Staking

- ✅ Staking products table & logic
- ✅ Ability to create staking positions and accrue rewards
- ✅ Tests covering core staking flows
- 🟡 No complex lock-in / early-unstake penalty logic (beyond simple rules)
- 🟡 No dynamic APRs linked to external oracles

---

## 5. KYC

- ✅ KYC basic flow:
  - User can submit documents (URLs).
  - Status set to `pending`.
  - Admin can review and mark as `verified` / `rejected`.
- ✅ KYC tables (`userKycDocuments`) exist and are tested.
- 🟡 No integration with external KYC providers.
- 🟡 No liveness / selfie or advanced checks.
- 🟡 No regulatory reporting / AML integration.

This is **NOT** sufficient for a regulated exchange, but can be used for
an educational / private / limited-scope environment.

---

## 6. Admin Panel

- ✅ Admin dashboard route and pages.
- ✅ Admin KYC view and actions.
- ✅ Admin withdrawals review and approval.
- ✅ Basic promo / campaigns screens (some with static or simplified data).
- 🟡 Many admin pages read from the backend, but some summary cards still rely
  on simple queries and could be refined.
- 🟡 Admin audit trail:
  - Activity log table + helper present, but not all actions are logged yet.

---

## 7. Security Features

- ✅ Password hashing (bcrypt).
- ✅ Session tokens in DB with role and user ID.
- ✅ Rate limiting with `express-rate-limit` (global and per-login).
- ✅ Security headers via `helmet`.
- ✅ Gzip compression via `compression`.
- ✅ Separate environment files for production (`.env.production.example`).
- 🟡 Password history / non-reuse:
  - Helper module present (`passwordHistory.ts`).
  - Needs explicit wiring into password change/reset flows if not already.
- 🟡 SMS / phone-based recovery:
  - `sms.ts` stub exists.
  - Requires real provider integration and config.

Remember: SQLite + single-node makes this **not** a bank-grade deployment,
but sufficient for small traffic and educational / low-volume use, if you
add strong operational discipline.

---

## 8. Frontend

- ✅ React + Vite + tRPC wiring working (build passes).
- ✅ Main user flows:
  - Login / Register
  - Wallet view
  - Trading page
  - Staking page
  - KYC page
  - Transactions, profile, security center, support.
- ✅ Admin flows (KYC, withdrawals) wired and tested via backend.
- 🟡 Some pages still have:
  - placeholder text
  - simplified stats (e.g. admin dashboard cards).
- 🔴 No full responsive QA for all devices has been performed here.

---

## 9. Logging & Monitoring

- ✅ Basic activity log table on backend.
- ✅ Login/IP tracking.
- 🟡 No advanced monitoring/alerting in code (to be handled at infra level):
  - logs shipping
  - metrics / uptime probing
  - alerting.

