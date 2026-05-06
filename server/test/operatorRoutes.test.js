'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret';
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';

function createQueryChain(rows = []) {
  const state = {
    operatorId: null,
    start: 0,
    end: rows.length - 1,
  };
  return {
    select() { return this; },
    eq(column, value) {
      if (column === 'operator_id') state.operatorId = value;
      return this;
    },
    order() { return this; },
    range(start, end) {
      state.start = start;
      state.end = end;
      return this;
    },
    then(resolve, reject) {
      const filtered = rows.filter((row) => !state.operatorId || row.operator_id === state.operatorId);
      const sliced = filtered.slice(state.start, state.end + 1);
      return Promise.resolve({ data: sliced, error: null }).then(resolve, reject);
    },
  };
}

function makeSupabaseMock({ attendanceRows = [], fuelRows = [] } = {}) {
  return {
    from(table) {
      if (table === 'attendance') return createQueryChain(attendanceRows);
      if (table === 'fuel_logs') return createQueryChain(fuelRows);
      return {
        select() { return this; },
        eq() { return this; },
        order() { return this; },
        range() { return this; },
        then(resolve, reject) {
          return Promise.resolve({ data: [], error: null }).then(resolve, reject);
        },
      };
    },
  };
}

async function bootAppWithMock(supabaseMock) {
  const supabaseModulePath = require.resolve('../src/services/supabase');
  const appModulePath = require.resolve('../src/app');
  Object.keys(require.cache).forEach((key) => {
    if (key.includes('\\src\\routes\\') || key.includes('/src/routes/')) {
      delete require.cache[key];
    }
  });
  delete require.cache[supabaseModulePath];
  delete require.cache[appModulePath];
  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: { supabase: supabaseMock },
  };
  const { createApp } = require('../src/app');
  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { server, baseUrl };
}

function operatorToken(id = 'operator-1') {
  return jwt.sign({ id, role: 'operator', tokenType: 'access' }, process.env.JWT_SECRET);
}

async function getJson(baseUrl, path, token = operatorToken()) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const body = await response.json();
  return { status: response.status, body };
}

test('operator attendance endpoint returns paginated metadata', async () => {
  const attendanceRows = Array.from({ length: 35 }).map((_, idx) => ({
    id: idx + 1,
    operator_id: 'operator-1',
    date: `2026-05-${String((idx % 28) + 1).padStart(2, '0')}`,
    status: 'present',
  }));
  const { server, baseUrl } = await bootAppWithMock(makeSupabaseMock({ attendanceRows }));
  try {
    const result = await getJson(baseUrl, '/api/operator/attendance?limit=10&offset=0');
    assert.equal(result.status, 200);
    assert.equal(result.body.items.length, 10);
    assert.equal(result.body.hasMore, true);
    assert.equal(result.body.nextOffset, 10);
    assert.equal(result.body.limit, 10);
    assert.equal(result.body.offset, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('operator fuel logs endpoint supports offset progression', async () => {
  const fuelRows = Array.from({ length: 12 }).map((_, idx) => ({
    id: idx + 1,
    operator_id: 'operator-1',
    fuel_level: 80 - idx,
    created_at: new Date(Date.now() - idx * 60000).toISOString(),
  }));
  const { server, baseUrl } = await bootAppWithMock(makeSupabaseMock({ fuelRows }));
  try {
    const firstPage = await getJson(baseUrl, '/api/operator/fuel-logs?limit=5&offset=0');
    assert.equal(firstPage.status, 200);
    assert.equal(firstPage.body.items.length, 5);
    assert.equal(firstPage.body.hasMore, true);
    assert.equal(firstPage.body.nextOffset, 5);

    const secondPage = await getJson(baseUrl, '/api/operator/fuel-logs?limit=5&offset=5');
    assert.equal(secondPage.status, 200);
    assert.equal(secondPage.body.items.length, 5);
    assert.equal(secondPage.body.hasMore, true);
    assert.equal(secondPage.body.nextOffset, 10);

    const thirdPage = await getJson(baseUrl, '/api/operator/fuel-logs?limit=5&offset=10');
    assert.equal(thirdPage.status, 200);
    assert.equal(thirdPage.body.items.length, 2);
    assert.equal(thirdPage.body.hasMore, false);
    assert.equal(thirdPage.body.nextOffset, null);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
