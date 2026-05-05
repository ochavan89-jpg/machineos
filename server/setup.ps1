# Run from: E:\development express 2026 april\machineos\server
# Usage: .\setup.ps1

$base = "E:\development express 2026 april\machineos\server"
Set-Location $base

function Write-File($path, $content) {
  $full = Join-Path $base $path
  $dir  = Split-Path $full -Parent
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  [System.IO.File]::WriteAllText($full, $content, [System.Text.UTF8Encoding]::new($false))
  Write-Host "  Created: $path"
}

# ── services/logger.js ──
Write-File "src\services\logger.js" @'
'use strict';
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});
module.exports = { logger };
'@

# ── services/supabase.js ──
Write-File "src\services\supabase.js" @'
'use strict';
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
module.exports = { supabase };
'@

# ── queues/index.js ──
Write-File "src\queues\index.js" @'
'use strict';
const { Queue } = require('bullmq');
const { logger } = require('../services/logger');

const redisConnection = {
  host:     process.env.REDIS_HOST || '127.0.0.1',
  port:     parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  tls:      process.env.REDIS_TLS === 'true' ? {} : undefined,
};

const QUEUE_CONFIG = {
  pdf:      { retries: 3, backoff: [2000, 4000, 8000] },
  whatsapp: { retries: 3, backoff: [3000, 6000, 12000] },
  email:    { retries: 5, backoff: [5000, 10000, 20000, 40000, 80000] },
  alert:    { retries: 1, backoff: [] },
};

const queues = {};

async function connectQueues() {
  for (const name of Object.keys(QUEUE_CONFIG)) {
    try {
      queues[name] = new Queue(name, { connection: redisConnection, defaultJobOptions: { removeOnComplete: { count: 100 }, removeOnFail: { count: 200 } } });
      await queues[name].waitUntilReady();
      logger.info({ queue: name }, 'Queue connected');
    } catch (err) {
      logger.warn({ queue: name, err: err.message }, 'Queue unavailable - using mock');
      queues[name] = _mockQueue(name);
    }
  }
}

async function addJob(queueName, jobName, data, opts = {}) {
  const cfg = QUEUE_CONFIG[queueName];
  if (!cfg) throw new Error(`Unknown queue: ${queueName}`);
  return queues[queueName].add(jobName, data, {
    attempts: cfg.retries + 1,
    backoff: cfg.backoff.length ? { type: 'custom', delays: cfg.backoff } : undefined,
    ...opts,
  });
}

function _mockQueue(name) {
  return {
    add: async (jobName, data) => { logger.info({ queue: name, jobName, data }, '[MockQueue] Job added'); return { id: `mock-${Date.now()}` }; },
    waitUntilReady: async () => {},
  };
}

module.exports = { connectQueues, addJob, queues };
'@

# ── routes/webhook.js ──
Write-File "src\routes\webhook.js" @'
'use strict';
const express = require('express');
const crypto  = require('crypto');
const { logger }   = require('../services/logger');
const { supabase } = require('../services/supabase');
const { addJob }   = require('../queues');

const router = express.Router();
const _processedIds = new Set();

function verifySignature(rawBody, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex')); }
  catch { return false; }
}

router.post('/razorpay', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const eventId   = req.headers['x-razorpay-event-id'] || '';
  const rawBody   = req.body;

  let payload;
  try { payload = JSON.parse(rawBody.toString()); }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  if (payload.created_at && Date.now() / 1000 - payload.created_at > 300) {
    return res.status(400).json({ error: 'Event too old' });
  }
  if (!verifySignature(rawBody, signature || '', process.env.RAZORPAY_WEBHOOK_SECRET)) {
    logger.warn({ eventId }, 'Webhook signature mismatch');
    return res.status(400).json({ error: 'Invalid signature' });
  }
  if (eventId && _processedIds.has(eventId)) {
    return res.status(200).json({ status: 'duplicate' });
  }
  if (eventId) _processedIds.add(eventId);

  res.status(200).json({ status: 'received' });

  const event = payload.event;
  logger.info({ event, eventId }, 'Webhook received');

  try {
    if (event === 'payment.captured') {
      const p = payload.payload.payment.entity;
      const bookingId = p.notes?.bookingId;
      if (bookingId) {
        await supabase.from('bookings').update({ advance_paid: p.amount / 100, status: 'confirmed' }).eq('id', bookingId);
        await addJob('whatsapp', 'payment-confirmed', { bookingId, amount: p.amount / 100, paymentId: p.id });
      }
    } else if (event === 'payment.failed') {
      const p = payload.payload.payment.entity;
      await addJob('whatsapp', 'payment-failed', { bookingId: p.notes?.bookingId, paymentId: p.id, reason: p.error_description });
    } else if (event === 'refund.processed') {
      const r = payload.payload.refund.entity;
      await addJob('whatsapp', 'refund-processed', { bookingId: r.notes?.bookingId, refundId: r.id, amount: r.amount / 100 });
    }
  } catch (err) {
    logger.error({ err, event, eventId }, 'Webhook processing error');
    await addJob('alert', 'webhook-error', { event, eventId, error: err.message });
  }
});

