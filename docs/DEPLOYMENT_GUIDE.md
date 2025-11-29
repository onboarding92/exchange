# Bitchange Exchange – Deployment Guide (Draft)

This document describes how to run the Bitchange Exchange as a DEMO / EDUCATIONAL system.
It is NOT a full production-grade deployment for real-money trading.

## 1. Architecture (current repo)

- `server/`: Node.js + TypeScript backend with:
  - Auth (sessions, login, password reset)
  - Users, KYC, wallet, trading, staking, withdrawals
  - Admin panel APIs
  - SQLite DB via better-sqlite3 (file: `exchange.db`)

- `client/`: React + Vite frontend:
  - User area: wallet, trading, staking, profile, KYC
  - Admin area: users, KYC, withdrawals, logs, etc.

- `docs/`: documentation (production notes, deployment guide, ...)

## 2. Basic setup on a VPS (no Docker)

1. Install Node.js 20.x and git.
2. Clone the repository:
   - `git clone https://github.com/onboarding92/exchange.git`
   - `cd exchange`
3. Install dependencies:
   - `cd server && npm install`
   - `cd ../client && npm install`
4. Create environment files:
   - `cp server/.env.production.example server/.env`
   - `cp client/.env.production.example client/.env`
   - Fill in SMTP credentials, secrets, and API base URL.
5. Run database migrations/seed (current project seeds via `seedIfEmpty()` in `db.ts`).
6. Run backend:
   - `cd server`
   - `npm run dev` (or `npm start` if configured for production)
7. Build and serve frontend:
   - `cd ../client`
   - `npm run build`
   - `npm run preview` (or serve `dist/` behind nginx)

## 3. Docker-based deployment (demo)

1. Ensure Docker and docker-compose are installed.
2. In the repo root:
   - `cp server/.env.production.example server/.env.production`
   - `cp client/.env.production.example client/.env.production`
   - Fill secrets and configuration.
3. Build and start:
   - `docker-compose -f docker-compose.prod.yml build`
   - `docker-compose -f docker-compose.prod.yml up -d`
4. Access:
   - Backend API: `http://<server-ip>:3000`
   - Frontend: `http://<server-ip>:8080`

## 4. IMPORTANT: Not a real-money production setup

To use this as a real exchange in production you still need:

- Hardened security (rate limiting, WAF, audit, monitoring, alerting)
- Real custody / wallets infrastructure
- Real KYC/AML providers and compliance
- Logging, backups, DR, incident response runbooks
- External security audits

This repo is an excellent starting point / MVP, not a finished regulated production system.

