'use strict';
const express  = require('express');
const crypto   = require('crypto');
const Razorpay = require('razorpay');
const { supabase } = require('../services/supabase');
const { logger }   = require('../services/logger');
const { addJob }   = require('../queues');
const { requireAuth } = require('../middleware/requireAuth');
const { createRateLimiter } = require('../middleware/rateLimit');
const { writeAuditLog } = require('../services/audit');

const router   = express.Router();
const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
const MAX_ORDER_AMOUNT_INR = 100000;
router.use(createRateLimiter({ windowMs: 60 * 1000, maxHits: 60 }));
router.use(requireAuth());

function isValidUserId(value) {
  return typeof value === 'string' && value.length >= 3 && value.length <= 64;
}

router.post('/create-order', async (req, res) => {
  if (!req.user || req.user.id !== req.body?.userId) {
    return res.status(403).json({ error: 'User mismatch' });
  }
  const { userId, amount } = req.body;
  if (!isValidUserId(userId) || typeof amount !== 'number' || amount < 1 || amount > MAX_ORDER_AMOUNT_INR) {
    return res.status(400).json({ error: 'Invalid userId or amount' });
  }
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      notes: { userId, purpose: 'wallet_recharge' },
    });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    logger.error({ err, userId }, 'Razorpay order failed');
    res.status(500).json({ error: 'Order creation failed' });
  }
});

router.post('/verify-payment', async (req, res) => {
  if (!req.user || req.user.id !== req.body?.userId) {
    return res.status(403).json({ error: 'User mismatch' });
  }
  const { userId, orderId, paymentId, signature } = req.body;
  if (!isValidUserId(userId) || !orderId || !paymentId || !signature) {
    return res.status(400).json({ error: 'Missing required payment fields' });
  }

  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  let valid = false;
  try { valid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature || '', 'hex')); } catch {}
  if (!valid) return res.status(400).json({ error: 'Invalid payment signature' });

  const existingTx = await supabase
    .from('transactions')
    .select('id')
    .eq('reference', paymentId)
    .eq('type', 'credit')
    .limit(1);
  if (!existingTx.error && existingTx.data && existingTx.data.length > 0) {
    return res.json({ success: true, status: 'already_processed' });
  }

  let payment;
  try {
    payment = await razorpay.payments.fetch(paymentId);
  } catch (err) {
    logger.error({ err, paymentId }, 'Unable to fetch payment from Razorpay');
    return res.status(400).json({ error: 'Invalid payment reference' });
  }

  if (!payment || payment.order_id !== orderId || payment.status !== 'captured') {
    return res.status(400).json({ error: 'Payment not captured or order mismatch' });
  }
  if (payment.notes?.userId && payment.notes.userId !== userId) {
    return res.status(400).json({ error: 'Payment user mismatch' });
  }

  const amount = Number(payment.amount) / 100;
  const { data: wallet, error: fe } = await supabase.from('wallets').select('balance').eq('user_id', userId).single();
  if (fe) return res.status(500).json({ error: 'Wallet fetch failed' });

  const newBalance = (wallet.balance || 0) + amount;
  const { error: ue } = await supabase.from('wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (ue) return res.status(500).json({ error: 'Wallet update failed' });

  await supabase.from('transactions').insert({ user_id: userId, type: 'credit', amount, description: `Wallet recharge - ${paymentId}`, reference: paymentId, created_at: new Date().toISOString() });
  await addJob('whatsapp', 'wallet-credited', { userId, amount, newBalance });
  await writeAuditLog({
    actorId: req.user?.id,
    actorRole: req.user?.role,
    action: 'wallet.recharge_verified',
    entityType: 'wallet',
    entityId: userId,
    metadata: { paymentId, amount },
  });

  res.json({ success: true, newBalance });
});

router.get('/:userId/balance', async (req, res) => {
  if (!req.user || (req.user.id !== req.params.userId && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { data, error } = await supabase.from('wallets').select('balance').eq('user_id', req.params.userId).single();
  if (error) return res.status(404).json({ error: 'Wallet not found' });
  res.json({ balance: data.balance });
});

module.exports = router;