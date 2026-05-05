'use strict';
const express  = require('express');
const { supabase } = require('../services/supabase');
const { addJob }   = require('../queues');
const { logger }   = require('../services/logger');
const { requireAdminKey } = require('../middleware/requireAdminKey');

const router = express.Router();
router.use(requireAdminKey);

router.get('/dlq', async (_req, res) => {
  const { data, error } = await supabase.from('dead_letter_queue').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ count: data.length, items: data });
});

router.post('/dlq/:id/retry', async (req, res) => {
  const { data: job, error } = await supabase.from('dead_letter_queue').select('*').eq('id', req.params.id).single();
  if (error || !job) return res.status(404).json({ error: 'DLQ job not found' });
  try {
    await addJob(job.queue_name, job.job_name, job.payload);
    await supabase.from('dead_letter_queue').insert({ ...job, id: undefined, status: 'retried', retried_at: new Date().toISOString(), original_id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'DLQ retry failed');
    res.status(500).json({ error: 'Retry failed' });
  }
});

module.exports = router;