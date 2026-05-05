'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret';
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';

const queueCalls = [];

function resetQueueCalls() {
  queueCalls.length = 0;
}

function makeSupabaseMock({ signalAction = 'security.admin_retry_burst', existingAck = null, dlqJob = null } = {}) {
  return {
    from(table) {
      if (table === 'dead_letter_queue') {
        let filterId = null;
        return {
          select() { return this; },
          eq(column, value) {
            if (column === 'id') filterId = value;
            return this;
          },
          single: async () => {
            if (!dlqJob || String(dlqJob.id) !== String(filterId)) return { data: null, error: { message: 'not found' } };
            return { data: dlqJob, error: null };
          },
          update() {
            return {
              eq: async () => ({ error: null }),
            };
          },
          order() { return this; },
          limit: async () => ({ data: [], error: null }),
        };
      }

      if (table !== 'audit_logs') {
        return {
          select() { return this; },
          eq() { return this; },
          order() { return this; },
          limit: async () => ({ data: [], error: null }),
          insert: async () => ({ error: null }),
        };
      }

      let context = {};
      const chain = {
        select() { return chain; },
        eq(column, value) {
          context[column] = value;
          return chain;
        },
        order() { return chain; },
        limit: async () => {
          if (context.action === 'security.signal_acknowledged' && context.entity_type === 'security_signal') {
            return { data: existingAck ? [existingAck] : [], error: null };
          }
          return { data: [], error: null };
        },
        single: async () => {
          if (context.id) {
            return {
              data: { id: Number(context.id), action: signalAction, metadata: { severity: 'HIGH' } },
              error: null,
            };
          }
          return { data: null, error: null };
        },
        insert: async () => ({ error: null }),
      };
      return chain;
    },
  };
}

async function bootAppWithMock(supabaseMock) {
  const supabaseModulePath = require.resolve('../src/services/supabase');
  const appModulePath = require.resolve('../src/app');
  const queuesModulePath = require.resolve('../src/queues');
  Object.keys(require.cache).forEach((key) => {
    if (key.includes('\\src\\routes\\') || key.includes('/src/routes/')) {
      delete require.cache[key];
    }
    if (key.includes('\\src\\services\\audit') || key.includes('/src/services/audit')) {
      delete require.cache[key];
    }
  });
  delete require.cache[supabaseModulePath];
  delete require.cache[appModulePath];
  delete require.cache[queuesModulePath];
  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: { supabase: supabaseMock },
  };
  require.cache[queuesModulePath] = {
    id: queuesModulePath,
    filename: queuesModulePath,
    loaded: true,
    exports: {
      addJob: async (queueName, jobName, data) => {
        queueCalls.push({ queueName, jobName, data });
        return { id: 'mock-job-1' };
      },
    },
  };
  const { createApp } = require('../src/app');
  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { server, baseUrl };
}

function adminToken() {
  return jwt.sign({ id: 'admin-1', role: 'admin', tokenType: 'access' }, process.env.JWT_SECRET);
}

