'use strict';

const express = require('express');
const { supabase } = require('../services/supabase');
const { requireAuth } = require('../middleware/requireAuth');
const { createRateLimiter, getRateLimitTelemetry } = require('../middleware/rateLimit');
const { logger } = require('../services/logger');
const { writeAuditLog } = require('../services/audit');
const { addJob } = require('../queues');

const router = express.Router();
router.use(requireAuth(['admin']));
router.use(createRateLimiter({ windowMs: 60 * 1000, maxHits: 120 }));
const suspiciousInvalidQueryThreshold = Math.max(2, Number(process.env.SECURITY_INVALID_QUERY_THRESHOLD || 5));
const suspiciousRetryBurstThreshold = Math.max(2, Number(process.env.SECURITY_RETRY_BURST_THRESHOLD || 8));
const suspiciousWindowMs = Math.max(60 * 1000, Number(process.env.SECURITY_SUSPICIOUS_WINDOW_MS || (10 * 60 * 1000)));
const highSignalAlertCooldownMs = Math.max(30 * 1000, Number(process.env.SECURITY_HIGH_SIGNAL_ALERT_COOLDOWN_MS || (3 * 60 * 1000)));
const securityAlertQueueEnabled = String(process.env.SECURITY_ALERT_QUEUE_ENABLED || 'true').toLowerCase() !== 'false';

function _parseIsoDate(value) {
  const text = (value || '').toString().trim();
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return 'invalid';
  return parsed;
}

function _decodeAuditCursor(token) {
  const raw = (token || '').toString().trim();
  if (!raw) return null;
  const parts = raw.split('|');
  if (parts.length !== 2) return 'invalid';
  const createdAt = _parseIsoDate(parts[0]);
  const id = Number(parts[1]);
  if (createdAt === 'invalid' || !Number.isInteger(id) || id <= 0) return 'invalid';
  return { createdAt: createdAt.toISOString(), id };
}

function _encodeAuditCursor(item) {
  if (!item?.created_at || !item?.id) return null;
  return `${item.created_at}|${item.id}`;
}

function _decodeDlqCursor(token) {
  const raw = (token || '').toString().trim();
  if (!raw) return null;
  const parts = raw.split('|');
  if (parts.length !== 2) return 'invalid';
  const createdAt = _parseIsoDate(parts[0]);
  const id = Number(parts[1]);
  if (createdAt === 'invalid' || !Number.isInteger(id) || id <= 0) return 'invalid';
  return { createdAt: createdAt.toISOString(), id };
}

function _encodeDlqCursor(item) {
  if (!item?.created_at || !item?.id) return null;
  return `${item.created_at}|${item.id}`;
}

function _hasOnlyAllowedParams(query, allowed) {
  const keys = Object.keys(query || {});
  return keys.every((key) => allowed.includes(key));
}

function _safeText(value, maxLen = 80) {
  return (value || '').toString().trim().slice(0, maxLen);
}

const suspiciousBuckets = new Map();
const highSignalAlertBuckets = new Map();

async function _trackSuspiciousAdminEvent(req, eventType, threshold, windowMs, metadata = {}) {
  const actorId = req.user?.id || 'unknown';
  const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() || req.ip || 'unknown';
  const key = `${eventType}:${actorId}:${ip}`;
  const now = Date.now();
  const current = suspiciousBuckets.get(key);
  if (!current || now > current.expiresAt) {
    suspiciousBuckets.set(key, { count: 1, expiresAt: now + windowMs, alerted: false });
    return;
  }
  current.count += 1;
  if (current.count >= threshold && !current.alerted) {
    current.alerted = true;
    const severity = eventType.includes('retry_burst') ? 'HIGH' : 'MEDIUM';
    await writeAuditLog({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: eventType,
      entityType: 'security_signal',
      entityId: actorId,
      metadata: {
        count: current.count,
        windowMs,
        ip,
        userAgent: req.get('user-agent') || null,
        severity,
        ...metadata,
      },
    });
    if (severity === 'HIGH' && securityAlertQueueEnabled) {
      const alertKey = `${eventType}:${ip}`;
      const lastAlertAt = highSignalAlertBuckets.get(alertKey) || 0;
      if ((now - lastAlertAt) >= highSignalAlertCooldownMs) {
        highSignalAlertBuckets.set(alertKey, now);
        try {
          await addJob('alert', 'security-high-signal', {
            eventType,
            severity,
            actorId,
            actorRole: req.user?.role || null,
            ip,
            userAgent: req.get('user-agent') || null,
            count: current.count,
            windowMs,
            metadata,
            detectedAt: new Date(now).toISOString(),
          });
        } catch (err) {
          logger.warn({ err: err.message, eventType }, 'Failed to enqueue high severity security alert');
        }
      }
    }
  }
}

