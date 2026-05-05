'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRateLimiter, getRateLimitTelemetry } = require('../src/middleware/rateLimit');

function makeReq(path = '/api/admin/audit-logs') {
  return {
    ip: '127.0.0.1',
    baseUrl: '/api/admin',
    path,
    socket: { remoteAddress: '127.0.0.1' },
  };
}

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('rate limiter allows first hit and records telemetry', () => {
  const limiter = createRateLimiter({ windowMs: 5000, maxHits: 2 });
  const req = makeReq('/audit-logs');
  const res = makeRes();
  let calledNext = 0;

  limiter(req, res, () => { calledNext += 1; });

  assert.equal(calledNext, 1);
  const telemetry = getRateLimitTelemetry();
  assert.ok(telemetry.allowed >= 1);
  assert.ok(Array.isArray(telemetry.byRoute));
  assert.ok(typeof telemetry.blockedRatePct === 'number');
});

test('rate limiter blocks requests beyond threshold', () => {
  const limiter = createRateLimiter({ windowMs: 5000, maxHits: 1 });
  const req = makeReq('/dlq');
  const res = makeRes();
  let calledNext = 0;

  limiter(req, res, () => { calledNext += 1; });
  limiter(req, res, () => { calledNext += 1; });

  assert.equal(calledNext, 1);
  assert.equal(res.statusCode, 429);
  assert.deepEqual(res.body, { error: 'Too many requests' });
  assert.ok(Number(res.headers['Retry-After']) >= 0);
});
