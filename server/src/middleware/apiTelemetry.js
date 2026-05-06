'use strict';

const WINDOW_MS = Math.max(60 * 1000, Number(process.env.API_TELEMETRY_WINDOW_MS || (10 * 60 * 1000)));
const MAX_POINTS = Math.max(200, Number(process.env.API_TELEMETRY_MAX_POINTS || 2000));
const SLO_P95_MS = Math.max(50, Number(process.env.API_SLO_P95_MS || 1200));
const SLO_ERROR_RATE_PCT = Math.max(1, Number(process.env.API_SLO_ERROR_RATE_PCT || 2));

const events = [];
const byRoute = new Map();

function nowMs() {
  return Date.now();
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function trimOld() {
  const threshold = nowMs() - WINDOW_MS;
  while (events.length > 0 && events[0].ts < threshold) events.shift();
  if (events.length > MAX_POINTS) events.splice(0, events.length - MAX_POINTS);
}

function routeKey(req) {
  return `${req.baseUrl || ''}${req.path || ''}` || 'unknown';
}

function apiTelemetryMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    events.push({
      ts: nowMs(),
      route: routeKey(req),
      method: req.method,
      status: res.statusCode,
      durationMs,
      ok: res.statusCode < 500,
    });
    trimOld();
  });
  next();
}

function getApiTelemetry() {
  trimOld();
  byRoute.clear();
  let errors = 0;
  for (const e of events) {
    if (e.status >= 500) errors += 1;
    if (!byRoute.has(e.route)) byRoute.set(e.route, []);
    byRoute.get(e.route).push(e);
  }
  const durations = events.map((x) => x.durationMs);
  const total = events.length;
  const errorRatePct = total > 0 ? Number(((errors / total) * 100).toFixed(2)) : 0;
  const p95Ms = Math.round(percentile(durations, 95));
  const p99Ms = Math.round(percentile(durations, 99));
  const byRouteSummary = Array.from(byRoute.entries()).map(([route, rows]) => {
    const routeDurations = rows.map((x) => x.durationMs);
    const routeErrors = rows.filter((x) => x.status >= 500).length;
    return {
      route,
      count: rows.length,
      p95Ms: Math.round(percentile(routeDurations, 95)),
      errorRatePct: rows.length > 0 ? Number(((routeErrors / rows.length) * 100).toFixed(2)) : 0,
    };
  }).sort((a, b) => b.count - a.count).slice(0, 10);

  return {
    windowMs: WINDOW_MS,
    totalRequests: total,
    errors5xx: errors,
    errorRatePct,
    p95Ms,
    p99Ms,
    slo: {
      p95MsThreshold: SLO_P95_MS,
      errorRatePctThreshold: SLO_ERROR_RATE_PCT,
      p95Healthy: p95Ms <= SLO_P95_MS,
      errorRateHealthy: errorRatePct <= SLO_ERROR_RATE_PCT,
    },
    byRoute: byRouteSummary,
  };
}

module.exports = { apiTelemetryMiddleware, getApiTelemetry };
