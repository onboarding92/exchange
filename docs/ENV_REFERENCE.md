BitChange – Environment Variables Reference (v1)
===============================================

This document summarizes the main environment variables used by BitChange
for a production deployment.

Always use the example files as a base:

- server/.env.production.example
- client/.env.production.example

Then copy them to:

- server/.env.production
- client/.env.production

and edit the values.

------------------------------------------------------------
1. Backend – server/.env.production
------------------------------------------------------------

Typical keys (exact list: see .env.production.example).

[Core]

- NODE_ENV
  - Should be "production" in production.
- APP_PORT
  - Port the backend listens on, e.g. 3001.
- APP_DOMAIN
  - Public URL of the app, e.g. https://exchange.yourdomain.com.
  - Used in emails and links.

[Sessions / Security]

- SESSION_SECRET
  - Required. Strong random string used to sign session tokens / cookies.
  - Must be long and unpredictable.

[SMTP / Email]

Used for:

- login alerts
- device / session notifications
- recovery emails

Common keys (provider-specific):

- SMTP_HOST  – SMTP server hostname (e.g. smtp.mailgun.org)
- SMTP_PORT  – SMTP port (587 or 465)
- SMTP_USER  – SMTP username
- SMTP_PASS  – SMTP password / API key
- SMTP_FROM  – From email (e.g. no-reply@yourdomain.com)

[Optional / Admin]

Depending on configuration you may also have:

- ADMIN_EMAIL            – initial admin email
- ADMIN_DEFAULT_PASSWORD – initial admin password (change it immediately)

Always check server/.env.production.example for the definitive list.

------------------------------------------------------------
2. Frontend – client/.env.production
------------------------------------------------------------

These variables are used by Vite/React at build time.

- VITE_API_URL
  - Public URL for the backend API,
    usually https://exchange.yourdomain.com/api

If you change domain or API path, you must rebuild the frontend.

------------------------------------------------------------
3. Recommended Practices
------------------------------------------------------------

- Never commit .env.production files to git.
- Rotate SMTP credentials and secrets if you suspect a leak.
- Keep separate env files for:
  - local development
  - staging
  - production
- Treat all .env files as secrets (store them in a password manager
  or secret manager).

