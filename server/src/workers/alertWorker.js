'use strict';

const { Worker } = require('bullmq');
const { logger } = require('../services/logger');
const { addJob } = require('../queues');
const { writeAuditLog } = require('../services/audit');
const { supabase } = require('../services/supabase');

const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
};

const alertEmailTo = (process.env.SECURITY_ALERT_EMAIL_TO || '').trim();

function buildSecurityAlertEmail(data) {
  const lines = [
    'HIGH severity security signal detected.',
    '',
    `Event: ${data.eventType || '-'}`,
    `Severity: ${data.severity || 'HIGH'}`,
    `Actor: ${data.actorId || '-'}`,
    `Role: ${data.actorRole || '-'}`,
    `IP: ${data.ip || '-'}`,
    `Count: ${data.count || 0}`,
    `WindowMs: ${data.windowMs || 0}`,
    `DetectedAt: ${data.detectedAt || new Date().toISOString()}`,
  ];
  return {
    subject: `[MachineOS Security] HIGH signal: ${data.eventType || 'unknown'}`,
    html: `<pre>${lines.join('\n')}</pre>`,
  };
}

const worker = new Worker('alert', async (job) => {
  if (job.name !== 'security-high-signal') return;
  const payload = job.data || {};

  logger.warn({ payload }, 'Processing security HIGH signal alert');

  if (alertEmailTo) {
    const email = buildSecurityAlertEmail(payload);
    await addJob('email', 'custom-email', {
      to: alertEmailTo,
      subject: email.subject,
      html: email.html,
      requestedBy: payload.actorId || 'security-system',
    });
  }

  await writeAuditLog({
    actorId: payload.actorId || 'security-system',
    actorRole: payload.actorRole || 'system',
    action: 'security.alert_dispatched',
    entityType: 'security_signal',
    entityId: payload.eventType || null,
    metadata: {
      ...payload,
      channel: alertEmailTo ? 'email' : 'log-only',
    },
  });
}, { connection: redisConnection, concurrency: 2 });

worker.on('failed', async (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    await supabase.from('dead_letter_queue').insert({
      queue_name: 'alert',
      job_name: job.name,
      payload: job.data,
      error: err.message,
      attempts: job.attemptsMade,
      status: 'failed',
      created_at: new Date().toISOString(),
    });
    logger.error({ jobName: job.name }, 'Alert moved to DLQ');
  }
});

module.exports = worker;
