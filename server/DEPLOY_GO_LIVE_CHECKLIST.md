# Deploy Go-Live Checklist

## 1) Pre-Deploy Secrets
- [ ] Set `SUPABASE_URL`
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Set `JWT_SECRET` (strong random)
- [ ] Set `JWT_REFRESH_SECRET` (strong random)
- [ ] Set `ADMIN_API_KEY` (strong random)
- [ ] Set `RAZORPAY_KEY_ID`
- [ ] Set `RAZORPAY_KEY_SECRET`
- [ ] Set `TWILIO_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` (if WhatsApp enabled)
- [ ] Set `CORS_ORIGINS` with frontend domain

## 2) Vercel/Hosting Variables
- [ ] Add all variables in production environment
- [ ] Add same variables in preview (test) environment
- [ ] Confirm no placeholder values remain
- [ ] Use `VERCEL_ENV_MAPPING.md` as source of truth
- [ ] Run `npm run check:env:prod` before production deploy

## 3) Deploy
- [ ] Deploy backend (preview first)
- [ ] Validate `/health` returns healthy
- [ ] Validate login + admin dashboard loads
- [ ] Validate audit and DLQ endpoints

## 4) Razorpay Webhook Finalization (After backend URL exists)
- [ ] Create/update webhook URL: `https://<backend-domain>/api/webhook/razorpay`
- [ ] Subscribe events: `payment.captured`, `payment.failed`, `refund.processed`
- [ ] Copy webhook secret to `RAZORPAY_WEBHOOK_SECRET`
- [ ] Re-deploy backend after secret update

## 5) Payment Validation
- [ ] Run one successful payment
- [ ] Run one failed payment scenario
- [ ] Verify webhook signature validation logs success path
- [ ] Verify duplicate webhook idempotency behavior
- [ ] Verify transaction + booking state updates

## 6) Security Final Checks
- [ ] Admin routes reject non-admin roles (`403`)
- [ ] Admin routes reject missing/invalid token (`401`)
- [ ] Rate-limit telemetry visible in admin dashboard
- [ ] Security signal ACK flow works end-to-end
- [ ] No sensitive values committed to git

## 7) Post-Go-Live
- [ ] Rotate any credential that was shared in chat or screenshots
- [ ] Enable HIGH security alerts destination (`SECURITY_ALERT_EMAIL_TO`)
- [ ] Monitor logs for first 24h (payments/webhooks/auth/admin actions)