router.get('/users', async (_req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone, role, gstin, status, created_at')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Failed to fetch users' });

  const { data: wallets } = await supabase.from('wallets').select('user_id, balance');
  const merged = (data || []).map((u) => ({
    ...u,
    wallet_balance: (wallets || []).find((w) => w.user_id === u.id)?.balance || 0,
  }));
  return res.json({ items: merged });
});

router.get('/transactions', async (_req, res) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: 'Failed to fetch transactions' });
  return res.json({ items: data || [] });
});

router.get('/machines', async (_req, res) => {
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .order('machine_id', { ascending: true });
  if (error) return res.status(500).json({ error: 'Failed to fetch machines' });
  return res.json({ items: data || [] });
});

router.get('/bookings', async (_req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Failed to fetch bookings' });
  return res.json({ items: data || [] });
});

router.get('/issues', async (_req, res) => {
  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Failed to fetch issues' });
  return res.json({ items: data || [] });
});

router.get('/dlq', async (req, res) => {
  const allowedParams = ['queue', 'status', 'cursor', 'limit'];
  if (!_hasOnlyAllowedParams(req.query, allowedParams)) {
    await _trackSuspiciousAdminEvent(req, 'security.admin_invalid_query', suspiciousInvalidQueryThreshold, suspiciousWindowMs, { endpoint: '/admin/dlq', reason: 'unsupported_param' });
    return res.status(400).json({ error: 'Unsupported query parameter' });
  }
  const queue = _safeText(req.query.queue, 24);
  const status = _safeText(req.query.status, 24);
  const cursor = (req.query.cursor || '').toString().trim();
  const limit = Math.min(Number(req.query.limit || 100), 200);
  const decodedCursor = _decodeDlqCursor(cursor);
  const allowedQueues = new Set(['whatsapp', 'email', 'alert', 'pdf']);
  const allowedStatuses = new Set(['failed', 'retried']);
  if (queue && !allowedQueues.has(queue)) {
    await _trackSuspiciousAdminEvent(req, 'security.admin_invalid_query', suspiciousInvalidQueryThreshold, suspiciousWindowMs, { endpoint: '/admin/dlq', reason: 'invalid_queue' });
    return res.status(400).json({ error: 'Invalid queue filter' });
  }
  if (status && !allowedStatuses.has(status)) {
    await _trackSuspiciousAdminEvent(req, 'security.admin_invalid_query', suspiciousInvalidQueryThreshold, suspiciousWindowMs, { endpoint: '/admin/dlq', reason: 'invalid_status' });
    return res.status(400).json({ error: 'Invalid status filter' });
  }
  if (!Number.isFinite(Number(req.query.limit || 100)) || Number(req.query.limit || 100) < 1) {
    await _trackSuspiciousAdminEvent(req, 'security.admin_invalid_query', suspiciousInvalidQueryThreshold, suspiciousWindowMs, { endpoint: '/admin/dlq', reason: 'invalid_limit' });
    return res.status(400).json({ error: 'Invalid limit value' });
  }
  if (decodedCursor === 'invalid') {
    await _trackSuspiciousAdminEvent(req, 'security.admin_invalid_query', suspiciousInvalidQueryThreshold, suspiciousWindowMs, { endpoint: '/admin/dlq', reason: 'invalid_cursor' });
    return res.status(400).json({ error: 'Invalid cursor format' });
  }

  let query = supabase
    .from('dead_letter_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (queue) query = query.eq('queue_name', queue);
  if (status) query = query.eq('status', status);
  if (decodedCursor) {
    query = query.or(`created_at.lt.${decodedCursor.createdAt},and(created_at.eq.${decodedCursor.createdAt},id.lt.${decodedCursor.id})`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Failed to fetch DLQ items' });

  const items = data || [];
  const counters = {
    total: items.length,
    failed: items.filter((x) => x.status === 'failed').length,
    retried: items.filter((x) => x.status === 'retried').length,
    whatsapp: items.filter((x) => x.queue_name === 'whatsapp').length,
    email: items.filter((x) => x.queue_name === 'email').length,
    alert: items.filter((x) => x.queue_name === 'alert').length,
  };
  const nextCursor = items.length === limit ? _encodeDlqCursor(items[items.length - 1]) : null;
  return res.json({ count: items.length, items, counters, nextCursor, hasMore: Boolean(nextCursor) });
});

router.get('/dlq/stats', async (_req, res) => {
  const since = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString();
  const { data, error } = await supabase
    .from('dead_letter_queue')
    .select('queue_name, status, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: 'Failed to fetch DLQ stats' });

  const hourlyMap = new Map();
  const queueCounts = { whatsapp: 0, email: 0, alert: 0, pdf: 0, other: 0 };
  for (const row of (data || [])) {
    const hour = new Date(row.created_at).toISOString().slice(0, 13);
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
    const queueName = row.queue_name || 'other';
    if (Object.prototype.hasOwnProperty.call(queueCounts, queueName)) {
      queueCounts[queueName] += 1;
    } else {
      queueCounts.other += 1;
    }
  }

  const hourly = Array.from(hourlyMap.entries()).map(([hour, count]) => ({ hour, count }));
  return res.json({
    totalLast24h: (data || []).length,
    failedLast24h: (data || []).filter((x) => x.status === 'failed').length,
    retriedLast24h: (data || []).filter((x) => x.status === 'retried').length,
    queueCounts,
    hourly,
  });
});

router.post('/dlq/:id/retry', async (req, res) => {
  await _trackSuspiciousAdminEvent(req, 'security.admin_retry_burst', suspiciousRetryBurstThreshold, suspiciousWindowMs, { endpoint: '/admin/dlq/retry' });
  const retryReason = (req.body?.reason || '').toString().trim();
  if (retryReason.length < 8) {
    return res.status(400).json({ error: 'Retry reason must be at least 8 characters' });
  }
  const { data: job, error } = await supabase
    .from('dead_letter_queue')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error || !job) return res.status(404).json({ error: 'DLQ job not found' });
  if (job.status && job.status !== 'failed') {
    return res.status(400).json({ error: 'Only failed jobs can be retried' });
  }
  if ((job.attempts || 0) >= 15) {
    return res.status(400).json({ error: 'Retry blocked: max attempts exceeded' });
  }

  try {
    await addJob(job.queue_name, job.job_name, job.payload);
    await supabase.from('dead_letter_queue').update({
      status: 'retried',
      retried_at: new Date().toISOString(),
      retried_by: req.user?.id || null,
    }).eq('id', job.id);
    await writeAuditLog({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: 'admin.dlq_retry',
      entityType: 'dead_letter_queue',
      entityId: String(job.id),
      metadata: {
        queue: job.queue_name,
        jobName: job.job_name,
        retryReason,
        requestIp: (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() || req.ip || null,
        userAgent: req.get('user-agent') || null,
      },
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: `Retry failed: ${err.message}` });
  }
});

router.get('/audit-logs', async (req, res) => {
  const allowedParams = ['action', 'actorId', 'actorRole', 'entityType', 'from', 'to', 'metadata', 'cursor', 'limit'];
  if (!_hasOnlyAllowedParams(req.query, allowedParams)) {
    await _trackSuspiciousAdminEvent(req, 'security.admin_invalid_query', suspiciousInvalidQueryThreshold, suspiciousWindowMs, { endpoint: '/admin/audit-logs', reason: 'unsupported_param' });
    return res.status(400).json({ error: 'Unsupported query parameter' });
  }
  const action = _safeText(req.query.action, 64);
  const actorId = _safeText(req.query.actorId, 64);
  const actorRole = _safeText(req.query.actorRole, 24);
  const entityType = _safeText(req.query.entityType, 48);
  const from = (req.query.from || '').toString().trim();
  const to = (req.query.to || '').toString().trim();
  const metadataQuery = _safeText(req.query.metadata, 80).toLowerCase();
  const cursor = (req.query.cursor || '').toString().trim();
  const limit = Math.min(Number(req.query.limit || 100), 200);
  const fromDate = _parseIsoDate(from);
  const toDate = _parseIsoDate(to);
  const decodedCursor = _decodeAuditCursor(cursor);
  const allowedRoles = new Set(['admin', 'owner', 'client', 'operator']);

  if (fromDate === 'invalid' || toDate === 'invalid' || decodedCursor === 'invalid') {
    await _trackSuspiciousAdminEvent(req, 'security.admin_invalid_query', suspiciousInvalidQueryThreshold, suspiciousWindowMs, { endpoint: '/admin/audit-logs', reason: 'invalid_date_or_cursor' });
    return res.status(400).json({ error: 'Invalid from/to date. Use ISO date format.' });
  }
  if (!Number.isFinite(Number(req.query.limit || 100)) || Number(req.query.limit || 100) < 1) {
    await _trackSuspiciousAdminEvent(req, 'security.admin_invalid_query', suspiciousInvalidQueryThreshold, suspiciousWindowMs, { endpoint: '/admin/audit-logs', reason: 'invalid_limit' });
    return res.status(400).json({ error: 'Invalid limit value' });
  }
  if (actorRole && !allowedRoles.has(actorRole)) {
    await _trackSuspiciousAdminEvent(req, 'security.admin_invalid_query', suspiciousInvalidQueryThreshold, suspiciousWindowMs, { endpoint: '/admin/audit-logs', reason: 'invalid_role' });
    return res.status(400).json({ error: 'Invalid actorRole filter' });
  }
  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    await _trackSuspiciousAdminEvent(req, 'security.admin_invalid_query', suspiciousInvalidQueryThreshold, suspiciousWindowMs, { endpoint: '/admin/audit-logs', reason: 'invalid_range' });
    return res.status(400).json({ error: 'Invalid range: from must be before to' });
  }
  if (fromDate && toDate) {
    const rangeMs = toDate.getTime() - fromDate.getTime();
    const maxRangeMs = 92 * 24 * 60 * 60 * 1000;
    if (rangeMs > maxRangeMs) {
      return res.status(400).json({ error: 'Date range too large. Max allowed is 92 days.' });
    }
  }

  const pageSize = Math.max(1, limit);
  const chunkSize = Math.min(300, pageSize * 3);
  let searchCursor = decodedCursor || null;
  let fetchedEnough = false;
  let reachedEnd = false;
  const collected = [];
  let lastReturned = null;

  while (!fetchedEnough && !reachedEnd) {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(chunkSize);

    if (action) query = query.ilike('action', `%${action}%`);
    if (actorId) query = query.eq('actor_id', actorId);
    if (actorRole) query = query.eq('actor_role', actorRole);
    if (entityType) query = query.eq('entity_type', entityType);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);
    if (searchCursor) {
      query = query.or(`created_at.lt.${searchCursor.createdAt},and(created_at.eq.${searchCursor.createdAt},id.lt.${searchCursor.id})`);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: 'Failed to fetch audit logs' });
    const rows = data || [];
    if (rows.length === 0) {
      reachedEnd = true;
      break;
    }

    const filtered = metadataQuery
      ? rows.filter((row) => JSON.stringify(row.metadata || {}).toLowerCase().includes(metadataQuery))
      : rows;

    for (const row of filtered) {
      collected.push(row);
      lastReturned = row;
      if (collected.length >= pageSize) {
        fetchedEnough = true;
        break;
      }
    }

    if (fetchedEnough && lastReturned) {
      searchCursor = { createdAt: lastReturned.created_at, id: lastReturned.id };
      break;
    }

    const lastScanned = rows[rows.length - 1];
    searchCursor = { createdAt: lastScanned.created_at, id: lastScanned.id };
    if (rows.length < chunkSize) reachedEnd = true;
  }

  const items = collected.slice(0, pageSize);
  const nextCursor = items.length === pageSize && searchCursor ? _encodeAuditCursor(searchCursor) : null;
  return res.json({ items, count: items.length, nextCursor, hasMore: Boolean(nextCursor) });
});

router.get('/telemetry/rate-limit', async (_req, res) => {
  return res.json(getRateLimitTelemetry());
});

router.post('/security-signals/:id/ack', async (req, res) => {
  const signalId = Number(req.params.id);
  if (!Number.isInteger(signalId) || signalId <= 0) {
    return res.status(400).json({ error: 'Invalid signal id' });
  }
  const { data: signal, error } = await supabase
    .from('audit_logs')
    .select('id, action, metadata')
    .eq('id', signalId)
    .single();
  if (error || !signal) return res.status(404).json({ error: 'Signal not found' });
  if (!String(signal.action || '').startsWith('security.')) {
    return res.status(400).json({ error: 'Only security signals can be acknowledged' });
  }
  const { data: existingAck } = await supabase
    .from('audit_logs')
    .select('id, actor_id, created_at')
    .eq('action', 'security.signal_acknowledged')
    .eq('entity_type', 'security_signal')
    .eq('entity_id', String(signalId))
    .order('created_at', { ascending: false })
    .limit(1);
  if ((existingAck || []).length > 0) {
    const latest = existingAck[0];
    return res.json({
      success: true,
      alreadyAcknowledged: true,
      acknowledgedBy: latest.actor_id || null,
      acknowledgedAt: latest.created_at || null,
    });
  }
  await writeAuditLog({
    actorId: req.user?.id,
    actorRole: req.user?.role,
    action: 'security.signal_acknowledged',
    entityType: 'security_signal',
    entityId: String(signalId),
    metadata: {
      signalId,
      severity: signal?.metadata?.severity || null,
      sourceAction: signal.action,
      acknowledgedAt: new Date().toISOString(),
    },
  });
  return res.json({ success: true, alreadyAcknowledged: false });
});

router.get('/users/pending', async (_req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone, gstin, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Failed to fetch pending users' });
  return res.json({ items: data || [] });
});

router.patch('/users/:id/approve', async (req, res) => {
  const userId = req.params.id;
  const { error } = await supabase.from('users').update({ status: 'active' }).eq('id', userId);
  if (error) return res.status(500).json({ error: 'Failed to approve user' });
  await supabase.from('wallets').upsert({ user_id: userId, balance: 0, updated_at: new Date().toISOString() });
  await writeAuditLog({
    actorId: req.user?.id,
    actorRole: req.user?.role,
    action: 'admin.user_approved',
    entityType: 'user',
    entityId: userId,
  });
  return res.json({ success: true });
});

router.patch('/users/:id/reject', async (req, res) => {
  const userId = req.params.id;
  const { error } = await supabase.from('users').update({ status: 'rejected' }).eq('id', userId);
  if (error) return res.status(500).json({ error: 'Failed to reject user' });
  await writeAuditLog({
    actorId: req.user?.id,
    actorRole: req.user?.role,
    action: 'admin.user_rejected',
    entityType: 'user',
    entityId: userId,
  });
  return res.json({ success: true });
});

router.use((err, _req, res, _next) => {
  logger.error({ err }, 'Admin route error');
  res.status(500).json({ error: 'Admin request failed' });
});

module.exports = router;
