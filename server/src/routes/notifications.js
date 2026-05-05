'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { createRateLimiter } = require('../middleware/rateLimit');
const { addJob } = require('../queues');
const { writeAuditLog } = require('../services/audit');

const router = express.Router();
router.use(requireAuth());
router.use(createRateLimiter({ windowMs: 60 * 1000, maxHits: 80 }));

router.post('/whatsapp', async (req, res) => {
  const { to, message } = req.body || {};
  if (!to || !message) return res.status(400).json({ error: 'to and message are required' });

  await addJob('whatsapp', 'custom-message', { to, message, requestedBy: req.user.id });
  await writeAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'notify.whatsapp_enqueued',
    entityType: 'notification',
    metadata: { to },
  });
  return res.json({ success: true });
});

router.post('/email', async (req, res) => {
  const { to, subject, html } = req.body || {};
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'to, subject and html are required' });
  }

  await addJob('email', 'custom-email', { to, subject, html, requestedBy: req.user.id });
  await writeAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'notify.email_enqueued',
    entityType: 'notification',
    metadata: { to, subject },
  });
  return res.json({ success: true });
});

module.exports = router;