module.exports = router;
'@

# ── routes/wallet.js ──
Write-File "src\routes\wallet.js" @'
'use strict';
const express  = require('express');
const crypto   = require('crypto');
const Razorpay = require('razorpay');
const { supabase } = require('../services/supabase');
const { logger }   = require('../services/logger');
const { addJob }   = require('../queues');

const router   = express.Router();
const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

router.post('/create-order', async (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || !amount || amount < 1) return res.status(400).json({ error: 'userId and amount required' });
  try {
    const order = await razorpay.orders.create({ amount: Math.round(amount * 100), currency: 'INR', notes: { userId, purpose: 'wallet_recharge' } });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    logger.error({ err, userId }, 'Razorpay order failed');
    res.status(500).json({ error: 'Order creation failed' });
  }
});

router.post('/verify-payment', async (req, res) => {
  const { userId, orderId, paymentId, signature, amount } = req.body;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  let valid = false;
  try { valid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature || '', 'hex')); } catch {}
  if (!valid) return res.status(400).json({ error: 'Invalid payment signature' });

  const { data: wallet, error: fe } = await supabase.from('wallets').select('balance').eq('user_id', userId).single();
  if (fe) return res.status(500).json({ error: 'Wallet fetch failed' });

  const newBalance = (wallet.balance || 0) + amount;
  const { error: ue } = await supabase.from('wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (ue) return res.status(500).json({ error: 'Wallet update failed' });

  await supabase.from('transactions').insert({ user_id: userId, type: 'credit', amount, description: `Wallet recharge - ${paymentId}`, reference: paymentId, created_at: new Date().toISOString() });
  await addJob('whatsapp', 'wallet-credited', { userId, amount, newBalance });

  res.json({ success: true, newBalance });
});

router.get('/:userId/balance', async (req, res) => {
  const { data, error } = await supabase.from('wallets').select('balance').eq('user_id', req.params.userId).single();
  if (error) return res.status(404).json({ error: 'Wallet not found' });
  res.json({ balance: data.balance });
});

module.exports = router;
'@

# ── routes/dlq.js ──
Write-File "src\routes\dlq.js" @'
'use strict';
const express  = require('express');
const { supabase } = require('../services/supabase');
const { addJob }   = require('../queues');
const { logger }   = require('../services/logger');

const router = express.Router();

router.get('/dlq', async (_req, res) => {
  const { data, error } = await supabase.from('dead_letter_queue').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ count: data.length, items: data });
});

router.post('/dlq/:id/retry', async (req, res) => {
  const { data: job, error } = await supabase.from('dead_letter_queue').select('*').eq('id', req.params.id).single();
  if (error || !job) return res.status(404).json({ error: 'DLQ job not found' });
  try {
    await addJob(job.queue_name, job.job_name, job.payload);
    await supabase.from('dead_letter_queue').insert({ ...job, id: undefined, status: 'retried', retried_at: new Date().toISOString(), original_id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'DLQ retry failed');
    res.status(500).json({ error: 'Retry failed' });
  }
});

module.exports = router;
'@

# ── workers/whatsappWorker.js ──
Write-File "src\workers\whatsappWorker.js" @'
'use strict';
const { Worker } = require('bullmq');
const twilio     = require('twilio');
const { logger }   = require('../services/logger');
const { supabase } = require('../services/supabase');

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const FROM   = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
};

const MESSAGES = {
  'payment-confirmed': d => `Payment Confirmed!\nBooking: ${d.bookingId}\nAmount: Rs.${d.amount.toLocaleString('en-IN')}\nPayment ID: ${d.paymentId}\n\nDevelopment Express +91-8408000084`,
  'payment-failed':    d => `Payment Failed\nBooking: ${d.bookingId}\nReason: ${d.reason}\n\nDevelopment Express +91-8408000084`,
  'refund-processed':  d => `Refund Processed!\nBooking: ${d.bookingId}\nAmount: Rs.${d.amount.toLocaleString('en-IN')} credited to wallet.\n\nDevelopment Express +91-8408000084`,
  'wallet-credited':   d => `Wallet Recharged!\nAmount: Rs.${d.amount.toLocaleString('en-IN')}\nNew Balance: Rs.${d.newBalance.toLocaleString('en-IN')}\n\nDevelopment Express +91-8408000084`,
};

