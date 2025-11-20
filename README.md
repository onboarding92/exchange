# 🚀 BitChange - Professional Cryptocurrency Exchange Platform

A secure, full-featured cryptocurrency exchange platform built with modern web technologies. BitChange provides a complete trading ecosystem with multi-asset wallets, advanced security features, payment gateway integration, and comprehensive administrative controls.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)

---

## 🌟 Overview

BitChange is an enterprise-grade cryptocurrency exchange platform that combines institutional-level security with an intuitive user experience. Built on a modern tech stack with TypeScript throughout, the platform ensures type safety and reliability across all operations.

### **Key Highlights**

- **Multi-Asset Support** - Trade 15+ major cryptocurrencies including BTC, ETH, USDT, BNB, and more
- **Enterprise Security** - Two-factor authentication, rate limiting, encrypted sessions, and comprehensive audit logging
- **Payment Integration** - Six integrated payment gateways for seamless fiat-to-crypto on-ramp
- **Advanced Trading** - Real-time order execution with complete transaction history
- **Staking Rewards** - Multiple staking plans with competitive APR rates
- **KYC Compliance** - Built-in identity verification system with document management
- **Admin Dashboard** - Comprehensive administrative controls and analytics

---

## ✨ Core Features

### 🔐 **Security Architecture**

**Two-Factor Authentication (2FA)**
- TOTP-based authentication using industry-standard protocols
- Google Authenticator and compatible apps supported
- Enforced on login and withdrawal operations
- QR code generation for easy setup

**Advanced Protection**
- IP-based rate limiting with configurable thresholds
- Bcrypt password hashing with salt rounds
- HTTP-only secure cookies for session management
- Database-backed session storage
- Comprehensive input validation using Zod schemas
- Login history tracking with IP and device information

### 💰 **Wallet & Asset Management**

**Multi-Currency Wallet**
- Support for 15+ major cryptocurrencies
- Real-time balance tracking (available and locked)
- Unique deposit addresses per asset
- Transaction history with filtering and search
- Internal transfers between platform users

**Supported Assets**
```
Bitcoin (BTC)          Ethereum (ETH)         Tether (USDT)
Binance Coin (BNB)     Cardano (ADA)          Solana (SOL)
Ripple (XRP)           Polkadot (DOT)         Dogecoin (DOGE)
Avalanche (AVAX)       Shiba Inu (SHIB)       Polygon (MATIC)
Litecoin (LTC)         Chainlink (LINK)       Stellar (XLM)
```

### 📈 **Trading Platform**

**Order Execution**
- Market orders with instant execution
- Real-time price updates
- Complete order history
- Transaction fee transparency
- Trade confirmation notifications

**Trading Features**
- Multiple trading pairs
- Order book visibility
- Price charts and market data
- Volume tracking
- 24/7 trading availability

### 💳 **Deposit & Withdrawal System**

**Fiat On-Ramp Integration**

Six integrated payment gateways provide multiple options for purchasing cryptocurrency:

| Gateway | Features | Payment Methods |
|---------|----------|-----------------|
| **MoonPay** | Fast processing, global coverage | Credit/Debit Card, Bank Transfer, Apple Pay |
| **Changelly** | Best rates, instant exchange | Crypto-to-crypto swaps |
| **Banxa** | Low fees, high limits | Bank Transfer, Card Payments |
| **Transak** | Web3 native, 150+ countries | Card, Bank Transfer, Mobile Money |
| **Mercuryo** | Custodial wallet, easy KYC | Card Payments, Apple Pay |
| **CoinGate** | Merchant-focused, invoicing | Multiple cryptocurrencies |

**Withdrawal Management**
- Admin-approved withdrawal requests
- 2FA enforcement for security
- Configurable withdrawal limits
- Fee transparency
- Email confirmation system
- Transaction tracking

### 🏆 **Staking & Rewards**

**Flexible Staking Options**
- Multiple staking plans with varying APR rates
- Flexible staking (withdraw anytime)
- Locked staking (higher rewards)
- Automatic daily reward calculations
- Compound interest support
- Complete staking history

**Example Staking Plans**
```
Flexible Plan    - 5% APR   - Withdraw anytime
30-Day Lock      - 8% APR   - 30-day commitment
90-Day Lock      - 12% APR  - 90-day commitment
365-Day Lock     - 20% APR  - 1-year commitment
```

### 🎁 **Promotional System**

