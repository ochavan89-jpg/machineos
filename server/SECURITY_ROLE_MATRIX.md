# MachineOS Role Matrix

## API Access Policy

- `admin`
  - Full access to `GET /api/admin/*`
  - User lifecycle actions: `PATCH /api/admin/users/:id/approve|reject`
  - Can read any wallet via `GET /api/wallet/:userId/balance`
- `owner`
  - Owner workflow routes only: `GET /api/owner/bookings`, `PATCH /api/owner/bookings/:id/approve`
  - No direct access to admin routes
- `client`
  - Booking and wallet user-scoped routes:
    - `POST /api/bookings`
    - `GET /api/bookings/me`
    - `GET /api/bookings/me/transactions`
    - `POST /api/wallet/create-order`
    - `POST /api/wallet/verify-payment`
    - `GET /api/wallet/:userId/balance` (self only)
- `operator`
  - Operator workflow routes:
    - `POST /api/operator/attendance`
    - `POST /api/operator/fuel-log`
    - `POST /api/operator/issues`
  - No access to admin/owner privileged routes

## Cross-Cutting Rules

- All protected routes require `tokenType=access` JWT.
- Refresh tokens are only valid on `POST /api/auth/refresh`.
- Rate limiting is enabled on auth, wallet, owner, admin, and notifications routes.
- Sensitive actions must write an audit entry (`audit_logs` table).
