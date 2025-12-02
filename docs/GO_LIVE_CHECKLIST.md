# BitChange – Go-Live Checklist (v1)

This checklist is meant to be followed **before** putting real money and real users
on the BitChange instance.

---

## 1. Code & tests

- [ ] Backend tests all green:
      - `cd server && npm test`
- [ ] Frontend builds successfully:
      - `cd client && npm run build`
- [ ] No obvious TypeScript compile errors in CI or local.

---

## 2. Configuration

On the VPS (or build machine):

- [ ] Create `server/.env.production` from `server/.env.production.example`
- [ ] Create `client/.env.production` from `client/.env.production.example`
- [ ] Run:

      cd /srv/exchange
      server/scripts/check_env.sh

  and make sure there are **no [MISSING] errors**.

### Server-side env (minimal)

- [ ] `SESSION_SECRET` is long, random, not reused anywhere else
- [ ] `APP_URL` points to the public URL of the app (e.g. `https://exchange.example.com`)
- [ ] SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`) valid and tested
- [ ] `CORS_ORIGIN` / `FRONTEND_ORIGIN` set to the **exact frontend origin** (e.g. `https://exchange.example.com`)

### Client-side env

- [ ] `VITE_API_BASE` points to backend API base (e.g. `https://exchange.example.com/api`)
- [ ] `VITE_APP_URL` same as `APP_URL`

---

## 3. Database & backups

- [ ] SQLite file (`server/exchange.db`) located on fast SSD
- [ ] Daily backup cron configured, e.g.:

      0 3 * * * /srv/exchange/server/scripts/backup_db.sh /srv/exchange/backups >> /var/log/bitchange_backup.log 2>&1

- [ ] Off-site sync of `/srv/exchange/backups` to S3/B2/Spaces/...

- [ ] **Test restore** performed at least once on a separate environment.

---

## 4. Security & access

- [ ] VPS has:
      - firewall enabled (e.g. UFW or provider-level)
      - only ports 22 (SSH), 80/443 (HTTP/HTTPS) open
- [ ] SSH:
      - key-based auth ONLY (no password login)
      - root login disabled or locked down
- [ ] Docker and repo owner:
      - App runs under non-root user where possible
- [ ] Admin credentials changed from demo (NOT `admin@bitchange.money / admin123`)
- [ ] Demo user disabled on production, or password changed.

---

## 5. Monitoring & logs

- [ ] Basic monitoring:
      - provider dashboards
      - optional external uptime monitor (e.g. ping to `/health`)
- [ ] Log location decided:
      - `docker logs` or centralized `/var/log/bitchange/*.log`
- [ ] Disk space alerts configured (provider-level or cron check).

---

## 6. Operational runbook

- [ ] Written short internal note:
      - How to deploy a new version (git pull + docker compose, or similar)
      - How to roll back
      - How to restore DB from backup
      - Who has SSH access
- [ ] Incident response basics:
      - What to do on suspected compromise
      - How to freeze withdrawals (if/when implemented in future versions)

---

## 7. What this v1 is NOT

This v1 is:

- NOT a fully regulated, audited, multi-node exchange
- NOT designed for HFT or thousands of orders per second
- NOT meant to hold unlimited capital without further hardening

It **is** a good starting point for:

- small/medium user base
- low-to-medium volume
- educational / PoC / controlled environment with real funds, provided risks are accepted and backups + monitoring are in place.