**Promo Code Management**
- First deposit bonuses
- Gift code redemption
- Random reward campaigns
- Usage tracking and analytics
- Expiry date management
- One-time and multi-use codes

### 📄 **KYC Verification**

**Identity Verification System**
- Document upload (Passport, ID Card, Driver's License)
- Front and back image capture
- Admin review workflow
- Approval/rejection with feedback
- Verification status tracking
- Compliance reporting

### 🎫 **Support System**

**Customer Support**
- Ticket-based support system
- Priority levels (Low, Medium, High, Urgent)
- Status tracking (Open, In Progress, Resolved, Closed)
- Email notifications on updates
- Support history and archives

### 🛡️ **Administrative Dashboard**

**Platform Management**

**User Management**
- Complete user database with search and filters
- Account status control (Active, Suspended, Deleted)
- User activity monitoring
- Balance overview and adjustments
- KYC status verification

**Transaction Oversight**
- Withdrawal approval workflow
- Deposit monitoring
- Transaction history and analytics
- Fraud detection alerts
- Manual transaction processing

**System Configuration**
- Coin management (enable/disable assets)
- Fee structure configuration
- Withdrawal limits and thresholds
- Payment gateway settings
- System-wide announcements

**Analytics & Reporting**
- Platform statistics dashboard
- User growth metrics
- Trading volume analysis
- Revenue tracking
- Deposit/withdrawal trends

**Audit & Compliance**
- Comprehensive system logs
- Admin action tracking
- Security event monitoring
- Compliance reporting
- Export capabilities

---

## 🏗️ Technical Architecture

### **Technology Stack**

**Frontend**
```
React 19              - Modern UI framework with concurrent features
TypeScript 5.6        - Type-safe development
tRPC 11              - End-to-end typesafe APIs
TanStack Query       - Powerful data synchronization
Wouter               - Lightweight routing
Tailwind CSS         - Utility-first styling
```

**Backend**
```
Node.js 18+          - JavaScript runtime
Express 4            - Web application framework
tRPC 11              - API layer with full type safety
Better-SQLite3       - Fast, embedded database
Bcrypt               - Password hashing
Nodemailer           - Email delivery
OTPLib               - TOTP 2FA implementation
```

**Security**
```
HTTP-only Cookies    - Secure session management
CORS Protection      - Cross-origin security
Rate Limiting        - DDoS and brute force protection
Input Validation     - Zod schema validation
2FA Enforcement      - Multi-factor authentication
Audit Logging        - Complete activity tracking
```

### **System Architecture**

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                         │
│  React SPA with tRPC Client + TanStack Query           │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    API Layer                            │
│  tRPC Router + Express Middleware                       │
│  - Authentication                                       │
│  - Rate Limiting                                        │
│  - Input Validation                                     │
│  - Session Management                                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Business Logic                         │
│  9 Specialized Routers:                                 │
│  - Auth Router        - Wallet Router                   │
│  - Market Router      - Promo Router                    │
│  - Staking Router     - Admin Router                    │
│  - Support Router     - Transaction Router              │
│  - Internal Router    - Payment Router                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Data Layer                             │
│  SQLite Database with 15+ Tables                        │
│  - Users & Sessions   - Wallets & Transactions          │
│  - Orders & Trades    - Staking & Rewards               │
│  - KYC & Documents    - Support Tickets                 │
│  - Promo Codes        - Audit Logs                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              External Services                          │
│  - Payment Gateways   - Email Service (SMTP)            │
│  - Price Feeds        - Blockchain Networks             │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
bitchange-exchange/
│
├── client/                          # Frontend application
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
│   │   ├── App.tsx                 # Application routing
│   │   ├── trpc.ts                 # tRPC client setup
│   │   └── notifications.tsx       # Toast notifications
│   └── package.json
│
├── server/                          # Backend application
│   ├── src/
│   │   ├── routers.auth.ts         # Authentication & sessions
│   │   ├── routers.wallet.ts       # Wallet operations
│   │   ├── routers.market.ts       # Trading & orders
│   │   ├── routers.promo.ts        # Promo codes
│   │   ├── routers.staking.ts      # Staking management
│   │   ├── routers.admin.ts        # Admin operations
│   │   ├── routers.support.ts      # Support tickets
│   │   ├── routers.transactions.ts # Transaction history
│   │   ├── routers.internal.ts     # Internal transfers
│   │   ├── routers.payment.ts      # Payment gateways
│   │   ├── routers.ts              # Main router
│   │   ├── db.ts                   # Database schema
│   │   ├── session.ts              # Session management
│   │   ├── email.ts                # Email service
│   │   ├── logger.ts               # Logging system
│   │   ├── twoFactor.ts            # 2FA management
│   │   ├── kyc.ts                  # KYC processing
│   │   ├── loginEvents.ts          # Login tracking
│   │   ├── marketPrices.ts         # Price updates
│   │   ├── depositsSchema.ts       # Deposit validation
│   │   └── paymentGateways/        # Payment integrations
│   │       ├── moonpay.ts          # MoonPay adapter
│   │       ├── types.ts            # Gateway interfaces
│   │       └── index.ts            # Gateway registry
│   └── package.json
│
├── docs/                            # Documentation
│   ├── API.md                      # API documentation
│   ├── DEPLOYMENT.md               # Deployment guide
│   └── SECURITY.md                 # Security practices
│
└── README.md                        # This file
```

---

## 🚀 Getting Started

### **Prerequisites**

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Git** for version control

### **Installation**

**1. Clone the repository**
```bash
git clone https://github.com/onboarding92/exchange.git
cd exchange
```

**2. Install dependencies**
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

**3. Configure environment variables**

Create `server/.env` with the following configuration:

```env
# Database Configuration
DB_FILE=./exchange.db

# Session Security
SESSION_SECRET=your-secure-random-secret-key-min-32-chars

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=BitChange <noreply@bitchange.com>

# Payment Gateway Configuration (Optional)
MOONPAY_API_KEY=pk_test_your_key
MOONPAY_SECRET_KEY=sk_test_your_secret
MOONPAY_WEBHOOK_SECRET=whsec_your_webhook_secret
MOONPAY_ENV=sandbox

# Server Configuration
PORT=4000
CLIENT_URL=http://localhost:5173
```

**4. Start the application**

```bash
# Terminal 1 - Start backend server
cd server
npm run dev

# Terminal 2 - Start frontend client
cd client
npm run dev
```

**5. Access the platform**

Open your browser and navigate to:
```
http://localhost:5173
```

---

## 👥 Demo Accounts

The platform includes pre-configured demo accounts for testing:

### **User Account**
```
Email:    demo@bitchange.money
Password: demo123
```
**Features:** Full access to wallet, trading, staking, deposits, and withdrawals

### **Administrator Account**
```
Email:    admin@bitchange.money
Password: admin123
```
**Features:** Complete administrative access including user management, transaction approval, KYC review, and system configuration

---

## 📧 Email Configuration

BitChange uses SMTP for email delivery. Configure your email service in the `.env` file.

### **Gmail Configuration**

1. Enable 2-Step Verification in your Google Account
2. Generate an App Password at: https://myaccount.google.com/apppasswords
3. Use the generated 16-character password in `SMTP_PASS`

### **Other SMTP Providers**

The platform supports any SMTP-compatible email service:
- **SendGrid** - High deliverability, analytics
- **Mailgun** - Developer-friendly API
- **Amazon SES** - Cost-effective, scalable
- **Postmark** - Transactional email specialist

---

## 🔧 Configuration

### **Cryptocurrency Support**

Add or modify supported cryptocurrencies in `server/src/db.ts`:

```typescript
const coins = [
  { symbol: 'BTC', name: 'Bitcoin', network: 'Bitcoin', enabled: 1 },
  { symbol: 'ETH', name: 'Ethereum', network: 'Ethereum', enabled: 1 },
  // Add more coins...
];
```

### **Trading Fees**

Configure trading fees in the admin panel or directly in the database:

```sql
UPDATE coins SET tradingFee = 0.001 WHERE symbol = 'BTC';  -- 0.1% fee
```

### **Withdrawal Limits**

Set withdrawal limits per cryptocurrency:

```sql
UPDATE coins 
SET minWithdrawal = 0.001, maxWithdrawal = 10.0 
WHERE symbol = 'BTC';
```

### **Staking Plans**

Create custom staking plans in `server/src/db.ts`:

```typescript
const stakingPlans = [
  {
    name: 'Flexible',
    asset: 'ETH',
    apr: 5.0,
    lockDays: 0,
    minAmount: 0.1,
    enabled: 1
  },
  // Add more plans...
];
```

---

## 🔒 Security Best Practices

### **Production Deployment**

Before deploying to production, ensure:

1. **Environment Variables**
   - Use strong, randomly generated secrets
   - Never commit `.env` files to version control
   - Rotate secrets regularly

2. **Database Security**
   - Enable database encryption
   - Regular backups with off-site storage
   - Implement access controls

3. **HTTPS/SSL**
   - Use SSL certificates (Let's Encrypt recommended)
   - Enforce HTTPS for all connections
   - Enable HSTS headers

4. **Rate Limiting**
   - Configure appropriate rate limits
   - Implement IP-based throttling
   - Monitor for abuse patterns

5. **Session Management**
   - Set appropriate session timeouts
   - Implement session rotation
   - Clear sessions on logout

6. **Monitoring**
   - Set up error tracking (Sentry, Rollbar)
   - Implement uptime monitoring
   - Configure security alerts

---

## 📊 Performance

### **Optimization Features**

- **Database Indexing** - Optimized queries with proper indexes
- **Connection Pooling** - Efficient database connection management
- **Query Caching** - TanStack Query caching on frontend
- **Lazy Loading** - Code splitting for faster initial load
- **Asset Optimization** - Minified and compressed assets

### **Scalability**

The platform is designed to scale horizontally:

- **Stateless API** - Easy to add more server instances
- **Database Replication** - Support for read replicas
- **Load Balancing** - Compatible with standard load balancers
- **Caching Layer** - Ready for Redis integration

---

## 🧪 Testing

### **Run Tests**

```bash
cd server
npm test
```

### **Test Coverage**

The platform includes comprehensive test coverage for:
- Authentication flows
- Wallet operations
- Trading logic
- Admin functions
- Security features

---

## 📚 API Documentation

### **tRPC Endpoints**

The platform exposes the following tRPC routers:

```typescript
auth         // Authentication & sessions
wallet       // Wallet operations
market       // Trading & orders
promo        // Promo code redemption
staking      // Staking management
admin        // Administrative functions
support      // Support tickets
transactions // Transaction history
internal     // Internal transfers
payment      // Payment gateway integration
```

### **Type Safety**

All API calls are fully type-safe thanks to tRPC:

```typescript
// Frontend usage - fully typed!
const { data: balance } = trpc.wallet.getBalance.useQuery();
const deposit = trpc.wallet.deposit.useMutation();
```

---

## 🚢 Deployment

### **Production Build**

```bash
# Build server
cd server
npm run build

# Build client
cd ../client
npm run build
```

### **Deployment Options**

**VPS Deployment**
- DigitalOcean Droplets
- AWS EC2
- Linode
- Vultr

**Platform as a Service**
- Heroku
- Railway
- Render
- Fly.io

**Containerized Deployment**
- Docker
- Kubernetes
- Docker Compose

---

## 🤝 Support

### **Documentation**

Comprehensive documentation is available in the `docs/` directory:
- API Reference
- Deployment Guide
- Security Best Practices
- User Manual
- Admin Guide

### **Community**

- **GitHub Issues** - Bug reports and feature requests
- **Discussions** - Community support and questions
- **Email** - support@bitchange.com

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with industry-leading open-source technologies:

- **tRPC** - Type-safe API framework
- **React** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling framework
- **Better-SQLite3** - Database engine
- **OTPLib** - 2FA implementation
- **Nodemailer** - Email delivery

---

## ⚠️ Legal Disclaimer

This software is provided for educational and demonstration purposes. Operating a cryptocurrency exchange requires:

- Compliance with local financial regulations
- Proper licensing and registration
- KYC/AML procedures
- Security audits and insurance
- Legal counsel

**The authors and contributors are not responsible for any misuse of this software or any financial losses incurred.**

---

## 🌟 Features at a Glance

| Feature | Status | Description |
|---------|--------|-------------|
| Multi-Asset Wallet | ✅ | 15+ cryptocurrencies supported |
| Two-Factor Auth | ✅ | TOTP-based 2FA with Google Authenticator |
| Trading Platform | ✅ | Market orders with instant execution |
| Staking System | ✅ | Multiple plans with competitive APR |
| Payment Gateways | ✅ | 6 integrated fiat on-ramp providers |
| KYC Verification | ✅ | Document upload and admin review |
| Admin Dashboard | ✅ | Complete platform management |
| Support System | ✅ | Ticket-based customer support |
| Email Notifications | ✅ | SMTP-based email delivery |
| Audit Logging | ✅ | Comprehensive activity tracking |
| Rate Limiting | ✅ | DDoS and brute force protection |
| Session Management | ✅ | Secure HTTP-only cookies |

---

**Built with ❤️ by the BitChange Team**

*Professional cryptocurrency exchange platform for the modern web*
