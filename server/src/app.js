const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const bookingsRoutes = require('./routes/bookings');
const ownerRoutes = require('./routes/owner');
const operatorRoutes = require('./routes/operator');
const notificationsRoutes = require('./routes/notifications');
const walletRoutes = require('./routes/wallet');
const webhookRoutes = require('./routes/webhook');
const dlqRoutes = require('./routes/dlq');
const { apiTelemetryMiddleware } = require('./middleware/apiTelemetry');

function createApp() {
  const app = express();
  const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOriginSuffixes = (process.env.CORS_ALLOWED_ORIGIN_SUFFIXES || '')
    .split(',')
    .map((suffix) => suffix.trim().toLowerCase())
    .filter(Boolean);
  const isAllowedBySuffix = (origin) => {
    try {
      const hostname = new URL(origin).hostname.toLowerCase();
      return allowedOriginSuffixes.some((suffix) => hostname.endsWith(suffix));
    } catch (_err) {
      return false;
    }
  };

  app.use(cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || isAllowedBySuffix(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'x-razorpay-signature', 'x-razorpay-event-id'],
  }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use('/api/webhook/razorpay', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '100kb' }));
  app.use(apiTelemetryMiddleware);

  app.get('/', (_req, res) => {
    res.json({
      message: 'MachineOS server is running',
      status: 'OK',
    });
  });

  app.use('/api/wallet', walletRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/bookings', bookingsRoutes);
  app.use('/api/owner', ownerRoutes);
  app.use('/api/operator', operatorRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/webhook', webhookRoutes);
  app.use('/api', dlqRoutes);

  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy' });
  });

  return app;
}

module.exports = { createApp };
