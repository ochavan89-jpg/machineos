# Go-Live QA Runbook

Last updated: 2026-05-06  
Environment: Production (`machineos-production.up.railway.app`)

## Pre-Checks

- [ ] Backend health endpoint returns healthy.
- [ ] Production env validation is passing (`check:env:prod`).
- [ ] Latest frontend build is deployed.
- [ ] Test credentials available for all roles.

## 10-Point Execution Checklist

### 1) Admin Login
- [ ] Login with Admin role using email/password.
- [ ] Verify redirect to Admin dashboard.
- [ ] Verify no redirect loop after refresh.

### 2) Client/Owner/Operator Login
- [ ] Login with Client using mobile number.
- [ ] Login with Owner using mobile number.
- [ ] Login with Operator using mobile number.
- [ ] Verify each role lands on correct dashboard.

### 3) Language Switching
- [ ] Change language on Login and each dashboard.
- [ ] Verify nav labels + key headings update.
- [ ] Verify no raw translation keys are shown.

### 4) Auth Guard + Logout
- [ ] Logout from each role.
- [ ] Open protected routes manually after logout.
- [ ] Verify redirect to login.

### 5) Admin Security Panel
- [ ] Open Security Signals panel.
- [ ] Verify API Health and Rate Limit telemetry cards render.
- [ ] Verify refresh and acknowledge actions work.

### 6) Audit + DLQ Operations
- [ ] Open Audit tab and apply filters.
- [ ] Verify reset/clear/export controls.
- [ ] Open DLQ tab and test retry modal validation.

### 7) Pagination / Load More
- [ ] Trigger load-more in Admin, Owner, Client, Operator.
- [ ] Verify no duplicate records.
- [ ] Verify loaded counts and has-more behavior.

### 8) Client Booking + Wallet UX
- [ ] Perform booking confirm flow.
- [ ] Test insufficient wallet branch.
- [ ] Verify warning/confirm messaging and state transitions.

### 9) Razorpay Webhook End-to-End
- [ ] Run one successful payment.
- [ ] Run one failed payment.
- [ ] Verify webhook processed correctly.
- [ ] Verify transaction and booking states match expected outcomes.

### 10) Final Production Sanity
- [ ] No major console/runtime errors.
- [ ] Critical pages render quickly (Login/Admin/Client booking).
- [ ] Security/auth behavior matches expectations (401/403 where applicable).

## Defect Severity

- **P0**: Login/auth/payment flow broken, wrong role access, data corruption.
- **P1**: Major dashboard section unusable or wrong production behavior.
- **P2**: Cosmetic/i18n mismatch with no flow break.

## Sign-Off

- QA Owner: ____________________
- Date/Time: ____________________
- Build/Release ID: ____________________
- Decision: [ ] Go-Live Approved  [ ] Blocked
- Notes: ____________________
