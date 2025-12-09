
BitChange – Risk Limits & Policies (v1)
This document defines operational safety guidelines for BitChange.

## 1. Capital Exposure Limits
Maximum exposure recommended for early stage: €250k–€500k.

Per-user withdrawal soft limits.

Manual approval for withdrawals > €5,000.

## 2. Withdrawal Rules
Small withdrawals: automated.

Medium withdrawals: risk checks.

Large withdrawals: require admin approval.

Emergency switch: pause all withdrawals.

## 3. Authentication & Security
Enforce strong passwords.

2FA recommended.

Rotation of admin credentials.

Login alerts enabled.

## 4. Monitoring
Monitor:

/health

DB size

server CPU/RAM

withdrawal queue

error rate (5xx)

Alerts:

downtime

high failed login attempts

disk > 80%

## 5. Incident Response
Pause withdrawals.

Backup SQLite DB.

Export logs.

Identify affected accounts.

Notify users when necessary.

