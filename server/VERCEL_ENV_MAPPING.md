# Vercel Environment Mapping

Use this file while configuring Vercel project environment variables.

## Backend (server) - Required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ADMIN_API_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `CORS_ORIGINS` (comma-separated, include frontend domain)

## Backend (server) - Required in Production
- `RAZORPAY_WEBHOOK_SECRET`

## Backend (server) - Optional/Feature Flags
- `TWILIO_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `REDIS_TLS`
- `SECURITY_INVALID_QUERY_THRESHOLD`
- `SECURITY_RETRY_BURST_THRESHOLD`
- `SECURITY_SUSPICIOUS_WINDOW_MS`
- `SECURITY_HIGH_SIGNAL_ALERT_COOLDOWN_MS`
- `SECURITY_ALERT_QUEUE_ENABLED`
- `SECURITY_BLOCKED_RATE_ALERT_THRESHOLD`
- `SECURITY_ALERT_EMAIL_TO`

## Frontend (client) - Required
- `REACT_APP_API_BASE_URL` -> backend public URL

## Verification Commands
- Server env preflight (dev): `npm run check:env`
- Server env preflight (prod strict): `npm run check:env:prod`
- Server tests: `npm test`
- Client build: `npm run build` (in `client`)
