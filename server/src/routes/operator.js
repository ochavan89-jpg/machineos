'use strict';

const express = require('express');
const { supabase } = require('../services/supabase');
const { requireAuth } = require('../middleware/requireAuth');
const { createRateLimiter } = require('../middleware/rateLimit');
const { writeAuditLog } = require('../services/audit');
const { addJob } = require('../queues');

const router = express.Router();
router.use(requireAuth(['operator', 'admin']));
router.use(createRateLimiter({ windowMs: 60 * 1000, maxHits: 100 }));

function _parseListLimit(raw, fallback = 50, max = 200) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

function _parseListOffset(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

router.post('/attendance', async (req, res) => {
  const { status, checkIn, date } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status is required' });

  const payload = {
    operator_id: req.user.id,
    date: date || new Date().toISOString().split('T')[0],
    status,
    check_in: checkIn || new Date().toTimeString().split(' ')[0],
  };

  const { error } = await supabase.from('attendance').insert([payload]);
  if (error) return res.status(500).json({ error: 'Failed to mark attendance' });

  await writeAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'operator.attendance_marked',
    entityType: 'attendance',
    metadata: { status: payload.status, date: payload.date },
  });
  return res.json({ success: true });
});

router.get('/attendance', async (req, res) => {
  const limit = _parseListLimit(req.query.limit, 30, 120);
  const offset = _parseListOffset(req.query.offset);
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('operator_id', req.user.id)
    .order('date', { ascending: false })
    .range(offset, offset + limit);
  if (error) return res.status(500).json({ error: 'Failed to fetch attendance' });
  const items = data || [];
  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;
  return res.json({ items: sliced, limit, offset, hasMore, nextOffset: hasMore ? offset + limit : null });
});

router.post('/fuel-log', async (req, res) => {
  const { fuelLevel, note } = req.body || {};
  if (typeof fuelLevel !== 'number' || fuelLevel < 0 || fuelLevel > 100) {
    return res.status(400).json({ error: 'fuelLevel must be between 0 and 100' });
  }
  const payload = {
    operator_id: req.user.id,
    fuel_level: fuelLevel,
    note: note || 'Fuel Updated',
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('fuel_logs').insert([payload]);
  if (error) return res.status(500).json({ error: 'Failed to add fuel log' });

  await writeAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'operator.fuel_updated',
    entityType: 'fuel_log',
    metadata: { fuelLevel },
  });
  return res.json({ success: true });
});

router.get('/fuel-logs', async (req, res) => {
  const limit = _parseListLimit(req.query.limit, 50, 200);
  const offset = _parseListOffset(req.query.offset);
  const { data, error } = await supabase
    .from('fuel_logs')
    .select('*')
    .eq('operator_id', req.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit);
  if (error) return res.status(500).json({ error: 'Failed to fetch fuel logs' });
  const items = data || [];
  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;
  return res.json({ items: sliced, limit, offset, hasMore, nextOffset: hasMore ? offset + limit : null });
});

router.post('/issues', async (req, res) => {
  const { issueType, description } = req.body || {};
  if (!issueType || !description) {
    return res.status(400).json({ error: 'issueType and description are required' });
  }

  const payload = {
    operator_id: req.user.id,
    issue_type: issueType,
    description,
    status: 'Pending',
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('issues').insert([payload]).select('id').single();
  if (error) return res.status(500).json({ error: 'Failed to report issue' });

  await addJob('whatsapp', 'custom-message', {
    to: '+918408000084',
    message: `Operator issue reported\nType: ${issueType}\nOperator ID: ${req.user.id}\nDescription: ${description}`,
  });
  await writeAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'operator.issue_reported',
    entityType: 'issue',
    entityId: String(data?.id || ''),
    metadata: { issueType },
  });

  return res.json({ success: true });
});

module.exports = router;
