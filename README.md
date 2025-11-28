# 🚀 BitChange – Professional Cryptocurrency Exchange Platform

BitChange is a secure, full‑featured cryptocurrency exchange platform built with a modern, full‑stack TypeScript architecture.  
It provides a complete trading ecosystem with:

- Multi‑asset wallets
- A database‑backed trading engine
- Staking with compound rewards
- KYC & compliance flows
- 2FA security
- Admin control panel
- Support ticket system
- (Pluggable) payment gateway integrations

---

## 🌟 Overview

BitChange is designed as an **enterprise‑grade exchange** with:

- Strong security guarantees
- Clean, modular architecture
- Type‑safe APIs end‑to‑end (via tRPC)
- A React single‑page application (SPA) frontend
- A SQLite‑backed backend (PostgreSQL ready for production)

The goal is to have an exchange‑like platform that is both **technically robust** and **easy to understand**, ideal for:
- Educational purposes
- Hackathons & demos
- Prototyping an exchange MVP

---

## 📌 Release History (Conceptual)

> These versions describe the evolution of the architecture and feature set.

| Version | Highlights |
|--------|------------|
| **v2.0** | Full trading engine (matching engine + trades table), locked/available wallet model, admin withdrawal approvals, extended Vitest test suites. |
| **v1.1** | Added database‑backed matching engine, more robust auth & wallet tests, refined staking cron job. |
| **v1.0** | Initial public release with core modules: wallets, staking, KYC, promo, support, and admin panel. |

---

## ✨ Core Features

### 🔐 Security Architecture

**Two‑Factor Authentication (2FA)**  
- TOTP‑based (Google Authenticator and compatible apps)  
- Enforced on:
  - Login
  - Withdrawal requests  
- QR code generation for onboarding  
- Recovery/reset flows handled via admin / support

**Additional Protections**  
- IP‑based rate limiting (protects login and sensitive APIs)  
- Secure password hashing with **bcrypt**  
- HTTP‑only cookies for session management  
- Server‑side session storage in SQLite  
- Comprehensive input validation with **Zod**  
- Login history stored with IP, user‑agent, and timestamps  
- Admin routes protected via role checks

**Audit & Logging**  
- Security events (login, 2FA, password reset, withdrawals)  
- Admin actions (KYC decisions, withdrawal approvals, configuration changes)  
- System logs for operational visibility

---

### 💰 Wallet & Asset Management

**Multi‑Currency Wallet**  
- Support for 15+ major cryptocurrencies  
- Real‑time balances split into:
  - `balance` – total funds
  - `locked` – reserved (orders, pending withdrawals, staking)
  - `available` – free to spend / trade / withdraw

**Internal Book‑Keeping**  
- Deposit records  
- Withdrawal records  
- Internal transfers between users  
- Trade settlement into wallets  
- Staking rewards credited to wallets

**Example Supported Assets**

```text
Bitcoin (BTC)          Ethereum (ETH)         Tether (USDT)
Binance Coin (BNB)     Cardano (ADA)          Solana (SOL)
Ripple (XRP)           Polkadot (DOT)         Dogecoin (DOGE)
Avalanche (AVAX)       Shiba Inu (SHIB)       Polygon (MATIC)
Litecoin (LTC)         Chainlink (LINK)       Stellar (XLM)
```

A full transaction history is available in the UI and via the `transactions` router, with filters and pagination.

---

### 📈 Trading Engine

BitChange includes a **centralized matching engine** built entirely on SQLite (easily portable to PostgreSQL).

**Order Model**  
- Limit orders (BUY/SELL)  
- Status:
  - `open`
  - `partially_filled`
  - `filled`
  - `cancelled`
- Fields:
  - baseAsset / quoteAsset (e.g. BTC/USDT)
  - price
  - amount
  - filledAmount
  - userId
  - timestamps

**Matching Logic**  
- When a BUY order is placed:
  - Funds in the **quote asset** are moved from `available` → `locked`
- When a SELL order is placed:
  - Funds in the **base asset** are moved from `available` → `locked`
- Matching engine:
  - Scans opposite side orders (BUY vs SELL) at compatible prices
  - Executes trades in price/time priority
  - Inserts rows into `trades` table
  - Updates:
    - order `filledAmount` & `status`
    - wallets for buyer & seller
    - `locked` and `available` balances

**Order Book & History**  
- `orderBook` endpoint returns bids/asks per pair  
- `myOrders` shows open & historical orders per user  
- `myTrades` shows executed trades per user  

The matching logic and wallet settlement are covered by **unit + integration tests** using real SQLite databases in memory.

---

### 💳 Deposits & Withdrawals

#### Deposits

The platform is designed to plug into real on‑ramp providers. The architecture currently includes:

