# 🚀 BitChange - Professional Cryptocurrency Exchange Platform

A secure, full-featured cryptocurrency exchange platform built with modern web technologies. BitChange provides a complete trading ecosystem with multi-asset wallets, advanced security features, payment gateway integration, and comprehensive administrative controls.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)

---

## 🌟 Overview

BitChange is an enterprise-grade cryptocurrency exchange platform that combines institutional-level security with an intuitive user experience. Built on a modern tech stack with TypeScript throughout, the platform ensures type safety and reliability across all operations.

### Key Highlights

- **Multi-Asset Support** – Trade 15+ major cryptocurrencies including BTC, ETH, USDT, BNB, and more  
- **Enterprise Security** – Two-factor authentication, rate limiting, encrypted sessions, and comprehensive audit logging  
- **Payment Integration** – Fiat on-ramp via external payment gateways  
- **Advanced Trading** – Order system with matching engine and trade logging  
- **Staking Rewards** – Multiple staking plans with compound interest  
- **KYC Compliance** – Built-in identity verification system with document management  
- **Admin Dashboard** – Comprehensive administrative controls and analytics  

---

## ✨ Core Features

### 🔐 Security Architecture

**Two-Factor Authentication (2FA)**  
- TOTP-based authentication using industry-standard protocols  
- Google Authenticator and compatible apps supported  
- Enforced on login and withdrawal operations  
- QR code generation for easy setup  

**Advanced Protection**  
- IP-based rate limiting with configurable thresholds  
- Bcrypt password hashing with salt rounds  
- HTTP-only secure cookies for session management  
- SQLite-backed session storage  
- Comprehensive input validation using Zod schemas  
- Login history tracking with IP and device information  
- Admin-only operations protected via role checks  

---

### 💰 Wallet & Asset Management

**Multi-Currency Wallet**

- Support for 15+ major cryptocurrencies  
- Real-time balance tracking with separation of:
  - `balance`
  - `available`
  - `locked`
- Internal bookkeeping for deposits, withdrawals, and internal transfers  
- Transaction history with filters and search  

**Supported Assets (esempio)**

