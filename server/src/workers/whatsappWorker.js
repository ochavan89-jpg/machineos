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
  'custom-message':    d => d.message || '',
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