- A real integration example for **MoonPay** (client + server‑side adapter)
- Additional gateway stubs for:
  - Transak
  - Banxa
  - Mercuryo
  - CoinGate
  - Changelly

The flows are designed for:

1. User creates a deposit request (amount, asset, provider).
2. User is redirected to provider (or opens widget).
3. Provider sends a webhook callback to the backend.
4. Backend verifies and credits the user wallet.

> For local/demo usage, deposits can be simulated through admin / internal routes.

#### Withdrawals

- User submits a withdrawal request with:
  - asset
  - destination address
  - amount
- Backend checks:
  - `available` balance
  - per‑asset min/max limits
  - fee configuration
  - 2FA validity
- If valid:
  - funds moved from `available` → `locked`
  - withdrawal record created in `pending` state
- Admin workflow:
  - Admin sees pending withdrawals in the dashboard
  - Approves or rejects
  - On approval:
    - `locked` and `balance` are reduced
    - status set to `approved`
    - email notification sent
  - On rejection:
    - funds returned to `available`
    - status set to `rejected`

---

### 🏆 Staking & Rewards

BitChange supports on‑platform staking products.

**Staking Plans**  
- Flexible plans (no lock)
- Locked plans (e.g. 30 / 90 / 365 days)
- Parameters per plan:
  - APR
  - lockDays
  - asset
  - minimum amount
  - enabled flag

**Staking Positions**  
- Users open staking positions by locking a certain amount of an asset.  
- For locked plans, withdrawal is restricted until maturity.  
- Rewards are computed with **daily compound interest** using a well‑tested reward calculation function.

**Cron Job**  
A cron job runs daily and:

- Iterates over active staking positions
- Computes the theoretical accrued reward
- (Architecture ready to extend to “snapshot + credit” logic)

---

### 🎁 Promo System

- Promo codes stored in the database with:
  - code
  - description
  - bonus type/value
  - expiry date
  - usage limits
- Can be applied on first deposit or generic deposit events
- Admin can create, disable, and monitor promo usage

---

### 📄 KYC Verification

- Users upload:
  - ID card
  - Passport
  - Driver’s license (front/back)
- Admin KYC module:
  - View submitted documents
  - Set status: `pending` → `approved` / `rejected`
  - Provide rejection reason/notes
- KYC status is visible both to admin and to the user in the “Security / KYC” section.

---

### 🎫 Support Ticket System

- Users can open support tickets with:
  - title
  - description
  - priority (Low / Medium / High / Urgent)
- Tickets have statuses:
  - Open
  - In Progress
  - Resolved
  - Closed
- Admin can reply, re‑assign, and close tickets.
- Email notifications can be sent on updates.

---

### 🛡️ Admin Dashboard

The admin panel (accessible via `/admin` in the SPA) aggregates operational tools.

**User Management**  
- Search & filter users  
- View balances, KYC status, login history  
- Suspend / reactivate users  
- (Optionally) reset 2FA

**Financial Control**  
- Approve/reject withdrawals  
- View and audit deposits  
- Inspect trades and internal movements  
- Adjust coins configuration (fees, limits, enabling/disabling assets)

**System Configuration**  
- Manage staking plans  
- Manage promo codes  
- Review system and security logs  
- Global announcements (if plugged into UI)

**Analytics & Reporting** (lightweight MVP)  
- Basic statistics on:
  - user counts
  - volume
  - deposits / withdrawals

---

## 🏗 Technical Architecture

### Technology Stack

**Frontend**

```text
React (Vite)       – modern SPA
TypeScript         – type‑safety
tRPC React Client  – typed RPC calls
TanStack Query     – server state management
Wouter             – lightweight routing
Tailwind CSS       – utility‑first styling
```

**Backend**

```text
Node.js + TypeScript
Express             – HTTP server
tRPC                – type‑safe API layer
Better‑SQLite3      – fast embedded database (SQLite)
Nodemailer          – SMTP email sending
OTPLib              – TOTP 2FA generation/verification
Vitest              – test runner
```

**Security**

```text
HTTP‑only cookies   – secure sessions
Rate limiting       – brute‑force protection
Zod                 – input validation
2FA TOTP            – multi‑factor auth
Audit logging       – critical action tracking
```

---

### System Architecture Diagram

