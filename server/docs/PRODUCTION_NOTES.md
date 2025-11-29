# BitChange Exchange - Production Notes

This document summarizes the current backend capabilities and some
next steps required to run this project in a real production setup.

## What is implemented (high-level)

- User login / logout with server-side sessions (SQLite + `sessions` table).
- Demo / admin users seeded in the DB for testing:
  - User: demo@bitchange.money / demo123
  - Admin: admin@bitchange.money / admin123
- Wallet balances, deposits, withdrawals (with internal transfers handled in DB).
- Order book trading (limit orders, matching engine, integration tests).
- Staking module (products + positions, tested).
- KYC module:
  - Users can submit KYC (front document URL, etc.).
  - Admin can review and set status (pending / verified / rejected).
  - Tests cover submission and review logic.
- Admin dashboard APIs:
  - View withdrawals, approve / reject.
  - Inspect trading activity, wallets, etc.
- Frontend:
  - React + Vite SPA, with user and admin panels.
  - Wallet page with auto-refresh.
  - Trading page with simple order placement.
  - KYC pages for user and admin.
  - Security / login history sections.

## What we recently added (code-wise)

These additions are present in the repository but not fully wired into the UI/API yet:

- `src/passwordHistory.ts`
  - Utility to store historical password hashes and check if a new password was recently used.
  - Not plugged into the auth flow yet (safe, tests unchanged).
- `src/sms.ts`
  - Minimal SMS helper stub reading config from env vars:
    - `SMS_PROVIDER`, `SMS_FROM`, `SMS_ACCOUNT_SID`, `SMS_AUTH_TOKEN`
  - Currently logs to console; real provider (Twilio, etc.) can be added later.
- `src/deviceSessions.ts`
  - Helper functions to list and revoke sessions for a user (device/session management building blocks).

## Missing pieces for real production

1. **Real email delivery**
   - Plug a provider (e.g. SendGrid, Postmark, SES).
   - Use mailer for:
     - Signup verification
     - Password reset
     - Login alerts (new device / new IP)
     - Admin notifications (optional)

2. **Real SMS delivery (optional but recommended)**
   - Integrate with Twilio / Vonage / other.
   - Use for:
     - SMS recovery / 2FA
     - Critical actions: withdrawals, password change

3. **Hardened security**
   - Rate limiting (per IP / per user) on login, signup, password reset, KYC submit.
   - Brute-force protection:
     - Lock account after X failed attempts, with cooldown.
   - Strong password policy enforced on signup + change.
   - CSRF protection if used with browser cookies.
   - HTTPS everywhere (TLS termination at load balancer / reverse proxy).

4. **Database / storage**
   - Move from local SQLite file to:
     - Managed PostgreSQL or MySQL, or
     - At least persisted disk (volume) if staying with SQLite.
   - Proper backup / restore strategy.
   - Monitoring for DB size and performance.

5. **KYC document storage**
   - Currently the system expects URLs (`frontUrl`, etc.).
   - In production:
     - Use object storage (S3, DO Spaces, etc.).
     - Signed URLs for secure access.
     - Bucket-level access policies.

6. **Password reset / history wiring**
   - Implement full password reset flow:
     - Request reset -> email with token -> set new password.
   - Plug `passwordHistory` into:
     - Password change endpoint
     - Password reset endpoint
   - Enforce "no recent password reuse" on those flows.

7. **Device / session management UI**
   - Use the `deviceSessions` helpers to:
     - Show list of active sessions in the profile (browser, IP, createdAt).
     - Allow user to revoke a single session or all other sessions.
   - Optionally log login IP / user agent for better UX.

8. **Admin password force reset**
   - Admin tool to flag a user as "must change password on next login".
   - Implementation ideas:
     - Add `forcePasswordChange` boolean column to `users`.
     - After login, if `forcePasswordChange` is true, redirect user to "change password" page.
     - Clear the flag after successful change.

9. **Deployment / architecture**

Minimum recommended setup:

- **Backend**:
  - Node.js (same version as used in development).
  - Run `server` as a service (systemd, PM2, Docker container).
  - Environment variables for DB connection, mailer, SMS, etc.

- **Frontend**:
  - Build static assets with `npm run build` in `client`.
  - Serve files via:
    - Nginx
    - Or CDN / static hosting (S3+CloudFront, etc.)

- **Reverse proxy**:
  - Nginx or Traefik in front of Node:
    - TLS termination
    - Routing `/api` to backend, `/` to frontend.

- **Docker (preferred)**:
  - One container for backend (Node).
  - One container for frontend (static Nginx).
  - One container for DB (Postgres / MySQL / SQLite with volume).
  - Docker Compose for local, later Kubernetes or similar for production.

## Time estimates (rough order of magnitude)

For a mid-level engineer, including thinking time and QA:

- Email integration + password reset flow: **1–2 days**
- Password history enforcement wired into auth flows: **0.5–1 day**
- Device/session management endpoints + UI: **1–1.5 days**
- Admin forced password reset + UI: **0.5–1 day**
- Basic login alerts via email (new IP / new device): **0.5–1 day**
- Deployment (Docker + Nginx + basic monitoring): **1–2 days**

Total: roughly **4–7 working days**, depending on polish, testing depth, and infrastructure maturity.

