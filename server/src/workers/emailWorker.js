'use strict';

const { Worker } = require('bullmq');
const { logger } = require('../services/logger');
const { supabase } = require('../services/supabase');

const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
};

async function sendEmailViaEdge({ to, subject, html }) {
  const url = `${process.env.SUPABASE_URL}/functions/v1/send-email`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
    body: JSON.stringify({ to, subject, html }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`send-email failed: ${response.status} ${body}`);
  }
}

const worker = new Worker('email', async (job) => {
  if (job.name !== 'custom-email') return;
  const { to, subject, html } = job.data || {};
  if (!to || !subject || !html) return;
  await sendEmailViaEdge({ to, subject, html });
  logger.info({ to, subject }, 'Email sent');
}, { connection: redisConnection, concurrency: 3 });

worker.on('failed', async (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    await supabase.from('dead_letter_queue').insert({
      queue_name: 'email',
      job_name: job.name,
      payload: job.data,
      error: err.message,
      attempts: job.attemptsMade,
      status: 'failed',
      created_at: new Date().toISOString(),
    });
    logger.error({ jobName: job.name }, 'Email moved to DLQ');
  }
});

module.exports = worker;
