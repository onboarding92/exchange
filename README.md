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
