# Low-Priority Localization Shortlist

Last updated: 2026-05-06  
Scope: `machineos/client/src/pages`

## Purpose

This list captures **remaining non-blocking hardcoded text** after major localization passes.  
These items are mostly cosmetic/sample/demo/static-data strings and do not block critical workflows.

## Priority P2 (Cosmetic / Nice-to-have)

### `ClientDashboard`

- Static sample card labels:
  - `Available Now`, `Wallet Balance`, `Active Bookings`, `Avg Rating`
- Availability tags:
  - `Available`, `Deployed`, `Currently Deployed`
- Calculator microcopy:
  - `Hourly`, `Daily`, `Weekly`, `Monthly`
  - `Select a Machine first`, `View Fleet`, `Change`
  - Some unit strings (`/hr`, `/day`, `/wk`, `/mo`, `hrs`, `days`, `wks`, `mo`)
- Wallet/report cosmetic strings:
  - `WALLET-ONLY - NO CASH`
  - `Quick Recharge via UPI`, `Scan to Pay`
  - Payment methods chips (`UPI`, `NEFT`, `IMPS`, `Card`, `Net Banking`)
- Report table leftovers:
  - `Base`, `GST` column headers still literal strings in one table.

### `OperatorDashboard`

- Static sample/mock data labels:
  - Attendance sample statuses (`Present`, `Half Day`, `Absent`)
  - Mock notes (`Fuel update`, `Machine Started`, etc.)
- Home banner and quick actions:
  - `RUNNING/STOPPED` uppercase variant in one banner
  - Button labels like `Start`, `Stop`, `Issue` in quick action block
- Issue taxonomy labels:
  - `Mechanical`, `Fuel Issue`, `Accident`, `Electrical`, `Site Issue`, `Other`
- Table headers partial:
  - `HMR`, `Time`, and `Fuel?` remain literal in some tables (by design/abbrev but can be keyed).

### `OwnerDashboard`

- Registration wizard static step labels:
  - `Owner Info`, `Machine Info`, `PDI Check`, `Documents`, `Agreement`
- Sample labels in mock card blocks:
  - Some local labels in machine/payment examples still direct literals.

## Recommended Final Sweep Order

1. Move all remaining **table header strings** to translation keys.
2. Move all **quick-action button labels** to keys.
3. Move **mock/sample labels** only if they are visible in production builds.
4. Keep technical abbreviations (`HMR`, `GST`) unchanged unless business requests full localization.

## Acceptance Criteria (for closing this shortlist)

- No visible hardcoded English action words in primary UI panels.
- Table headers are key-based on Client/Operator/Owner major tabs.
- Language switch in `en/hi/mr` shows consistent UX without mixed labels in critical flows.
