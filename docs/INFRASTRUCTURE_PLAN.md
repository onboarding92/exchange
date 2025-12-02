# BitChange – Infrastructure Plan (v1)

This document describes a pragmatic production setup for the BitChange exchange.

The goal: handle **real money** with **moderate traffic** (no HFT, no thousands of ops/sec),
with a **single main node**, good security hygiene, and clear backup strategy.

---

## 1. High-level architecture

- **Single VPS** running:
  - Docker + docker-compose
  - Backend container (NodeJS + SQLite for v1)
  - Frontend container (React build, served via Nginx)
  - Nginx reverse proxy (80/443) terminating TLS
- **Domain + DNS**:
  - e.g. `exchange.yourdomain.com` -> VPS public IP
- **SMTP provider** for:
  - login alerts
  - device / session emails
  - recovery emails
- **Off-site backups**:
  - S3/B2/Spaces/etc. for:
    - SQLite DB backups (`exchange.db`)
    - Optional archive of config/scripts

---

## 2. VPS specification (Phase 1)

Recommended minimal spec:

- 4 vCPU
- 8 GB RAM
- 160–200 GB SSD
- OS: Ubuntu 22.04 LTS
- Public static IP

Providers: Hetzner, DigitalOcean, OVH, AWS Lightsail, etc.

---

## 3. Components to provision ("shopping list")

**Compute**
- [ ] 1x VPS (see spec above)

**Domain / DNS**
- [ ] Domain (or subdomain) for the exchange
- [ ] A record pointing to VPS IP

**Email / SMTP**
- [ ] 1x Email provider (Mailgun / SendGrid / Postmark / SES / etc.)
- [ ] SMTP credentials
- [ ] SPF record
- [ ] DKIM keys
- [ ] DMARC policy (optional but recommended)

**Backups / Storage**
- [ ] Off-site object storage (S3 / B2 / Spaces / Wasabi / etc.)
- [ ] Cron job calling `server/scripts/backup_db.sh` daily
- [ ] Optional: additional weekly snapshot to off-site

---

## 4. Runtime layout on the VPS

Directory layout suggestion:

- `/srv/exchange` – git clone of the repo
- `/srv/exchange/server` – backend
- `/srv/exchange/client` – frontend
- `/srv/exchange/backups` – local DB backups (before off-site sync)

---

## 5. Deploy flow (high level)

1. SSH into VPS
2. Install Docker + docker-compose plugin
3. Clone repo: `git clone https://github.com/onboarding92/exchange.git`
4. Copy `.env.production.example` to `.env.production` in:
   - `server/.env.production`
   - `client/.env.production`
5. Edit `.env.production` files:
   - set SMTP, DOMAIN, SESSION_SECRET, etc.
6. Build & run with docker-compose:
   - `docker compose -f docker-compose.prod.yml build`
   - `docker compose -f docker-compose.prod.yml up -d`
7. Configure Nginx / TLS (either inside docker or on host)
8. Configure cron:
   - e.g. `0 3 * * * /srv/exchange/server/scripts/backup_db.sh /srv/exchange/backups`

---

## 6. Phase 2 (later)

Once traffic or capital exposure grows, plan to:

- Migrate from **SQLite** to **managed PostgreSQL**
- Add:
  - WAF / advanced rate limiting
  - Dedicated monitoring (Prometheus/Grafana or hosted APM)
  - Separate nodes for:
    - app
    - DB
    - static/frontend

