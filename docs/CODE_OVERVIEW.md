# BitChange – Code Overview (v1)

This document summarizes the main pieces of the BitChange codebase,
so new developers, auditors, or stakeholders can quickly understand
**where things live** and **what they do**.

---

## 1. High-level structure

Repository root:

- `server/` – backend (NodeJS, Express, tRPC, SQLite via better-sqlite3)
- `client/` – frontend (React + Vite + tRPC + Tailwind)
- `docs/` – documentation (deployment, hardening, risks, etc.)
- `docker-compose.prod.yml` – production docker-compose for app + reverse proxy
- `Dockerfile.server` / `Dockerfile.client` – backend/frontend images

---

## 2. Backend (`server/`)

### 2.1. Entry point

- `src/index.ts`
  - Creates Express app
  - Attaches:
    - `cors`
    - `express.json` / `urlencoded`
    - Security middleware:
      - `helmet()` for security headers
      - `compression()` for gzip
      - global `rateLimit` (anti-abuse)
      - extra `rateLimit` for `/auth/login`
  - Mounts tRPC router:
    - `app.use("/api", router);`
  - Exposes:
    - `GET /health` → returns `{ ok: true, ts: ... }` for monitoring

### 2.2. Database layer – `db.ts`

- Uses `better-sqlite3` with:
  - `journal_mode = WAL`
  - `foreign_keys = ON`
- Declares SQLite `CREATE TABLE IF NOT EXISTS` for:
  - `users`
  - `sessions`
  - `emailVerifications`
  - `passwordResets`
  - `userKycDocuments`
  - `wallets`, `transactions`
  - `orders`, `trades`
  - `stakingProducts`, `stakingPositions`
  - internal transfers, withdrawals, etc.
- Provides:
  - `export const db` – shared DB instance
  - `seedIfEmpty()` – seeds:
    - demo user (`demo@bitchange.money`)
    - admin user (`admin@bitchange.money`)

### 2.3. Routers & business logic

- `src/routers.ts`
  - Combines all tRPC routers:
    - `auth: authRouter`
    - `wallet: walletRouter`
    - `trading: tradingRouter`
    - `admin: adminRouter`
    - `kyc: kycRouter`
    - `devices: deviceRouter`

- `src/routers.auth.ts`
  - Authentication (login, logout, password reset, etc.)
  - Uses:
    - `sessions` table for auth tokens
    - email verification & recovery flows
  - Integrates with activity logging & login alerts.

- `src/routers.wallet.ts`
  - User balances, deposit/withdraw views, internal transfers.

- `src/routers.trading.ts`
  - Spot trading engine:
    - Create/cancel orders
    - Match engine logic
    - Trade history
  - Uses `orders` + `trades` tables.

- `src/routers.admin.ts`
  - Admin-only:
    - Approve/reject withdrawals
    - View KYC submissions
    - Dashboard stats
  - All admin endpoints require `ctx.user.role === "admin"`.

- `src/routers.kyc.ts`
  - KYC submission & review
  - `userKycDocuments` table:
    - `frontUrl` (document image / uploaded file link)
    - `status` (`pending` / `verified` / `rejected`)
    - `reviewNote`, `reviewedAt`, `reviewedBy`

- `src/routers.device.ts`
  - Device/session management:
    - List active sessions / devices
    - Revoke specific session tokens
  - Used by the security center in the frontend.

### 2.4. Helpers & utilities

- `src/config.ts`
  - Central place for reading environment variables, like:
    - `SESSION_SECRET`, `JWT_SECRET`
    - SMTP config
    - rate limit parameters
    - `APP_URL`
- `src/activityLog.ts`
  - Records important events (logins, withdrawals, KYC actions).
- `src/emailAlerts.ts`
  - Sends:
    - login alerts (new device / location)
    - security-related notifications

- `src/passwordHistory.ts`
  - Encapsulates logic for password reuse protection
  - Ensures users cannot reuse recent passwords (configurable window).

---

## 3. Frontend (`client/`)

### 3.1. Entry & routing

- `src/main.tsx`
  - React root rendering
  - Theme provider, router, and TanStack Query provider.

- `src/App.tsx`
  - Declares routes for:
    - user pages (`/`, `/wallet`, `/trading`, `/security`, `/kyc`, etc.)
    - admin pages (`/admin`, `/admin/kyc`, `/admin/withdrawals`, etc.)
    - auth pages (`/login`, `/user/verify`, etc.)

### 3.2. tRPC client

- `src/trpc.ts` / `src/lib/trpc.ts`
  - tRPC client configuration
  - Uses `VITE_API_URL` from env to talk to backend `/api`.

### 3.3. Core UI pages

Some important pages (non-exhaustive):

- `pages/Login.tsx`
  - User login & basic error handling.

- `pages/Wallet.tsx`
  - Shows balances & recent transactions
  - Auto-refresh wallet status via tRPC polling.

- `pages/Trading.tsx`
  - Market/limit order placement
  - Order book + trade history display.

- `pages/Kyc.tsx`
  - KYC upload / status check for the user.

- `pages/SecurityCenter.tsx`
  - 2FA, device sessions, login alerts
  - Uses `devices` router on the backend.

- `pages/AdminDashboard.tsx`
  - High-level stats for admins:
    - pending withdrawals
    - pending KYC
    - volumes (where implemented).

- `pages/AdminKyc.tsx`
  - Admin review of KYC submissions.

- `pages/AdminWithdraw.tsx` / `pages/AdminPayments.tsx` (depending on exact file naming)
  - Admin-only management for withdrawals / payments.

### 3.4. UI components

- `components/ui/*` – shared UI primitives:
  - `button`, `input`, `table`, `card`, `badge`, `select`, etc.
- `components/UserNav.tsx`
  - User navigation bar, profile menu.
- `components/ErrorBoundary.tsx`
  - Catches React render errors and shows fallback UI.

---

## 4. Tests

Backend tests (`server/`):

- `src/trading.test.ts` – unit tests for trading logic
- `src/trading.integration.test.ts` – integration flow around order matching
- `src/wallet.test.ts` – wallet operations & invariants
- `src/wallet.locked.test.ts` – locked balances handling
- `src/admin.withdrawals.test.ts` – admin withdrawal flow
- `src/auth.login.test.ts` – login/auth endpoints
- `src/kyc.test.ts` – KYC submission + review
- `src/staking.test.ts` – staking products & positions
- `src/transactions.test.ts` – generic transaction flow tests

All of these currently pass, meaning:
- schema in `db.ts` is consistent with their expectations
- the main flows (auth, wallet, trading, KYC, admin, staking) work at least
  for the covered scenarios.

---

## 5. Known choices & limitations (v1)

- Database: **SQLite** (good for low/moderate load, not designed for huge concurrency).
- Single-node architecture (one server instance).
- Email/SMS integration depends on real providers and correct `.env` configuration.
- No heavy-duty monitoring out of the box (but hooks exist – `/health`, logs, etc.).

