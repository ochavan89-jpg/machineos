'use strict';

const express = require('express');
const { supabase } = require('../services/supabase');
const { requireAuth } = require('../middleware/requireAuth');
const { createRateLimiter } = require('../middleware/rateLimit');
const { writeAuditLog } = require('../services/audit');

const router = express.Router();
router.use(requireAuth());
router.use(createRateLimiter({ windowMs: 60 * 1000, maxHits: 80 }));

router.post('/', async (req, res) => {
  const {
    machineId,
    bookingType,
    quantity,
    baseAmount,
    gstAmount,
    totalAmount,
    advancePaid,
    location,
    startDate,
    endDate,
  } = req.body || {};

  if (!machineId || !bookingType || !quantity || !advancePaid) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }
  if (req.user.role !== 'client') {
    return res.status(403).json({ error: 'Only clients can create bookings' });
  }

  const { data: wallet, error: walletErr } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', req.user.id)
    .single();
  if (walletErr || !wallet) {
    return res.status(404).json({ error: 'Wallet not found' });
  }
  if ((wallet.balance || 0) < Number(advancePaid)) {
    return res.status(400).json({ error: 'Insufficient wallet balance' });
  }

  const bookingRef = `BK${Date.now()}`;
  const now = new Date().toISOString();
  const bookingPayload = {
    booking_ref: bookingRef,
    client_id: req.user.id,
    machine_id: machineId,
    booking_type: bookingType,
    quantity: Number(quantity),
    base_amount: Number(baseAmount || 0),
    gst_amount: Number(gstAmount || 0),
    total_amount: Number(totalAmount || 0),
    advance_paid: Number(advancePaid || 0),
    status: 'Active',
    location: location || null,
    start_date: startDate || now.split('T')[0],
    end_date: endDate || null,
  };

  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .insert([bookingPayload])
    .select('*, machines(*)')
    .single();
  if (bookingErr || !booking) {
    return res.status(500).json({ error: 'Booking creation failed' });
  }

  const newBalance = Number(wallet.balance || 0) - Number(advancePaid || 0);
  const { error: updateErr } = await supabase
    .from('wallets')
    .update({ balance: newBalance, updated_at: now })
    .eq('user_id', req.user.id);
  if (updateErr) {
    return res.status(500).json({ error: 'Wallet update failed' });
  }

  await supabase.from('transactions').insert([{
    user_id: req.user.id,
    type: 'debit',
    amount: Number(advancePaid || 0),
    description: `${machineId} booking advance`,
    reference: bookingRef,
    created_at: now,
  }]);
  await writeAuditLog({
    actorId: req.user?.id,
    actorRole: req.user?.role,
    action: 'client.booking_created',
    entityType: 'booking',
    entityId: booking.id,
    metadata: { bookingRef, advancePaid: Number(advancePaid || 0) },
  });

  return res.json({ booking, newBalance });
});

router.get('/me', async (req, res) => {
  const parsedLimit = Number(req.query.limit || 120);
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(Math.floor(parsedLimit), 600) : 120;
  const { data, error } = await supabase
    .from('bookings')
    .select('*, machines(*)')
    .eq('client_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: 'Failed to fetch bookings' });
  return res.json({ items: data || [], limit, hasMore: (data || []).length === limit });
});

router.get('/me/transactions', async (req, res) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) return res.status(500).json({ error: 'Failed to fetch transactions' });
  return res.json({ items: data || [] });
});

module.exports = router;
