# BitChange – TODOs Before Real-Money Production

This checklist covers what should be done before letting **real users**
move **real money** through this system. It assumes a small / moderate
traffic exchange (tens / low hundreds of users per day), *not* Binance scale.

---

## 1. Configuration & Secrets

- [ ] Create `server/.env.production` from `.env.production.example`
- [ ] Create `client/.env.production` from `.env.production.example`
- [ ] Set strong secrets:
  - [ ] `SESSION_SECRET`
  - [ ] Any JWT / token secrets (if present)
  - [ ] Turn off any debug flags
- [ ] Configure correct public URLs:
  - [ ] Backend API base URL
  - [ ] Frontend public URL
- [ ] Configure CORS so only your frontend domain can call the backend.

---

## 2. Email / SMTP

- [ ] Choose SMTP provider (Mailgun, SES, SendGrid, Postmark, etc.)
- [ ] Configure:
  - [ ] SMTP host
  - [ ] Port
  - [ ] User / password or API key
  - [ ] From address (e.g. `no-reply@yourdomain.com`)
- [ ] Set DNS records:
  - [ ] SPF
  - [ ] DKIM
  - [ ] DMARC (optional but strongly recommended)
- [ ] Test flows:
  - [ ] Login email alerts
  - [ ] Password reset emails
  - [ ] KYC / admin notifications (if wired)

---

## 3. Security & Hardening

- [ ] Ensure **HTTPS** end to end (TLS cert via Let's Encrypt or provider)
- [ ] Confirm `helmet` is enabled in production
- [ ] Confirm `express-rate-limit` active (global + login)
- [ ] Ensure no `CORS: *` in production; restrict origins
- [ ] Disable any test-only routes if present
- [ ] Review environment:
  - [ ] Node.js LTS
  - [ ] Up-to-date `npm` and critical libs
- [ ] Run `npm audit` in server and client:
  - [ ] Decide which vulnerabilities must be fixed now
  - [ ] Document any accepted risks.

---

## 4. Database & Backups

Current DB is **SQLite** (`exchange.db`).

- [ ] Place DB on fast SSD
- [ ] Ensure WAL mode is enabled (already done in code)
- [ ] Set up local automated backups:
  - [ ] Use `server/scripts/backup_db.sh` via cron (e.g. daily at 03:00)
  - [ ] Store backups in `/srv/exchange/backups` or similar
- [ ] Set up off-site backup:
  - [ ] Sync backups to S3 / B2 / Spaces / etc.
- [ ] Test restore procedure:
  - [ ] Spin up a dev instance and restore a backup
  - [ ] Run migration/tests against restored DB.

For higher capital / volume, plan a **Phase 2** migration to PostgreSQL.

---

## 5. Operational Limits & Manual Procedures

- [ ] Define **manual process** for:
  - [ ] Approving withdrawals (who, how, 4-eyes principle?)
  - [ ] Freezing a user account
  - [ ] Handling suspected fraud
- [ ] Decide deposit/withdrawal limits:
  - [ ] Per-user daily limit
  - [ ] Per-asset limits
- [ ] Document how on-chain or banking movements are reconciled with DB:
  - [ ] Who sends crypto / receives fiat
  - [ ] How to record them in the admin panel

---

## 6. KYC & Legal

For **real, public exchange**, this system is **NOT sufficient** by itself.
If you run it in a small private circle, still:

- [ ] Decide what info you collect (KYC light vs heavy)
- [ ] Decide which jurisdictions you accept users from
- [ ] Consult a lawyer / compliance expert:
  - [ ] Licensing
  - [ ] AML obligations
  - [ ] Reporting thresholds
- [ ] Document what KYC status values mean operationally.

---

## 7. QA / Testing Scenarios

Before enabling deposits and withdrawals for real users, run manual QA:

### User flows

- [ ] Registration, login, logout
- [ ] Enable 2FA (if you enable it operationally)
- [ ] Change password
- [ ] Password reset via email
- [ ] Login from new device → check device list / alert (if enabled)

### Wallet & trading

- [ ] See balances and recent transactions
- [ ] Do a couple of internal transfers
- [ ] Place buy and sell orders, verify matching engine
- [ ] Check order history and trade history

### KYC

- [ ] Submit KYC docs as user
- [ ] Review/approve as admin
- [ ] Verify status reflected in the UI

### Admin

- [ ] Review withdrawal requests
- [ ] Approve one and simulate manual blockchain/bank transfer
- [ ] Reject one and verify user sees correct status
- [ ] Check logs / activity where available

---

## 8. Monitoring & Logging

- [ ] Decide how to catch issues in production:
  - [ ] Centralized logs (e.g. journald, Loki, ELK, Datadog, etc.)
  - [ ] Basic alerts when:
    - [ ] API is down
    - [ ] Unusual error spikes
- [ ] Add uptime probes:
  - [ ] `/health` endpoint exposed and checked by external monitor.

---

## 9. Known Limitations (v1)

- Single-node architecture (one VPS)
- SQLite database (good for low volume, not for high concurrency)
- No automated blockchain integration
- No full AML engine
- No full accounting module
- No full KYC vendor integration

You should **not** market this as a large public / regulated exchange
without significant extra work. For **small, controlled usage** with
careful operational procedures, it can be acceptable as a v1.