```text
┌─────────────────────────────────────────────────────────┐
│                     Client (SPA)                        │
│  React + tRPC + TanStack Query                         │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      API Layer                          │
│  Express + tRPC Router                                  │
│  - Auth, sessions, rate limiting, 2FA                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Business Logic Layer                   │
│  tRPC routers:                                          │
│  - auth, wallet, trading, staking, promo                │
│  - admin, support, transactions, internal, payment      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      Data Layer                         │
│  SQLite (dev) / PostgreSQL (prod ready)                │
│  - users, sessions                                      │
│  - wallets, transactions, internalTransfers             │
│  - orders, trades                                       │
│  - stakingProducts, stakingPositions                    │
│  - kycDocuments, kycStatus                              │
│  - supportTickets, promos, logs                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 External Integrations                   │
│  - Payment gateways (MoonPay, others)                   │
│  - SMTP email providers                                 │
│  - (Optional) price feeds / blockchain nodes            │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```text
exchange/
│
├── client/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/                   # Main pages
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Wallet.tsx
│   │   │   ├── Trading.tsx
│   │   │   ├── Staking.tsx
│   │   │   ├── Promo.tsx
│   │   │   ├── Support.tsx
│   │   │   ├── Transactions.tsx
│   │   │   ├── Kyc.tsx
│   │   │   ├── Security.tsx
│   │   │   ├── LoginHistory.tsx
│   │   │   ├── Prices.tsx
│   │   │   ├── Admin.tsx
│   │   │   ├── AdminKyc.tsx
│   │   │   └── AdminLogs.tsx
│   │   ├── App.tsx                 # Routing
│   │   ├── trpc.ts                 # tRPC client
│   │   └── notifications.tsx       # Toast notifications
│   └── package.json
│
├── server/                          # Backend (Node + tRPC)
│   ├── src/
│   │   ├── routers.auth.ts         # Authentication & sessions
│   │   ├── routers.wallet.ts       # Wallet operations
│   │   ├── routers.trading.ts      # Trading & order book
│   │   ├── routers.staking.ts      # Staking products & positions
│   │   ├── routers.promo.ts        # Promo codes
│   │   ├── routers.admin.ts        # Admin operations
│   │   ├── routers.support.ts      # Support tickets
│   │   ├── routers.transactions.ts # Transaction history
│   │   ├── routers.internal.ts     # Internal transfers
│   │   ├── routers.payment.ts      # Payment gateways (MoonPay, stubs)
│   │   ├── routers.ts              # Root app router
│   │   ├── db.ts                   # Database init & schema
│   │   ├── trading.ts              # Matching engine logic
│   │   ├── session.ts              # Session handling
│   │   ├── email.ts                # Email utility
│   │   ├── twoFactor.ts            # 2FA helpers
│   │   ├── kyc.ts                  # KYC helpers
│   │   ├── loginEvents.ts          # Login history logging
│   │   ├── stakingCron.ts          # Staking cron job
│   │   └── logger.ts               # Logging utilities
│   └── package.json
│
└── README.md                        # This documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18  
- **npm** ≥ 9  
- **Git**

### 1️⃣ Clone the repository

```bash
git clone https://github.com/onboarding92/exchange.git
cd exchange
```

### 2️⃣ Install backend

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env` with your settings (database path, SMTP, secrets).

### 3️⃣ Install frontend

```bash
cd ../client
npm install
```

### 4️⃣ Run in development

**Backend**

```bash
cd server
npm run dev
```

**Frontend**

```bash
cd client
npm run dev
```

Open:

```text
http://localhost:5173
```

---

## ⚙ Environment Variables (server/.env)

```env
DB_FILE=./exchange.db

SESSION_SECRET=your-super-secure-random-secret-min-32-chars

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM="BitChange <noreply@bitchange.money>"

# Server
PORT=4000
CLIENT_URL=http://localhost:5173
```

> In production, you can switch from SQLite to PostgreSQL by adapting `db.ts` and the connection string.

---

## 👥 Demo Accounts

For local development/demo, the following demo accounts are available:

**User**

```text
Email:    demo@bitchange.money
Password: demo123
```

**Admin**

```text
Email:    admin@bitchange.money
Password: admin123
```

---

## 🧪 Testing

Run backend tests:

```bash
cd server
npm test
```

The test suite covers:
- Authentication & login flows
- 2FA enforcement
- Wallet operations (balance / locked / available)
- Withdrawal request & admin approval
- Trading engine (matching, trading, wallet settlement)
- Staking reward calculations
- Admin operations and error states

---

## 📦 Build & Deployment

### Build

```bash
# Server
cd server
npm run build

# Client
cd ../client
npm run build
```

### Deployment Options

You can deploy BitChange using:

- **VPS** (DigitalOcean, AWS EC2, etc.)  
- **PaaS** (Railway, Render, Fly.io, etc.)  
- **Containers** (Docker / Docker Compose / Kubernetes)

For production:
- Use PostgreSQL or a managed SQL database
- Enable HTTPS and secure cookies in your reverse proxy (Nginx / Caddy)
- Configure monitoring and centralized logging

---

## 📄 License

This project is licensed under the **MIT License**.  