\`\`\`
Bitcoin (BTC)          Ethereum (ETH)         Tether (USDT)
Binance Coin (BNB)     Cardano (ADA)          Solana (SOL)
Ripple (XRP)           Polkadot (DOT)         Dogecoin (DOGE)
Avalanche (AVAX)       Shiba Inu (SHIB)       Polygon (MATIC)
Litecoin (LTC)         Chainlink (LINK)       Stellar (XLM)
\`\`\`

---

### 📈 Trading Platform

Il modulo Trading fornisce una prima versione di matching engine centralizzato.

**Order Execution**

- Ordini **LIMIT** BUY/SELL  
- Order book basato su tabelle SQLite  
- Matching engine che:
  - blocca i fondi `locked` al placement dell’ordine
  - esegue il matching BUY ↔ SELL
  - registra i trade in tabella `trades`
  - aggiorna in automatico i wallet (balance/locked/available)  

**Trading Features**

- Coppie base/quote (es. BTC/USDT)  
- Storico ordini per utente  
- Storico trade per utente  
- API tRPC per:
  - `placeLimitOrder`
  - `cancelOrder`
  - `orderBook`
  - `myOrders`
  - `myTrades`  

---

### 💳 Deposit & Withdrawal System

**Depositi**

- Depositi simulati (gateway placeholder)  
- Integrazione pensata per provider esterni (es. MoonPay, Transak, ecc.)  
- Segnatura delle transazioni nel DB con stato e reference esterna  

**Prelievi**

- Richiesta prelievo con:
  - controllo saldo `available`
  - spostamento fondi in `locked`
  - 2FA obbligatoria
  - limiti min/max per asset
  - fee per asset
- Workflow di approvazione admin:
  - `pending` → `approved` / `rejected`
  - in caso di `approved`: decremento `balance` e `locked`
- Logging + email di notifica  

---

### 🏆 Staking & Rewards

Modulo di staking con piani configurabili.

**Caratteristiche**

- Staking products / plans con:
  - APR
  - durata (`lockDays`)
  - asset di riferimento
- Posizioni di staking utente con:
  - amount
  - data di apertura
  - stato (`active` / `closed`)
- Calcolo reward con interesse composto giornaliero  
- Cron job giornaliero per:
  - iterare sulle posizioni attive
  - calcolare la reward maturata
  - (in MVP) calcolo teorico testato; estendibile a snapshot reali  

**Esempio piani**

\`\`\`
Flexible Plan   -  5% APR - withdraw anytime
30-Day Lock     -  8% APR
90-Day Lock     - 12% APR
365-Day Lock    - 20% APR
\`\`\`

---

### 🎁 Promotional System

- Gestione codice promo (schema nel DB)  
- Bonus su primo deposito / campagne marketing  
- Log utilizzi per utente e stato (usato / scaduto)  

---

### 📄 KYC Verification

**KYC Layer**

- Upload documenti (ID, passaporto, patente)  
- Stato KYC: `pending`, `approved`, `rejected`  
- Review manuale da parte dell’admin dal pannello /admin  
- Note e motivazioni per il rifiuto  
- Collegato al profilo utente e visibile nella UI di sicurezza  

---

### 🎫 Support System

- Ticket-based support (user ↔ admin)  
- Priorità: Low / Medium / High / Urgent  
- Stato: Open / In Progress / Resolved / Closed  
- Notifiche email e cronologia dei ticket  

---

### 🛡️ Administrative Dashboard

Admin Panel completo accessibile via `/admin`.

**User Management**

- Lista utenti con filtri (email, stato, KYC)  
- Dettaglio utente:
  - saldi wallet
  - login history
  - stato KYC
- Azioni admin:
  - sospensione account (a livello applicativo)
  - reset 2FA (opzionale)
  - reset password / invito  

**Transaction Oversight**

- Lista prelievi:
  - `pending` / `approved` / `rejected`
- Approva / rifiuta prelievi:
  - update saldo `locked` / `balance`
  - log e email  
- View depositi e transazioni interne  

**System Configuration**

- Gestione coin:
  - attivazione/disattivazione asset
  - limiti min/max per depositi/prelievi
  - fee  
- Gestione piani staking  
- Gestione promo codes  

**Logs & Audit**

- Log di sistema (eventi tecnici rilevanti)  
- Security log (login, 2FA, operazioni critiche)  
- Audit delle azioni admin  

---

## 🏗️ Technical Architecture

### Technology Stack

**Frontend**

\`\`\`
React (Vite)       – SPA moderna
TypeScript         – type-safety end-to-end
tRPC React Client  – chiamate RPC tipizzate
TanStack Query     – caching e data fetching
Wouter             – routing client-side
Tailwind CSS       – styling utility-first
\`\`\`

**Backend**

\`\`\`
Node.js + TypeScript
Express             – HTTP server
tRPC                – layer API type-safe
Better-SQLite3      – DB embedded performante
Nodemailer          – invio email
OTPLib              – 2FA TOTP
\`\`\`

**Sicurezza**

\`\`\`
HTTP-only cookies   – sessioni sicure
Rate limiting       – protezione brute-force
Zod                 – validazione input
2FA TOTP            – multi-factor authentication
Audit logging       – tracking azioni critiche
\`\`\`

---

### System Architecture

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                         │
│  React SPA + tRPC Client + TanStack Query              │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    API Layer                            │
│  Express + tRPC Router                                  │
│  - Authentication                                       │
│  - Rate Limiting                                       │
│  - Input Validation                                    │
│  - Session Management                                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Business Logic                         │
│  Routers tRPC:                                          │
│  - auth         - wallet         - trading              │
│  - staking      - promo          - admin                │
│  - support      - transactions   - internal             │
│  - payment (stub/gateways)                              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Data Layer                             │
│  SQLite:                                                │
│  - users, sessions                                      │
│  - wallets, transactions                               │
│  - orders, trades                                      │
│  - stakingProducts, stakingPositions                   │
│  - kyc, tickets, promos, logs                          │
└─────────────────────────────────────────────────────────┘
\`\`\`

---

## 📁 Project Structure

\`\`\`
exchange/
│
├── client/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/                   # Page components
│   │   │   ├── Home.tsx            # Landing page
│   │   │   ├── Login.tsx           # Authentication
│   │   │   ├── Wallet.tsx          # Wallet dashboard
│   │   │   ├── Trading.tsx         # Trading interface
│   │   │   ├── Staking.tsx         # Staking management
│   │   │   ├── Promo.tsx           # Promo redemption
│   │   │   ├── Support.tsx         # Support tickets
│   │   │   ├── Transactions.tsx    # Transaction history
│   │   │   ├── Kyc.tsx             # KYC submission
│   │   │   ├── Security.tsx        # Security settings
│   │   │   ├── LoginHistory.tsx    # Login tracking
│   │   │   ├── Prices.tsx          # Market prices
│   │   │   ├── Admin.tsx           # Admin dashboard
│   │   │   ├── AdminKyc.tsx        # KYC review
│   │   │   └── AdminLogs.tsx       # System logs
│   │   ├── App.tsx                 # Routing
│   │   ├── trpc.ts                 # tRPC client setup
│   │   └── notifications.tsx       # Toast notifications
│   └── package.json
│
├── server/                          # Backend application
│   ├── src/
│   │   ├── routers.auth.ts         # Authentication & sessions
│   │   ├── routers.wallet.ts       # Wallet operations
│   │   ├── routers.trading.ts      # Trading & orders
│   │   ├── routers.staking.ts      # Staking management
│   │   ├── routers.admin.ts        # Admin operations
│   │   ├── routers.promo.ts        # Promo codes
│   │   ├── routers.support.ts      # Support tickets
│   │   ├── routers.transactions.ts # Transaction history
│   │   ├── routers.internal.ts     # Internal transfers
│   │   ├── routers.payment.ts      # Payment gateways (stub/adapters)
│   │   ├── routers.ts              # Main app router
│   │   ├── db.ts                   # Database schema & init
│   │   ├── trading.ts              # Matching engine & schemas
│   │   ├── session.ts              # Session management
│   │   ├── email.ts                # Email service
│   │   ├── twoFactor.ts            # 2FA management
│   │   ├── kyc.ts                  # KYC helpers
│   │   ├── loginEvents.ts          # Login tracking
│   │   └── logger.ts               # Logging utilities
│   └── package.json
│
└── README.md                        # Project documentation
\`\`\`

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.0.0 or higher  
- **npm** 9.0.0 or higher  
- **Git**  

### Installation

**1. Clone the repository**

\`\`ash
git clone https://github.com/onboarding92/exchange.git
cd exchange
\`\`\`

**2. Install dependencies**

\`\`ash
# Server
cd server
npm install

# Client
cd ../client
npm install
\`\`\`

### Environment Configuration

Crea il file `server/.env`:

\`\`\env
DB_FILE=./exchange.db

SESSION_SECRET=your-secure-random-secret-key-min-32-chars

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=BitChange <noreply@bitchange.money>

PORT=4000
CLIENT_URL=http://localhost:5173
\`\`\`

### Avvio in sviluppo

**Backend**

\`\`ash
cd server
npm run dev
\`\`\`

**Frontend**

\`\`ash
cd client
npm run dev
\`\`\`

Apri nel browser:

\`\`	ext
http://localhost:5173
\`\`\`

---

## 👥 Demo Accounts

**User**

\`\`	ext
Email:    demo@bitchange.money
Password: demo123
\`\`\`

**Admin**

\`\`	ext
Email:    admin@bitchange.money
Password: admin123
\`\`\`

---

## 📧 Email Configuration

BitChange usa SMTP per le email.

Per Gmail:

1. Abilita 2-Step Verification  
2. Crea un App Password  
3. Usa la password generata in `SMTP_PASS`  

Sono supportati anche:
- SendGrid  
- Mailgun  
- Amazon SES  
- Postmark  

---

## 🧪 Testing

Esegui i test backend:

\`\`ash
cd server
npm test
\`\`\`

La suite copre:
- autenticazione + login/2FA  
- wallet + locked/available  
- trading (ordini, matching, trades)  
- staking (reward & cron)  
- admin (approvazione withdrawal, login, ecc.)  

---

## 📦 Build & Deployment

**Build produzione**

\`\`ash
cd server
npm run build

cd ../client
npm run build
\`\`\`

Puoi distribuire su:
- VPS (DigitalOcean, AWS, ecc.)  
- PaaS (Railway, Render, Fly.io, ecc.)  
- Container (Docker / Kubernetes)  

---

## 📄 License

Licensed under the **MIT License**.  
Use at your own risk; this project is for educational and demo purposes and **not** audited for production-grade financial use.

