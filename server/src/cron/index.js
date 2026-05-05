'use strict';
const cron     = require('node-cron');
const Razorpay = require('razorpay');
const { supabase } = require('../services/supabase');
const { addJob }   = require('../queues');
const { logger }   = require('../services/logger');

const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

async function runBatchReconciliation() {
  logger.info('Reconciliation started');
  const start = Date.now();
  try {
    const from = Math.floor(Date.now() / 1000) - 86400;
    const rzpPayments = await razorpay.payments.all({ from, count: 100 });
    const rzpMap = {};
    for (const p of rzpPayments.items) {
      if (p.notes?.bookingId) rzpMap[p.notes.bookingId] = p;
    }
    const { data: bookings, error } = await supabase.from('bookings').select('id, advance_paid, status, booking_ref').gte('created_at', new Date(from * 1000).toISOString());
    if (error) throw new Error(`Supabase: ${error.message}`);

    const mismatches = [];
    for (const b of bookings) {
      const rzp = rzpMap[b.id];
      if (!rzp) { if (b.advance_paid > 0) mismatches.push({ type: 'MISSING', bookingId: b.id, booking_ref: b.booking_ref }); continue; }
      if (BigInt(rzp.amount) !== BigInt(Math.round((b.advance_paid || 0) * 100))) mismatches.push({ type: 'AMOUNT', bookingId: b.id, rzpAmount: rzp.amount / 100, dbAmount: b.advance_paid });
      if (rzp.status === 'captured' && b.status === 'pending') mismatches.push({ type: 'STATUS', bookingId: b.id, rzpStatus: rzp.status, dbStatus: b.status });
    }

    const duration = Date.now() - start;
    logger.info({ mismatches: mismatches.length, duration }, 'Reconciliation complete');
    if (mismatches.length > 0) {
      await addJob('alert', 'reconciliation-mismatch', { mismatches, runAt: new Date().toISOString(), priority: 'CRITICAL' });
      await supabase.from('reconciliation_logs').insert({ run_at: new Date().toISOString(), mismatches: mismatches.length, details: JSON.stringify(mismatches), duration_ms: duration });
    }
    return { mismatches, duration };
  } catch (err) {
    logger.error({ err }, 'Reconciliation failed');
    await addJob('alert', 'reconciliation-error', { error: err.message, priority: 'CRITICAL' });
    throw err;
  }
}

function startCron() {
  cron.schedule('30 20 * * *', async () => {
    await runBatchReconciliation().catch(err => logger.error({ err }, 'Cron error'));
  }, { timezone: 'UTC' });
  logger.info('Cron jobs registered');
}

module.exports = { startCron, runBatchReconciliation };