async function jsonRequest(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${adminToken()}`,
    },
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function rawRequest(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  return { status: response.status, body };
}

async function postJson(baseUrl, path, body, token = adminToken()) {
  return rawRequest(baseUrl, path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });
}

test('admin dlq endpoint rejects unsupported query parameter', async () => {
  const { server, baseUrl } = await bootAppWithMock(makeSupabaseMock());
  try {
    const result = await jsonRequest(baseUrl, '/api/admin/dlq?unknown=1');
    assert.equal(result.status, 400);
    assert.equal(result.body.error, 'Unsupported query parameter');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('admin endpoints reject missing auth token', async () => {
  const { server, baseUrl } = await bootAppWithMock(makeSupabaseMock());
  try {
    const result = await rawRequest(baseUrl, '/api/admin/dlq');
    assert.equal(result.status, 401);
    assert.equal(result.body.error, 'Missing auth token');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('admin endpoints reject non-admin role token', async () => {
  const { server, baseUrl } = await bootAppWithMock(makeSupabaseMock());
  const ownerToken = jwt.sign({ id: 'owner-1', role: 'owner', tokenType: 'access' }, process.env.JWT_SECRET);
  try {
    const result = await rawRequest(baseUrl, '/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(result.status, 403);
    assert.equal(result.body.error, 'Forbidden');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('admin endpoints reject refresh token type on access routes', async () => {
  const { server, baseUrl } = await bootAppWithMock(makeSupabaseMock());
  const refreshTypeToken = jwt.sign({ id: 'admin-1', role: 'admin', tokenType: 'refresh' }, process.env.JWT_SECRET);
  try {
    const result = await rawRequest(baseUrl, '/api/admin/dlq', {
      headers: { Authorization: `Bearer ${refreshTypeToken}` },
    });
    assert.equal(result.status, 401);
    assert.equal(result.body.error, 'Invalid token type');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('security signal ack endpoint returns already acknowledged metadata', async () => {
  const existingAck = {
    id: 55,
    actor_id: 'admin-9',
    created_at: '2026-05-05T08:30:00.000Z',
  };
  const { server, baseUrl } = await bootAppWithMock(makeSupabaseMock({ existingAck }));
  try {
    const response = await fetch(`${baseUrl}/api/admin/security-signals/100/ack`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken()}`,
      },
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.alreadyAcknowledged, true);
    assert.equal(body.acknowledgedBy, 'admin-9');
    assert.equal(body.acknowledgedAt, '2026-05-05T08:30:00.000Z');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('dlq retry rejects too-short reason', async () => {
  resetQueueCalls();
  const dlqJob = { id: 201, status: 'failed', attempts: 1, queue_name: 'email', job_name: 'custom-email', payload: { a: 1 } };
  const { server, baseUrl } = await bootAppWithMock(makeSupabaseMock({ dlqJob }));
  try {
    const result = await postJson(baseUrl, '/api/admin/dlq/201/retry', { reason: 'short' });
    assert.equal(result.status, 400);
    assert.equal(result.body.error, 'Retry reason must be at least 8 characters');
    assert.equal(queueCalls.length, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('dlq retry rejects non-failed jobs', async () => {
  resetQueueCalls();
  const dlqJob = { id: 202, status: 'retried', attempts: 1, queue_name: 'email', job_name: 'custom-email', payload: { a: 1 } };
  const { server, baseUrl } = await bootAppWithMock(makeSupabaseMock({ dlqJob }));
  try {
    const result = await postJson(baseUrl, '/api/admin/dlq/202/retry', { reason: 'retry for verification' });
    assert.equal(result.status, 400);
    assert.equal(result.body.error, 'Only failed jobs can be retried');
    assert.equal(queueCalls.length, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('dlq retry enforces max attempt guard', async () => {
  resetQueueCalls();
  const dlqJob = { id: 203, status: 'failed', attempts: 15, queue_name: 'email', job_name: 'custom-email', payload: { a: 1 } };
  const { server, baseUrl } = await bootAppWithMock(makeSupabaseMock({ dlqJob }));
  try {
    const result = await postJson(baseUrl, '/api/admin/dlq/203/retry', { reason: 'retry for verification' });
    assert.equal(result.status, 400);
    assert.equal(result.body.error, 'Retry blocked: max attempts exceeded');
    assert.equal(queueCalls.length, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('dlq retry succeeds for failed job with valid reason', async () => {
  resetQueueCalls();
  const dlqJob = { id: 204, status: 'failed', attempts: 2, queue_name: 'email', job_name: 'custom-email', payload: { to: 'a@b.com' } };
  const { server, baseUrl } = await bootAppWithMock(makeSupabaseMock({ dlqJob }));
  try {
    const result = await postJson(baseUrl, '/api/admin/dlq/204/retry', { reason: 'manual retry due to transient edge timeout' });
    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(queueCalls.length, 1);
    assert.equal(queueCalls[0].queueName, 'email');
    assert.equal(queueCalls[0].jobName, 'custom-email');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('audit logs rejects invalid actorRole filter', async () => {
  resetQueueCalls();
  const { server, baseUrl } = await bootAppWithMock(makeSupabaseMock());
  try {
    const result = await jsonRequest(baseUrl, '/api/admin/audit-logs?actorRole=superadmin');
    assert.equal(result.status, 400);
    assert.equal(result.body.error, 'Invalid actorRole filter');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('audit logs rejects invalid date range (from > to)', async () => {
  resetQueueCalls();
  const { server, baseUrl } = await bootAppWithMock(makeSupabaseMock());
  try {
    const result = await jsonRequest(baseUrl, '/api/admin/audit-logs?from=2026-05-05T12:00:00.000Z&to=2026-05-01T12:00:00.000Z');
    assert.equal(result.status, 400);
    assert.equal(result.body.error, 'Invalid range: from must be before to');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('audit logs rejects malformed cursor token', async () => {
  resetQueueCalls();
  const { server, baseUrl } = await bootAppWithMock(makeSupabaseMock());
  try {
    const result = await jsonRequest(baseUrl, '/api/admin/audit-logs?cursor=bad-token');
    assert.equal(result.status, 400);
    assert.equal(result.body.error, 'Invalid from/to date. Use ISO date format.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('audit logs rejects range beyond 92 days', async () => {
  resetQueueCalls();
  const { server, baseUrl } = await bootAppWithMock(makeSupabaseMock());
  try {
    const result = await jsonRequest(baseUrl, '/api/admin/audit-logs?from=2026-01-01T00:00:00.000Z&to=2026-05-01T00:00:00.000Z');
    assert.equal(result.status, 400);
    assert.equal(result.body.error, 'Date range too large. Max allowed is 92 days.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('audit logs rejects non-positive limit', async () => {
  resetQueueCalls();
  const { server, baseUrl } = await bootAppWithMock(makeSupabaseMock());
  try {
    const result = await jsonRequest(baseUrl, '/api/admin/audit-logs?limit=0');
    assert.equal(result.status, 400);
    assert.equal(result.body.error, 'Invalid limit value');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('audit logs rejects non-numeric limit', async () => {
  resetQueueCalls();
  const { server, baseUrl } = await bootAppWithMock(makeSupabaseMock());
  try {
    const result = await jsonRequest(baseUrl, '/api/admin/audit-logs?limit=abc');
    assert.equal(result.status, 400);
    assert.equal(result.body.error, 'Invalid limit value');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
