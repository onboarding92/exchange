# BitChange Exchange

A full-stack demo crypto exchange application built with:

- **Backend**: Node.js, TypeScript, Express, tRPC, SQLite
- **Frontend**: React, Vite, React Query, tRPC React
- **Features**: Wallet, deposits, withdrawals, trading, staking, promo codes, internal transfers, support tickets, admin panel, email notifications.

This project is designed as a learning / demo platform for exchange-style applications.  
It is **not** production-ready and should not be used to custody real user funds.

---

## Features

### User Panel

- Multi-asset wallet (15+ coins seeded)
- Deposit requests with 6 payment gateways (logical level)
- Withdrawal requests with admin approval
- Simple trading interface (market-style orders on pairs like `BTC/USDT`)
- Staking (plans, lock period, APR, claim rewards)
- Promo code redemption (first-deposit / gift / random style)
- Internal transfers (user-to-user by email)
- Transaction history page (deposits, withdrawals, trades, transfers)
- Support ticket system

### Admin Panel

- Dashboard with basic stats (users, deposits, withdrawals, trades)
- Users list (role, KYC status, created date)
- Withdrawals management (approve/reject)
- Coins management (enable/disable, min withdraw, fee)
- Logs viewer (latest system logs)
- Simple profit overview

### Security / Auth

- Email + password with **bcrypt-hashed** passwords
- Demo accounts:
  - User: `demo@bitchange.money` / `demo123`
  - Admin: `admin@bitchange.money` / `admin1234!!`
- Auth session stored in DB and HTTP-only cookie
- All user pages require login
- Admin routes are protected in both frontend and backend (`role === "admin"`)

### Email & Notifications

- Email notifications for:
  - Registration (welcome)
  - Promo code redemption
  - Staking start & rewards claim
  - Support ticket creation
  - Internal transfers (sender + receiver)
  - Withdrawal approval / rejection
- Emails are inserted into an `emailOutbox` table and, if SMTP is configured, sent via Nodemailer.
- In-app toast notifications for main user and admin actions.

---

## Project Structure

```text
.
├─ server/   # Backend (Express + tRPC + SQLite)
│  ├─ src/
│  │  ├─ db.ts           # SQLite schema + seed data
│  │  ├─ trpc.ts         # tRPC setup & context types
│  │  ├─ session.ts      # Session management (cookies + DB)
│  │  ├─ email.ts        # Email queue + SMTP send
│  │  ├─ routers.*.ts    # tRPC routers (auth, wallet, market, promo, staking, admin, etc.)
│  │  └─ index.ts        # Express server entry
│  ├─ package.json
│  └─ tsconfig.json
└─ client/   # Frontend (React + Vite + tRPC React)
   ├─ src/
   │  ├─ trpc.ts         # tRPC React client
   │  ├─ notifications.tsx # Global toast notifications
   │  ├─ App.tsx         # Routing & layout
   │  └─ pages/          # UI pages (Home, Login, Wallet, Trading, Staking, Promo, Support, Transactions, Admin)
   ├─ package.json
   ├─ tsconfig.json
   └─ vite.config.ts
```

---

## How to Run (Development)

### 1. Backend

From the project root:

```bash
cd server
npm install
npm run dev
```

This will:

- Create (or reuse) `exchange.db` SQLite file
- Run DB schema creation + seed data
- Start the API on `http://localhost:4000/trpc`

Environment variables (optional):

- `DB_FILE` – path to the SQLite DB file (default: `exchange.db`)
- `SMTP_HOST` – SMTP server host
- `SMTP_PORT` – SMTP port (e.g. 587 or 465)
- `SMTP_USER` – SMTP username
- `SMTP_PASS` – SMTP password
- `SMTP_FROM` – From address (e.g. `noreply@yourdomain.com`)

If SMTP variables are not set, emails will be queued in `emailOutbox` and logged to the console.

### 2. Frontend

In a **separate terminal**:

```bash
cd client
npm install
npm run dev
```

This will start Vite on `http://localhost:5173` with a dev proxy to the backend at `/trpc`.

---

## How to Run (Production-like)

A simple way to deploy this stack on a VPS / server:

### 1. Build the backend

```bash
cd server
npm install
npm run build
```

This outputs the compiled JS into `server/dist`.

Then run:

```bash
NODE_ENV=production DB_FILE=/path/to/exchange.db SMTP_HOST=... SMTP_PORT=... SMTP_USER=... SMTP_PASS=... SMTP_FROM="BitChange <noreply@yourdomain.com>" node dist/index.js
```

