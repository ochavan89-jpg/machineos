# Security Incident Template

Use this template for every security-related incident in MachineOS.

## Incident Metadata

- Incident ID:
- Date:
- Reporter:
- Incident Commander:
- Severity: `LOW` | `MEDIUM` | `HIGH`
- Status: `Open` | `Monitoring` | `Contained` | `Resolved` | `Postmortem Complete`

## Detection Summary

- Detection source:
  - `security.auth_login_failed`
  - `security.auth_bruteforce_detected`
  - `security.admin_*`
  - Rate limiter telemetry
  - Other:
- First detected at:
- Last observed at:
- Current state: ongoing / stopped

## Signal Snapshot

- Affected role(s):
- Affected identifier(s):
- Top source IPs:
- Failed attempts count:
- Lockout events count:
- Bruteforce signals count:
- Blocked rate (%):

## Impact Assessment

- Was unauthorized access confirmed? `Yes/No`
- Was data exposure confirmed? `Yes/No`
- Services affected:
- User impact summary:
- Estimated business impact:

## Timeline (UTC + IST if needed)

| Time | Event | Owner |
|---|---|---|
|  | Detection |  |
|  | Triage started |  |
|  | Containment applied |  |
|  | Recovery completed |  |
|  | Monitoring completed |  |

## Containment Actions

- [ ] Increased lockout strictness (`AUTH_LOGIN_MAX_FAILURES`)
- [ ] Increased lockout duration (`AUTH_LOGIN_LOCKOUT_MS`)
- [ ] Adjusted attempt window (`AUTH_LOGIN_ATTEMPT_WINDOW_MS`)
- [ ] Reviewed and tightened CORS origins
- [ ] Blocked abusive IP(s) at network edge
- [ ] Paused risky workflow (if any)
- [ ] Other:

## Recovery Actions

- [ ] Validated auth/login behavior end-to-end
- [ ] Reviewed pending/rejected user states
- [ ] Executed phone hygiene audit (`npm run phones:audit`)
- [ ] Applied phone normalization (`npm run phones:apply`) after review
- [ ] Ran backend tests (`npm test`)
- [ ] Confirmed dashboard signals stabilized

## Root Cause Analysis

- Probable root cause:
- Trigger condition:
- Why existing controls did/did not stop it:
- Detection gap found:

## Preventive Follow-ups

| Action | Owner | Priority | Due Date | Status |
|---|---|---|---|---|
|  |  | P0/P1/P2 |  | Open |
|  |  | P0/P1/P2 |  | Open |

## Communications Log

- Internal updates sent to:
- External/customer communication needed? `Yes/No`
- If yes, summary:

## Closure Criteria

- [ ] No new related signals for agreed monitoring window
- [ ] Critical controls confirmed active
- [ ] Follow-up tasks created and assigned
- [ ] Incident owner approved closure

## Sign-off

- Incident Commander:
- Security Owner:
- Date Closed:
