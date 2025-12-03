# BitChange – Production Hardening Checklist (v1)

This checklist summarizes important items to verify before using BitChange
with real funds.

This is NOT a replacement for a professional security audit.

--------------------------------------------------
1. Application sanity
--------------------------------------------------

- Backend tests pass locally (cd server && npm test)
- Frontend production build works (cd client && npm run build)
- Basic flows manually tested:
  - registration and login
  - password reset
  - deposits (where supported)
  - withdrawals
  - trading (place and cancel order)
  - KYC flows (if used)
- Demo credentials in production:
  - passwords changed
  - roles and permissions reviewed

--------------------------------------------------
2. Secrets and configuration
--------------------------------------------------

- SESSION_SECRET is long and random
- SMTP password is strong and unique
- Any API keys are not in git and only stored in env files
- Permissions on .env.production:
  - owned by the app user
  - not world readable

--------------------------------------------------
3. Networking and TLS
--------------------------------------------------

- Reverse proxy terminates HTTPS
- HTTP redirects to HTTPS
- Security headers configured (via Nginx and Helmet in Node)
- Optionally, admin panel restricted by IP or VPN

--------------------------------------------------
4. Database and backups
--------------------------------------------------

- SQLite file exchange.db is on fast SSD
- File permissions are reasonable (not world readable or writable)
- Backup script server/scripts/backup_db.sh configured
- Off-site storage for DB backups (object storage, S3, B2, etc.)
- Periodic restore test:
  - restore a backup to staging
  - run tests or manual checks

--------------------------------------------------
5. Logging and monitoring
--------------------------------------------------

- Application logs stored and rotated
- Reverse proxy logs available (access and error)
- Basic alerts:
  - disk almost full
  - process restarts or crashes
- Regular review of:
  - login logs
  - withdrawals logs
  - device and session logs

--------------------------------------------------
6. Operations
--------------------------------------------------

- Written procedure to:
  - deploy a new version
  - restart services
  - rotate secrets
  - freeze withdrawals in an emergency
- Staging or test environment exists (even minimal)
- Changes are tracked via git (no manual changes only on server)

--------------------------------------------------
7. Future improvements
--------------------------------------------------

- Migration from SQLite to PostgreSQL as volume grows
- Stronger rate limiting and WAF
- External security audit and penetration testing

