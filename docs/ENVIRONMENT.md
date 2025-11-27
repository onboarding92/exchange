# BitChange Environment Configuration

This document describes the main environment variables used by the **BitChange Exchange** backend
(`server/.env`), and provides a reference for setting up local, staging and production environments.

## 1. Database

- `DB_FILE`  
  Path to the SQLite database file, relative to the `server` directory.  
  **Example:** `./exchange.db`

## 2. Session & Security

- `SESSION_SECRET`  
  Long random string used to sign sessions.  
  - Minimum 32 characters
  - Must be kept secret
  - Use a different value per environment

- `RATE_LIMIT_WINDOW_MS`  
  Time window (in milliseconds) used by rate limiting (login, sensitive endpoints).

- `RATE_LIMIT_MAX_ATTEMPTS`  
  Maximum number of attempts allowed in the given window.

## 3. Demo / Admin Users

- `DEMO_EMAIL`, `DEMO_PASSWORD`  
  Credentials for the demo user used in local development and tests.

- `ADMIN_EMAIL`, `ADMIN_PASSWORD`  
  Credentials for the administrator account.  
  In production, you must:
  - Use a strong, unique password
  - Change the default values
  - Rotate credentials periodically

## 4. SMTP / Email

- `SMTP_HOST`, `SMTP_PORT`  
  SMTP server address and port.

- `SMTP_USER`, `SMTP_PASS`  
  SMTP credentials (for example, a Gmail app password).

- `SMTP_FROM`  
  Default `From:` header used in all transactional emails.

## 5. TOTP / 2FA

- `TOTP_ISSUER`  
  Display name in authenticator apps (e.g. Google Authenticator).

## 6. Payment Provider (MoonPay example)

- `MOONPAY_API_KEY`  
  Public API key for MoonPay.

- `MOONPAY_SECRET_KEY`  
  Secret key used server-side.

- `MOONPAY_WEBHOOK_SECRET`  
  Secret used to validate incoming webhook signatures.

- `MOONPAY_ENV`  
  Environment: `sandbox` or `production`.

## 7. Server & Client URLs

- `PORT`  
  HTTP port used by the backend server (default: `4000`).

- `CLIENT_URL`  
  Frontend origin allowed for CORS (default: `http://localhost:5173`).

## 8. Logging

- `LOG_LEVEL`  
  Logging level (`debug`, `info`, `warn`, `error`).

---

For local development:

1. Copy `.env.example` to `.env` in the `server` directory
2. Adjust the values for your environment
3. Restart the backend server
