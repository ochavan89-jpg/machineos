# Security Runbook

This runbook defines how to monitor and respond to security events in MachineOS.

## Scope

- Authentication failures and lockouts
- Brute-force detection signals
- Admin security signals and acknowledgements
- Rate-limit telemetry anomalies

## Signal Sources

- Audit log action: `security.auth_login_failed`
  - Reasons: `user_not_found`, `password_mismatch`, `user_inactive`, `lockout_active`
- Audit log action: `security.auth_bruteforce_detected`
  - Severity: `HIGH`
- Audit log actions starting with `security.admin_`
  - Admin endpoint query abuse, retry burst, and similar events
- Rate limiter telemetry:
  - `allowed`, `blocked`, `blockedRatePct`, `byRoute`, `activeBuckets`

## Current Guardrails

- Login route rate limiter: 20 requests per minute window (route-level)
- Identifier lockout:
  - `AUTH_LOGIN_MAX_FAILURES` (default: 6)
  - `AUTH_LOGIN_LOCKOUT_MS` (default: 10 minutes)
  - `AUTH_LOGIN_ATTEMPT_WINDOW_MS` (default: 15 minutes)
- Bruteforce signal threshold:
  - `AUTH_BRUTEFORCE_SIGNAL_THRESHOLD` (default: 4 failures)
- Attempt-bucket memory cap:
  - `AUTH_LOGIN_MAX_BUCKETS` (default: 5000)

## Incident Severity

- `LOW`
  - Isolated failed login attempts, no burst pattern
- `MEDIUM`
  - Repeated failures for same identifier or suspicious admin invalid-query pattern
- `HIGH`
  - `security.auth_bruteforce_detected`, retry burst signals, or sustained high blocked-rate

## Response Checklist

### 1) Confirm signal quality

- Open Admin Dashboard `Overview` and inspect:
  - Security Signals panel
  - Recent Failed Logins
  - Top Source IPs
- Validate timestamps and whether events are ongoing.

### 2) Triage blast radius

- Check if one or multiple identifiers are affected.
- Check if attacks are concentrated on one IP or distributed.
- Confirm whether any successful suspicious login happened after repeated failures.

### 3) Containment actions

- Increase lockout strictness temporarily by env:
  - Lower `AUTH_LOGIN_MAX_FAILURES` (example: 4)
  - Increase `AUTH_LOGIN_LOCKOUT_MS` (example: 20 minutes)
- Tighten CORS and trusted frontend origins if suspicious origin traffic appears.
- If needed, block abusive IP at WAF/load balancer/proxy layer.

### 4) Recovery and hardening

- Run phone hygiene checks to avoid false negatives on legit users:
  - `npm run phones:audit`
  - `npm run phones:apply` (after review)
- Verify pending users and rejected users are correctly managed.
- Keep dashboard signals acknowledged with accountable actor ID.

### 5) Post-incident documentation

- Document:
  - Start/end time
  - Affected identifiers/roles
  - Suspected source IPs
  - Temporary controls applied
  - Final preventive changes

## Operational Commands

- Validate env safety:
  - `npm run check:env`
  - `npm run check:env:prod`
- Run backend tests:
  - `npm test`
- Phone quality:
  - `npm run phones:audit`
  - `npm run phones:apply`

## Escalation Guidance

- Escalate immediately to engineering owner if:
  - `HIGH` signals persist for more than 10 minutes
  - Multiple roles are targeted in parallel
  - Any suspicious successful login is confirmed

## Ownership

- Primary: Backend security owner
- Secondary: Admin operations owner
- Review cadence: Weekly during active rollout, then monthly