You can use `pm2`, `systemd`, or Docker to keep the process running.

### 2. Build the frontend

```bash
cd client
npm install
npm run build
```

Vite outputs static assets into `client/dist`.

You can:

- Serve `client/dist` via Nginx, Caddy, Apache, or a static host, and
- Configure the frontend to call your deployed backend URL (update Vite proxy or tRPC `url`).

For a very simple single-server setup, you can:

- Serve `client/dist` via Nginx
- Reverse proxy `/trpc` to your Node backend

Example Nginx snippet (pseudo-config):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/bitchange/client/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /trpc {
        proxy_pass http://127.0.0.1:4000/trpc;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Demo Accounts

Once you run the server, the seed function creates:

- **User:**
  - Email: `demo@bitchange.money`
  - Password: `demo123`

- **Admin:**
  - Email: `admin@bitchange.money`
  - Password: `admin1234!!`

Use the admin account to access the `/admin` panel.

---

## TODO – Roadmap to a More Complete Exchange

This project already has a lot of functionality, but there are still many things to improve before it resembles a production-ready exchange.

### 1. Security & Compliance

- [ ] Add **rate limiting** and brute-force protection on login/register.
- [ ] Add **2FA (Two-Factor Authentication)** for login and withdrawals.
- [ ] Implement full **KYC flows** (document upload, verification, audit logs).
- [ ] Add **IP/device history**, suspicious login alerts, and session management.
- [ ] Add comprehensive **input validation** and stricter constraints server-side.
- [ ] Implement proper **logging** and monitoring (with an external log system).

### 2. Wallets & Balances

- [ ] Integrate with **real blockchain wallets / custodians** (on-chain deposits, withdrawals).
- [ ] Add **per-asset settings**: min/max deposit, min/max withdrawal, per-asset fees.
- [ ] Implement **cold / hot wallet management** (for real fund security).
- [ ] Add **fiat on/off-ramp** integrations if needed.

### 3. Trading Engine & Market Data

- [ ] Replace the simple “instant trade” logic with a proper **order book + matching engine**.
- [ ] Implement order types (limit, market, stop orders).
- [ ] Add **candlestick charts** and historical data per pair.
- [ ] Integrate with an external **price feed** (e.g. CoinGecko, Binance API).
- [ ] Create **trade history** views per pair and per user.

### 4. Payments / Deposits

- [ ] Implement real integrations for:
  - MoonPay, Changelly, Banxa, Transak, Mercuryo, CoinGate (currently just stored as strings).
- [ ] Add **webhook endpoints** per provider to:
  - Validate events and signatures.
  - Update deposits from `pending` → `completed`.
  - Credit user wallets accordingly.
- [ ] Add a **deposit status** page with live updates.

### 5. Staking & Promo

- [ ] Extend staking to support:
  - Flexible vs locked staking.
  - Early unstake penalties.
  - Reward tiers.
- [ ] Add admin UI for full **staking plan management**.
- [ ] Enhance promo system:
  - Campaign management.
  - Per-user analytics.
  - One-time vs multi-use codes.
  - Gamified promos (random rewards, spin wheels, etc.).

### 6. Internal Transfers

- [ ] Add configurable **limits and fees** for internal transfers.
- [ ] Add **confirmation modals** and security checks (PIN / 2FA).
- [ ] Provide detailed **transfer history** and export options.

### 7. Admin Panel Improvements

- [ ] Add search, filters, and pagination on all admin tables.
- [ ] Implement **export to CSV** for users, transactions, withdrawals.
- [ ] Add detailed **profit & fee analytics** dashboards.
- [ ] Build a **system health** page (DB status, email sending status, etc.).
- [ ] Allow editing of platform-wide settings (fees, limits, maintenance mode) from the UI.

### 8. UX & UI / Frontend

- [ ] Migrate styling to a consistent design system (e.g. Tailwind + a UI kit).
- [ ] Implement a fully responsive, polished exchange layout similar to real exchanges.
- [ ] Add skeleton loaders, better error states, and detailed tooltips.
- [ ] Improve accessibility (ARIA labels, keyboard navigation).

### 9. Testing & Quality

- [ ] Add unit tests for all routers (auth, wallet, market, promo, staking, admin).
- [ ] Add E2E tests (e.g. with Playwright or Cypress) for main flows:
  - Login, deposit, trade, withdraw, staking, promo.
- [ ] Add load testing for the trading and wallet routes.

--
