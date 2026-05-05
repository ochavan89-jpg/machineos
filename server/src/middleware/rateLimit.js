'use strict';

const buckets = new Map();
const telemetry = {
  allowed: 0,
  blocked: 0,
  byRoute: new Map(),
};
const blockedRateAlertThreshold = Math.max(1, Number(process.env.SECURITY_BLOCKED_RATE_ALERT_THRESHOLD || 15));

function _routeKey(req) {
  return `${req.baseUrl || ''}${req.path || ''}` || 'unknown';
}

function _markAllowed(req) {
  telemetry.allowed += 1;
  const key = _routeKey(req);
  telemetry.byRoute.set(key, (telemetry.byRoute.get(key) || 0) + 1);
}

function _markBlocked(req) {
  telemetry.blocked += 1;
  const key = `blocked:${_routeKey(req)}`;
  telemetry.byRoute.set(key, (telemetry.byRoute.get(key) || 0) + 1);
}

function createRateLimiter({ windowMs, maxHits }) {
  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.baseUrl || ''}:${req.path || ''}`;
    const item = buckets.get(key);

    if (!item || now > item.expiresAt) {
      buckets.set(key, { count: 1, expiresAt: now + windowMs });
      _markAllowed(req);
      return next();
    }

    if (item.count >= maxHits) {
      const retryAfter = Math.ceil((item.expiresAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      _markBlocked(req);
      return res.status(429).json({ error: 'Too many requests' });
    }

    item.count += 1;
    _markAllowed(req);
    return next();
  };
}

function getRateLimitTelemetry() {
  const total = telemetry.allowed + telemetry.blocked;
  const blockedRatePct = total > 0 ? Math.round((telemetry.blocked / total) * 100) : 0;
  return {
    allowed: telemetry.allowed,
    blocked: telemetry.blocked,
    blockedRatePct,
    blockedRateAlertThreshold,
    byRoute: Array.from(telemetry.byRoute.entries()).map(([route, count]) => ({ route, count })),
    activeBuckets: buckets.size,
  };
}

module.exports = { createRateLimiter, getRateLimitTelemetry };
