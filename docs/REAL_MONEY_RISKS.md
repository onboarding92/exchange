# Bitchange Exchange – Using with real money (IMPORTANT WARNING)

This project was originally built as a DEMO / EDUCATIONAL crypto exchange.

It includes:
- Auth + sessions
- Admin panel
- Wallet balances on a SQL database
- Trading engine (internal orderbook)
- Staking module
- Withdrawals module
- Basic KYC tables and flows (no external provider)

## 1. What this IS

- A centralised ledger for user balances.
- An admin UI to credit/debit, approve withdrawals, manage users.
- A good base for a proof-of-concept exchange.

## 2. What this is NOT

- It is NOT an audited banking-grade system.
- It is NOT a licensed or regulated exchange product.
- It is NOT a custody solution for large amounts of funds.
- It is NOT a full security-hardened system.

## 3. If you still use it with real money

You are fully responsible for:

- Securing the VPS / infrastructure (firewall, SSH, OS hardening).
- Securing admin access (strong passwords, 2FA, IP restrictions).
- Backups and disaster recovery.
- Monitoring logs and suspicious activity.
- Legal and regulatory compliance in your jurisdiction.

Recommended precautions:

1. Start with VERY small amounts.
2. Keep the main hot wallet OUTSIDE the app:
   - The app tracks balances in the DB.
   - The real crypto movements are executed manually by an operator using a separate wallet.
3. Take frequent backups of the `exchange.db` file.
4. Restrict access to the admin panel with IP whitelisting and HTTPS.

## 4. Production TODO (high level)

- Replace SQLite with Postgres/MySQL on a managed service.
- Add proper logging, monitoring and alerting.
- Add rate limiting and basic WAF.
- Perform an external security audit.
- Implement safe password policies and possibly 2FA.

Using this software with real money is entirely at your own risk.
