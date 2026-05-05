require('dotenv').config();

const { connectQueues } = require('./queues');
const { startCron } = require('./cron');
const Redis = require('ioredis');
const { logger } = require('./services/logger');
const { createApp } = require('./app');
const PORT = process.env.PORT || 5000;
const app = createApp();

function validateCriticalEnv() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
  ];
  const missing = required.filter((key) => !(process.env[key] || '').toString().trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const placeholderTokens = ['your_', 'set_a_long_random', 'example.com', 'placeholder'];
  const placeholderRisk = [];
  for (const [key, rawValue] of Object.entries(process.env)) {
    if (!key.startsWith('RAZORPAY_') && !key.startsWith('JWT_') && !key.startsWith('SUPABASE_')) continue;
    const value = (rawValue || '').toString().toLowerCase();
    if (!value) continue;
    if (placeholderTokens.some((token) => value.includes(token))) {
      placeholderRisk.push(key);
    }
  }

  if (placeholderRisk.length > 0) {
    const msg = `Potential placeholder values detected: ${placeholderRisk.join(', ')}`;
    if ((process.env.NODE_ENV || 'development') === 'production') {
      throw new Error(msg);
    }
    logger.warn({ keys: placeholderRisk }, msg);
  }

  if ((process.env.NODE_ENV || 'development') === 'production' && !(process.env.RAZORPAY_WEBHOOK_SECRET || '').trim()) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET must be set in production');
  }
}

async function startServer() {
  try {
    validateCriticalEnv();
    await connectQueues();

    const redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    let redisReady = false;
    try {
      await redis.connect();
      await redis.ping();
      redisReady = true;
    } catch (err) {
      logger.warn({ err: err.message }, 'Redis unavailable, worker startup skipped');
    } finally {
      redis.disconnect();
    }

    // Start worker only when Redis is reachable.
    if (redisReady) {
      require('./workers/whatsappWorker');
      require('./workers/emailWorker');
      require('./workers/alertWorker');
    }

    startCron();

    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Server running');
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();