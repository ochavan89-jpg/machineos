'use strict';
const { Queue } = require('bullmq');
const { logger } = require('../services/logger');

const redisConnection = {
  host:     process.env.REDIS_HOST || '127.0.0.1',
  port:     parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  tls:      process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
  retryStrategy: () => null,
};

const QUEUE_CONFIG = {
  pdf:      { retries: 3, backoff: [2000, 4000, 8000] },
  whatsapp: { retries: 3, backoff: [3000, 6000, 12000] },
  email:    { retries: 5, backoff: [5000, 10000, 20000, 40000, 80000] },
  alert:    { retries: 1, backoff: [] },
};

const queues = {};

async function connectQueues() {
  for (const name of Object.keys(QUEUE_CONFIG)) {
    try {
      queues[name] = new Queue(name, { connection: redisConnection, defaultJobOptions: { removeOnComplete: { count: 100 }, removeOnFail: { count: 200 } } });
      await Promise.race([
        queues[name].waitUntilReady(),
        _timeoutAfter(1000, `Queue ${name} init timeout`),
      ]);
      logger.info({ queue: name }, 'Queue connected');
    } catch (err) {
      logger.warn({ queue: name, err: err.message }, 'Queue unavailable - using mock');
      queues[name] = _mockQueue(name);
    }
  }
}

async function addJob(queueName, jobName, data, opts = {}) {
  const cfg = QUEUE_CONFIG[queueName];
  if (!cfg) throw new Error(`Unknown queue: ${queueName}`);
  try {
    return await queues[queueName].add(jobName, data, {
      attempts: cfg.retries + 1,
      backoff: cfg.backoff.length ? { type: 'custom', delays: cfg.backoff } : undefined,
      ...opts,
    });
  } catch (err) {
    logger.warn({ queue: queueName, err: err.message }, 'Queue add failed - switching to mock');
    queues[queueName] = _mockQueue(queueName);
    return queues[queueName].add(jobName, data, opts);
  }
}

function _mockQueue(name) {
  return {
    add: async (jobName, data) => { logger.info({ queue: name, jobName, data }, '[MockQueue] Job added'); return { id: `mock-${Date.now()}` }; },
    waitUntilReady: async () => {},
  };
}

function _timeoutAfter(ms, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

module.exports = { connectQueues, addJob, queues };