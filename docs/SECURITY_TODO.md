# BitChange – Security TODO (Code & Ops)

This document tracks remaining security-related work.
Some items are "nice to have", others are "do before big money".

---

## A. Code-level TODO

Priority legend:
- (H) High
- (M) Medium
- (L) Low / Nice-to-have

### A.1 Authentication & sessions

- (M) Review session lifetime & invalidation strategy:
  - consider shorter session TTL
  - periodic re-auth for high-risk operations
- (M) Ensure all device/session endpoints are behind:
  - authenticated routes
  - server-side checks on userId

### A.2 Trading / wallet

- (M) Double-check all *balance mutations*:
  - no negative balances possible
  - all DB updates for trades are atomic (single transaction) where possible
- (M) For withdrawals:
  - status transitions restricted (`pending` -> `approved`/`rejected`)
  - only admins can approve, checked by role

### A.3 Rate limiting / brute force

- (H) Ensure:
  - login routes fully rate-limited
  - password reset routes rate-limited
  - KYC submission routes rate-limited
- (M) Add per-IP & per-account controls (configurable thresholds).

### A.4 KYC / PII

Even if "light" KYC:

- (M) Be sure that:
  - KYC data is not logged in plain text
  - KYC document URLs are not guessable (use secure random IDs)
  - Access to KYC data is restricted to admins

---

## B. Infra / Ops TODO (outside code)

See also `INFRASTRUCTURE_PLAN.md` and `REAL_MONEY_READY_CHECKLIST.md`.

- (H) Proper firewall rules:
  - Only required ports open (80/443 and maybe SSH)
- (H) SSH hardening:
  - disable password auth (use SSH keys)
  - restrict SSH users
- (M) Centralized log storage (even simple: rotate & send to S3/SIEM)
- (M) Off-site DB backup automation with monitoring:
  - alert if backup fails

---

## C. Longer-term / Scale-up

- Move DB from SQLite to PostgreSQL (managed service)
- Introduce job queue (for email, heavy tasks)
- Advanced monitoring / alerting (APM, error tracking)
- Third-party security audit on running infrastructure

