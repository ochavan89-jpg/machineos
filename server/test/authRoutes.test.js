'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret';
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';

function createUsersChain(users, insertedUsers) {
  const state = {
    role: null,
    email: null,
    single: false,
    insertPayload: null,
  };

  return {
    select() {
      return this;
    },
    eq(field, value) {
      state[field] = value;
      return this;
    },
    single() {
      if (state.insertPayload) {
        const created = {
          id: `user-${insertedUsers.length + 1}`,
          name: state.insertPayload.name,
          email: state.insertPayload.email,
          phone: state.insertPayload.phone,
          role: state.insertPayload.role,
          status: state.insertPayload.status,
        };
        insertedUsers.push(state.insertPayload);
        return Promise.resolve({ data: created, error: null });
      }

      const matched = users.find((u) => {
        const roleOk = state.role ? u.role === state.role : true;
        const emailOk = state.email ? u.email === state.email : true;
        return roleOk && emailOk;
      });
      if (!matched) return Promise.resolve({ data: null, error: { message: 'not found' } });
      return Promise.resolve({ data: matched, error: null });
    },
    then(resolve, reject) {
      const filtered = users.filter((u) => {
        const roleOk = state.role ? u.role === state.role : true;
        const emailOk = state.email ? u.email === state.email : true;
        return roleOk && emailOk;
      });
      return Promise.resolve({ data: filtered, error: null }).then(resolve, reject);
    },
    insert(payload) {
      state.insertPayload = payload;
      return this;
    },
  };
}

function makeSupabaseMock(initialUsers = []) {
  const users = initialUsers.map((u) => ({ ...u }));
  const insertedUsers = [];
  return {
    insertedUsers,
    from(table) {
      if (table === 'users') return createUsersChain(users, insertedUsers);
      return {
        select() { return this; },
        eq() { return this; },
        single: async () => ({ data: null, error: { message: 'not found' } }),
      };
    },
  };
}

async function bootAppWithMock(supabaseMock) {
  const supabaseModulePath = require.resolve('../src/services/supabase');
  const appModulePath = require.resolve('../src/app');
  const auditModulePath = require.resolve('../src/services/audit');
  const auditCalls = [];
  Object.keys(require.cache).forEach((key) => {
    if (key.includes('\\src\\routes\\') || key.includes('/src/routes/')) {
      delete require.cache[key];
    }
  });
  delete require.cache[supabaseModulePath];
  delete require.cache[appModulePath];
  delete require.cache[auditModulePath];
  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: { supabase: supabaseMock },
  };
  require.cache[auditModulePath] = {
    id: auditModulePath,
    filename: auditModulePath,
    loaded: true,
    exports: {
      writeAuditLog: async (payload) => {
        auditCalls.push(payload);
      },
    },
  };
  const { createApp } = require('../src/app');
  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { server, baseUrl, auditCalls };
}

async function postJson(baseUrl, path, payload) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const body = await response.json();
  return { status: response.status, body };
}

test('client login requires mobile number', async () => {
  const supabaseMock = makeSupabaseMock([]);
  const { server, baseUrl } = await bootAppWithMock(supabaseMock);
  try {
    const res = await postJson(baseUrl, '/api/auth/login', { role: 'client', password: 'secret123' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'mobile number is required');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('admin login requires email', async () => {
  const supabaseMock = makeSupabaseMock([]);
  const { server, baseUrl } = await bootAppWithMock(supabaseMock);
  try {
    const res = await postJson(baseUrl, '/api/auth/login', { role: 'admin', password: 'secret123' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'email is required');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('register rejects invalid mobile format', async () => {
  const supabaseMock = makeSupabaseMock([]);
  const { server, baseUrl } = await bootAppWithMock(supabaseMock);
  try {
    const res = await postJson(baseUrl, '/api/auth/register', {
      name: 'Test User',
      company: 'DE Infra',
      email: 'test@example.com',
      phone: '12345',
      password: 'StrongPass123',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Enter a valid 10-digit mobile number');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('register creates pending client with hashed password', async () => {
  const supabaseMock = makeSupabaseMock([]);
  const { server, baseUrl } = await bootAppWithMock(supabaseMock);
  try {
    const res = await postJson(baseUrl, '/api/auth/register', {
      name: 'Test User',
      company: 'DE Infra',
      email: 'test@example.com',
      phone: '9876543210',
      gstin: '27ABCDE1234F1Z5',
      password: 'StrongPass123',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'client');
    assert.equal(res.body.user.status, 'pending');
    assert.equal(supabaseMock.insertedUsers.length, 1);
    assert.equal(supabaseMock.insertedUsers[0].password_hash.startsWith('$2'), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('login locks after repeated failures for same mobile + role', async () => {
  const passwordHash = await bcrypt.hash('CorrectPass123', 10);
  const supabaseMock = makeSupabaseMock([
    {
      id: 'u-1',
      name: 'Owner One',
      email: 'owner@example.com',
      role: 'owner',
      status: 'active',
      phone: '9876543210',
      password_hash: passwordHash,
    },
  ]);
  process.env.AUTH_LOGIN_MAX_FAILURES = '3';
  process.env.AUTH_LOGIN_LOCKOUT_MS = '300000';
  process.env.AUTH_LOGIN_ATTEMPT_WINDOW_MS = '300000';
  process.env.AUTH_BRUTEFORCE_SIGNAL_THRESHOLD = '2';
  const { server, baseUrl, auditCalls } = await bootAppWithMock(supabaseMock);
  try {
    const payload = { role: 'owner', phone: '9876543210', password: 'WrongPass123' };
    const one = await postJson(baseUrl, '/api/auth/login', payload);
    const two = await postJson(baseUrl, '/api/auth/login', payload);
    const three = await postJson(baseUrl, '/api/auth/login', payload);
    const four = await postJson(baseUrl, '/api/auth/login', payload);
    assert.equal(one.status, 401);
    assert.equal(two.status, 401);
    assert.equal(three.status, 401);
    assert.equal(four.status, 429);
    assert.equal(four.body.error, 'Too many failed login attempts. Please try again later.');
    assert.equal(auditCalls.length >= 4, true);
    assert.equal(auditCalls[0].action, 'security.auth_login_failed');
    assert.equal(auditCalls[0].metadata.reason, 'password_mismatch');
    assert.equal(auditCalls.some((x) => x.action === 'security.auth_bruteforce_detected'), true);
    assert.equal(auditCalls[auditCalls.length - 1].metadata.reason, 'lockout_active');
  } finally {
    delete process.env.AUTH_LOGIN_MAX_FAILURES;
    delete process.env.AUTH_LOGIN_LOCKOUT_MS;
    delete process.env.AUTH_LOGIN_ATTEMPT_WINDOW_MS;
    delete process.env.AUTH_BRUTEFORCE_SIGNAL_THRESHOLD;
    await new Promise((resolve) => server.close(resolve));
  }
});