async function getUserPhone(userId) {
  const { data } = await supabase.from('users').select('phone').eq('id', userId).single();
  return data?.phone;
}

function formatPhone(phone) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, '');
  return `whatsapp:+91${clean.slice(-10)}`;
}

const worker = new Worker('whatsapp', async (job) => {
  const msgFn = MESSAGES[job.name];
  if (!msgFn) return;
  const phone = job.data.phone || await getUserPhone(job.data.userId);
  const to    = formatPhone(phone);
  if (!to) { logger.warn({ job: job.name }, 'No phone found'); return; }
  await client.messages.create({ from: FROM, to, body: msgFn(job.data) });
  logger.info({ to, jobName: job.name }, 'WhatsApp sent');
}, { connection: redisConnection, concurrency: 5 });

worker.on('failed', async (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    await supabase.from('dead_letter_queue').insert({
      queue_name: 'whatsapp', job_name: job.name, payload: job.data,
      error: err.message, attempts: job.attemptsMade, status: 'failed',
      created_at: new Date().toISOString(),
    });
    logger.error({ jobName: job.name }, 'Moved to DLQ');
  }
});

module.exports = worker;
'@

# ── cron/index.js ──
Write-File "src\cron\index.js" @'
'use strict';
const cron     = require('node-cron');
const Razorpay = require('razorpay');
const { supabase } = require('../services/supabase');
const { addJob }   = require('../queues');
const { logger }   = require('../services/logger');

const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

async function runBatchReconciliation() {
  logger.info('Reconciliation started');
  const start = Date.now();
  try {
    const from = Math.floor(Date.now() / 1000) - 86400;
    const rzpPayments = await razorpay.payments.all({ from, count: 100 });
    const rzpMap = {};
    for (const p of rzpPayments.items) {
      if (p.notes?.bookingId) rzpMap[p.notes.bookingId] = p;
    }
    const { data: bookings, error } = await supabase.from('bookings').select('id, advance_paid, status, booking_ref').gte('created_at', new Date(from * 1000).toISOString());
    if (error) throw new Error(`Supabase: ${error.message}`);

    const mismatches = [];
    for (const b of bookings) {
      const rzp = rzpMap[b.id];
      if (!rzp) { if (b.advance_paid > 0) mismatches.push({ type: 'MISSING', bookingId: b.id, booking_ref: b.booking_ref }); continue; }
      if (BigInt(rzp.amount) !== BigInt(Math.round((b.advance_paid || 0) * 100))) mismatches.push({ type: 'AMOUNT', bookingId: b.id, rzpAmount: rzp.amount / 100, dbAmount: b.advance_paid });
      if (rzp.status === 'captured' && b.status === 'pending') mismatches.push({ type: 'STATUS', bookingId: b.id, rzpStatus: rzp.status, dbStatus: b.status });
    }

    const duration = Date.now() - start;
    logger.info({ mismatches: mismatches.length, duration }, 'Reconciliation complete');
    if (mismatches.length > 0) {
      await addJob('alert', 'reconciliation-mismatch', { mismatches, runAt: new Date().toISOString(), priority: 'CRITICAL' });
      await supabase.from('reconciliation_logs').insert({ run_at: new Date().toISOString(), mismatches: mismatches.length, details: JSON.stringify(mismatches), duration_ms: duration });
    }
    return { mismatches, duration };
  } catch (err) {
    logger.error({ err }, 'Reconciliation failed');
    await addJob('alert', 'reconciliation-error', { error: err.message, priority: 'CRITICAL' });
    throw err;
  }
}

function startCron() {
  cron.schedule('30 20 * * *', async () => {
    await runBatchReconciliation().catch(err => logger.error({ err }, 'Cron error'));
  }, { timezone: 'UTC' });
  logger.info('Cron jobs registered');
}

module.exports = { startCron, runBatchReconciliation };
'@

# ── .env.example ──
Write-File ".env.example" @'
PORT=5000
NODE_ENV=development
LOG_LEVEL=info
SUPABASE_URL=https://xoqolkqsdkfwxveuwlow.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
RAZORPAY_KEY_ID=rzp_live_Sg0Gjw2xl11Npm
RAZORPAY_KEY_SECRET=your_razorpay_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
'@

Write-Host ""
Write-Host "All files created!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. copy .env.example .env"
Write-Host "  2. node src/index.js"
