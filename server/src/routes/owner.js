'use strict';

const express = require('express');
const { supabase } = require('../services/supabase');
const { requireAuth } = require('../middleware/requireAuth');
const { createRateLimiter } = require('../middleware/rateLimit');
const { writeAuditLog } = require('../services/audit');

const router = express.Router();
router.use(requireAuth(['owner', 'admin']));
router.use(createRateLimiter({ windowMs: 60 * 1000, maxHits: 100 }));

router.get('/bookings', async (req, res) => {
  const parsedLimit = Number(req.query.limit || 200);
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(Math.floor(parsedLimit), 1000) : 200;
  const { data, error } = await supabase
    .from('bookings')
    .select('*, users!bookings_client_id_fkey(name, phone), machines!bookings_machine_id_fkey(machine_id, name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return res.status(500).json({ error: 'Failed to fetch owner bookings' });
  return res.json({ items: data || [], limit, hasMore: (data || []).length === limit });
});

router.patch('/bookings/:id/approve', async (req, res) => {
  const bookingId = req.params.id;
  const { error } = await supabase
    .from('bookings')
    .update({ owner_approved: true, owner_approved_at: new Date().toISOString() })
    .eq('id', bookingId);
  if (error) return res.status(500).json({ error: 'Failed to approve booking' });
  await writeAuditLog({
    actorId: req.user?.id,
    actorRole: req.user?.role,
    action: 'owner.booking_approved',
    entityType: 'booking',
    entityId: bookingId,
  });
  return res.json({ success: true });
});

module.exports = router;
