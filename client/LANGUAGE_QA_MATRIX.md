# Language QA Matrix (Client App)

Last updated: 2026-05-06  
Scope: `machineos/client/src`

## Test Languages

- `en` (English)
- `hi` (Hindi)
- `mr` (Marathi)
- One fallback language (example: `gu` or `ta`)

## Critical Screens

- Login
- Admin Dashboard
- Owner Dashboard
- Client Dashboard
- Operator Dashboard

## Critical Flows

1. Sign in / sign out
2. Navigation tab switching
3. Load-more lists
4. Alerts / warnings / confirmations
5. Report download actions
6. Audit/Security operations (Admin)

## Execution Matrix

| Screen | Flow | Expected Result | en | hi | mr | fallback |
|---|---|---|---|---|---|---|
| Login | Role select + Sign in button | Labels translate immediately after language switch | ☐ | ☐ | ☐ | ☐ |
| Login | Signup modal | Headings/buttons/show-hide text localized | ☐ | ☐ | ☐ | ☐ |
| Admin | Nav + security panel | Security/telemetry headings and actions localized | ☐ | ☐ | ☐ | ☐ |
| Admin | DLQ/Audit actions | Retry/reset/export/chip labels localized | ☐ | ☐ | ☐ | ☐ |
| Owner | Nav + section titles | Machine status/registration/payment headings localized | ☐ | ☐ | ☐ | ☐ |
| Owner | Approval actions | Approved/pending/dispatch actions localized | ☐ | ☐ | ☐ | ☐ |
| Client | Calculator/report headers | Key calculator + report headers localized | ☐ | ☐ | ☐ | ☐ |
| Client | Booking modals | Confirm/cancel/warning texts localized | ☐ | ☐ | ☐ | ☐ |
| Operator | Daily/fuel/issue tables | Table headers and action labels localized | ☐ | ☐ | ☐ | ☐ |
| Operator | Issue/fuel modals | Modal headings and action buttons localized | ☐ | ☐ | ☐ | ☐ |

## Non-Functional Checks

- [ ] Language switch has no page crash or blank state.
- [ ] Build is green after localization changes.
- [ ] No clipped text in mobile layout for `hi`/`mr`.
- [ ] Fallback language displays English for missing keys (no raw key names visible).
- [ ] Urdu (`ur`) renders RTL correctly where used.

## Defect Severity

- `P0`: Wrong action meaning (e.g., confirm/cancel/retry mistranslated).
- `P1`: Critical workflow text not translated on major screen.
- `P2`: Cosmetic untranslated labels that do not block workflow.

## Sign-Off

- QA Owner: ____________________
- Date: ____________________
- Build hash/version: ____________________
- Release decision: ☐ Go  ☐ No-Go
