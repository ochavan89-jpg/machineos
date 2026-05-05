'use strict';
const express = require('express');
const crypto  = require('crypto');
const { logger }   = require('../services/logger');
const { supabase } = require('../services/supabase');
const { addJob }   = require('../queues');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.use(createRateLimiter({ windowMs: 60 * 1000, maxHits: 120 }));

function verifySignature(rawBody, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex')); }
  catch { return false; }
}

router.post('/razorpay', async (req, res) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Webhook secret is not configured' });
  }
  const signature = req.headers['x-razorpay-signature'];
  const eventId   = req.headers['x-razorpay-event-id'] || '';
  const rawBody   = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    return res.status(400).json({ error: 'Invalid payload format' });
  }

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
  if (eventId) {
    const { error: insertErr } = await supabase.from('webhook_events').insert([{
      event_id: eventId,
      event_type: payload.event || 'unknown',
      received_at: new Date().toISOString(),
    }]);
    if (insertErr && insertErr.code === '23505') {
      return res.status(200).json({ status: 'duplicate' });
    }
    if (insertErr && insertErr.code !== '42P01') {
      logger.warn({ eventId, err: insertErr.message }, 'Webhook dedupe insert failed');
    }
  }

  res.status(200).json({ status: 'received' });

  const event = payload.event;
  logger.info({ event, eventId }, 'Webhook received');

  try {
    if (event === 'payment.captured') {
      const p = payload.payload.payment.entity;
      const bookingId = p.notes?.bookingId;
      const { data: existingPayment } = await supabase
        .from('transactions')
        .select('id')
        .eq('reference', p.id)
        .limit(1);
      if (existingPayment && existingPayment.length > 0) return;
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