# Translation Completeness Checklist (Client App)

Last updated: 2026-05-05
Scope: `machineos/client/src`

## Current Status

- Core language engine is active (`LanguageContext`) with persistence, browser auto-detect, and RTL support for Urdu.
- Language switching is visible on all major user flows (Login, Admin, Owner, Client, Operator).
- Critical navigation labels, auth labels, and high-frequency action labels are translated through `t(...)`.
- Build validation passes after all translation-related edits (`npm run build` successful).

## Screen-Wise Progress

### 1) Login (`pages/Login.js`) - High Coverage

- Done:
  - Role selection label, sign-in/signing-in labels.
  - Mobile/email label and helper hints.
  - Password show/hide actions.
  - New client registration CTA.
  - Success modal headings/buttons.
  - Common auth error key usage for generic failures.
- Pending:
  - Some signup field labels/placeholders are still hardcoded English.
  - Some server-returned validation errors may appear in backend-provided language only.

### 2) Admin Dashboard (`pages/AdminDashboard.js`) - High Coverage

- Done:
  - Primary navigation labels translated via `i18nKey`.
  - Mobile nav uses translated nav items.
  - Security/audit/telemetry headings largely key-based.
  - Core filter/action controls translated (refresh, export, clear, retry, load more).
  - Failed-login and DLQ high-visibility status labels translated.
- Pending:
  - Some deep table content and low-frequency microcopy remain hardcoded.
  - A few technical terms (e.g., route-level telemetry text) may still be English by design.

### 3) Owner Dashboard (`pages/OwnerDashboard.js`) - Medium-High Coverage

- Done:
  - Primary navigation translated.
  - Portal title/footer and logout label translated.
  - Key section headings translated (status/registration/payment history/alerts/contact).
  - Approval/pending/dispatched action labels translated.
- Pending:
  - Registration form field labels and internal static policy bullets still partially hardcoded.
  - Support/contact detail captions can be fully key-driven.

### 4) Client Dashboard (`pages/ClientDashboard.js`) - High Coverage

- Done:
  - Primary navigation translated.
  - Portal subtitle/footer and logout label translated.
  - Key booking status/policy/warning/cancel-confirm labels translated.
  - Payment/recharge alerts localized through translation keys.
  - Calculator/report/wallet high-visibility headings and action labels translated.
  - Booking progress and load-state microcopy translated.
- Pending:
  - Some detailed table headers/cell-level descriptors remain hardcoded.
  - Some long-form policy/descriptive lines are still mixed-language.

### 5) Operator Dashboard (`pages/OperatorDashboard.js`) - High Coverage

- Done:
  - Primary navigation translated with corrected semantic keys.
  - Portal subtitle/footer and logout label translated.
  - Running/stopped status labels translated.
  - Issue/report/cancel alert actions translated.
  - Daily report/issues/fuel modal high-visibility headings translated.
  - Fuel log progress/status microcopy translated.
- Pending:
  - A subset of table column headers and issue taxonomy labels remain hardcoded.
  - Sensor-specific helper descriptions still hardcoded.

## Priority Plan (Recommended)

1. **P0: Common Action Dictionary Completion**
   - Add keys for: save/update/delete/back/next/loading/success/failure/warning/info/confirm.
   - Replace repeated hardcoded action words across all dashboards.

2. **P1: Admin Deep Localization**
   - Translate all admin security/audit/telemetry section headings and badges first.
   - This has highest visibility for operations teams.

3. **P1: Client Cost + Reports Area**
   - Translate calculator labels, booking confirmation modal, transaction table headers, report download labels.

4. **P2: Owner Registration Form Full Localization**
   - Translate form field labels, checkbox disclaimers, and multi-step helper lines.

5. **P2: Operator Work Log Tables**
   - Translate daily report, attendance, fuel table headers and issue taxonomy labels.

## Quality Gate Before Go-Live

- [ ] No major dashboard tab should show mixed-language nav/actions.
- [ ] All destructive/critical actions must be translated (cancel, confirm, approve, report).
- [ ] Build passes with no translation-related warnings.
- [ ] Language switch should be visually verified for `en`, `hi`, `mr`, and one fallback language.
- [ ] PDF labels to be aligned with selected language or intentionally fixed to bilingual format.

## Notes

- Current setup uses safe fallback to English when a key is missing, so runtime break risk is low.
- For scale, consider splitting translations into per-language JSON files (`i18n/*.json`) rather than a single large context file.
- Next best ROI: full table-header normalization pass (`Client` + `Operator`) and then per-language content QA in `en`, `hi`, `mr`.
