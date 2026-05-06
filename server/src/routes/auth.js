'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../services/supabase');
const { logger } = require('../services/logger');
const { writeAuditLog } = require('../services/audit');
const { createRateLimiter } = require('../middleware/rateLimit');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
router.use(createRateLimiter({ windowMs: 60 * 1000, maxHits: 20 }));
const loginAttemptBuckets = new Map();
const loginAttemptWindowMs = Math.max(30 * 1000, Number(process.env.AUTH_LOGIN_ATTEMPT_WINDOW_MS || (15 * 60 * 1000)));
const loginAttemptMaxFailures = Math.max(3, Number(process.env.AUTH_LOGIN_MAX_FAILURES || 6));
const loginAttemptLockoutMs = Math.max(30 * 1000, Number(process.env.AUTH_LOGIN_LOCKOUT_MS || (10 * 60 * 1000)));
const authBruteforceSignalThreshold = Math.max(3, Number(process.env.AUTH_BRUTEFORCE_SIGNAL_THRESHOLD || 4));
const loginAttemptMaxBuckets = Math.max(1000, Number(process.env.AUTH_LOGIN_MAX_BUCKETS || 5000));

function normalizeEmail(value) {
  return (value || '').toString().trim().toLowerCase();
}

function normalizePhone(value) {
  const digits = (value || '').toString().replace(/\D/g, '');
  if (!digits) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function isValidIndianMobile(value) {
  return /^[6-9]\d{9}$/.test(normalizePhone(value));
}

function makeAttemptKey({ ip, role, identifier }) {
  return `${ip || 'unknown'}|${(role || '').toString().toLowerCase()}|${(identifier || '').toString().toLowerCase()}`;
}

function pruneLoginAttemptBuckets(now) {
  if (loginAttemptBuckets.size < loginAttemptMaxBuckets) {
    return;
  }
  for (const [key, value] of loginAttemptBuckets.entries()) {
    const expired = now > value.expiresAt;
    const unlocked = !value.lockUntil || now > value.lockUntil;
    if (expired && unlocked) {
      loginAttemptBuckets.delete(key);
    }
  }
}

function getAttemptRecord(key, now) {
  pruneLoginAttemptBuckets(now);
  const current = loginAttemptBuckets.get(key);
  if (!current || now > current.expiresAt) {
    return { failures: 0, expiresAt: now + loginAttemptWindowMs, lockUntil: 0, alerted: false };
  }
  return current;
}

function markLoginFailure(key, now) {
  const current = getAttemptRecord(key, now);
  const next = {
    failures: current.failures + 1,
    expiresAt: now + loginAttemptWindowMs,
    lockUntil: current.lockUntil || 0,
    alerted: current.alerted || false,
  };
  if (next.failures >= loginAttemptMaxFailures) {
    next.lockUntil = now + loginAttemptLockoutMs;
  }
  loginAttemptBuckets.set(key, next);
  return next;
}

function clearLoginFailures(key) {
  loginAttemptBuckets.delete(key);
}

async function writeFailedLoginAudit({ reason, role, identifier, ip, userId }) {
  await writeAuditLog({
    actorId: userId || null,
    actorRole: role || null,
    action: 'security.auth_login_failed',
    entityType: 'auth_login',
    entityId: identifier || null,
    metadata: {
      reason,
      role: role || null,
      identifier: identifier || null,
      ip: ip || null,
    },
  });
}

async function maybeWriteBruteforceSignal({ attempts, role, identifier, ip }) {
  if (attempts.failures < authBruteforceSignalThreshold || attempts.alerted) {
    return attempts;
  }
  await writeAuditLog({
    actorId: null,
    actorRole: role || null,
    action: 'security.auth_bruteforce_detected',
    entityType: 'auth_login',
    entityId: identifier || null,
    metadata: {
      severity: 'HIGH',
      role: role || null,
      identifier: identifier || null,
      ip: ip || null,
      failures: attempts.failures,
      windowMs: loginAttemptWindowMs,
      lockoutMs: loginAttemptLockoutMs,
    },
  });
  const upgraded = { ...attempts, alerted: true };
  const attemptKey = makeAttemptKey({ ip, role, identifier });
  loginAttemptBuckets.set(attemptKey, upgraded);
  return upgraded;
}

router.post('/login', async (req, res) => {
  const { email, phone, password, role } = req.body || {};
  if (!password || !role) {
    return res.status(400).json({ error: 'password and role are required' });
  }
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    return res.status(503).json({ error: 'JWT secrets are not configured' });
  }

  try {
    const normalizedRole = (role || '').toString().trim().toLowerCase();
    const loginByPhone = ['client', 'owner', 'operator'].includes(normalizedRole);
    const identifier = loginByPhone ? normalizePhone(phone) : normalizeEmail(email);
    if (!identifier) {
      return res.status(400).json({
        error: loginByPhone ? 'mobile number is required' : 'email is required',
      });
    }
    const clientIp = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() || req.ip || 'unknown';
    const attemptKey = makeAttemptKey({ ip: clientIp, role: normalizedRole, identifier });
    const now = Date.now();
    const attempts = getAttemptRecord(attemptKey, now);
    if (attempts.lockUntil && now < attempts.lockUntil) {
      const retryAfter = Math.ceil((attempts.lockUntil - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      await writeFailedLoginAudit({
        reason: 'lockout_active',
        role: normalizedRole,
        identifier,
        ip: clientIp,
      });
      return res.status(429).json({ error: 'Too many failed login attempts. Please try again later.' });
    }

    let user = null;
    let error = null;

    if (loginByPhone) {
      const result = await supabase
        .from('users')
        .select('id, name, email, role, status, phone, password_hash')
        .eq('role', normalizedRole);

      error = result.error;
      user = (result.data || []).find((candidate) => normalizePhone(candidate.phone) === identifier) || null;
    } else {
      const result = await supabase
        .from('users')
        .select('id, name, email, role, status, phone, password_hash')
        .eq('email', identifier)
        .eq('role', normalizedRole)
        .single();
      error = result.error;
      user = result.data;
    }

    if (error || !user || !user.password_hash) {
      const attemptsAfterFailure = markLoginFailure(attemptKey, now);
      await maybeWriteBruteforceSignal({
        attempts: attemptsAfterFailure,
        role: normalizedRole,
        identifier,
        ip: clientIp,
      });
      await writeFailedLoginAudit({
        reason: 'user_not_found',
        role: normalizedRole,
        identifier,
        ip: clientIp,
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let passwordValid = false;
    if (user.password_hash.startsWith('$2')) {
      passwordValid = await bcrypt.compare(password, user.password_hash);
    } else {
      // Temporary compatibility for legacy plaintext rows.
      passwordValid = password === user.password_hash;
      if (passwordValid) {
        const upgradedHash = await bcrypt.hash(password, 12);
        await supabase.from('users').update({ password_hash: upgradedHash }).eq('id', user.id);
      }
    }

    if (!passwordValid) {
      const attemptsAfterFailure = markLoginFailure(attemptKey, now);
      await maybeWriteBruteforceSignal({
        attempts: attemptsAfterFailure,
        role: normalizedRole,
        identifier,
        ip: clientIp,
      });
      await writeFailedLoginAudit({
        reason: 'password_mismatch',
        role: normalizedRole,
        identifier,
        ip: clientIp,
        userId: user.id,
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.status && user.status !== 'active') {
      const attemptsAfterFailure = markLoginFailure(attemptKey, now);
      await maybeWriteBruteforceSignal({
        attempts: attemptsAfterFailure,
        role: normalizedRole,
        identifier,
        ip: clientIp,
      });
      await writeFailedLoginAudit({
        reason: 'user_inactive',
        role: normalizedRole,
        identifier,
        ip: clientIp,
        userId: user.id,
      });
      return res.status(403).json({ error: 'User is not active' });
    }
    clearLoginFailures(attemptKey);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tokenType: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' },
    );
    const refreshToken = jwt.sign(
      { id: user.id, role: user.role, tokenType: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' },
    );

    return res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status || 'active',
        phone: user.phone,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Auth login failed');
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/register', async (req, res) => {
  const { name, company, email, phone, gstin, password } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  const normalizedGstin = (gstin || '').toString().trim().toUpperCase();
  const trimmedName = (name || '').toString().trim();
  const trimmedCompany = (company || '').toString().trim();
  const trimmedPassword = (password || '').toString();

  if (!trimmedName || !trimmedCompany || !normalizedEmail || !normalizedPhone || !trimmedPassword) {
    return res.status(400).json({ error: 'name, company, email, phone and password are required' });
  }
  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }
  if (!isValidIndianMobile(normalizedPhone)) {
    return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
  }
  if (trimmedPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }
  if (normalizedGstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d$/.test(normalizedGstin)) {
    return res.status(400).json({ error: 'Enter a valid GSTIN or leave it blank' });
  }

  try {
    const { data: existingUsers, error: existingError } = await supabase
      .from('users')
      .select('id, email, phone');
    if (existingError) {
      throw existingError;
    }

    const hasDuplicate = (existingUsers || []).some((candidate) =>
      normalizeEmail(candidate.email) === normalizedEmail || normalizePhone(candidate.phone) === normalizedPhone);
    if (hasDuplicate) {
      return res.status(409).json({ error: 'An account with this email or mobile number already exists' });
    }

    const passwordHash = await bcrypt.hash(trimmedPassword, 12);
    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .insert({
        name: trimmedName,
        company: trimmedCompany,
        email: normalizedEmail,
        phone: normalizedPhone,
        gstin: normalizedGstin || null,
        role: 'client',
        status: 'pending',
        password_hash: passwordHash,
      })
      .select('id, name, email, phone, role, status')
      .single();

    if (createError) {
      throw createError;
    }

    return res.status(201).json({
      message: 'Registration submitted successfully. Admin approval is pending.',
      user: createdUser,
    });
  } catch (err) {
    logger.error({ err }, 'Client registration failed');
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });
  if (!process.env.JWT_REFRESH_SECRET || !process.env.JWT_SECRET) {
    return res.status(503).json({ error: 'JWT secrets are not configured' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    if (decoded?.tokenType !== 'refresh') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, status')
      .eq('id', decoded.id)
      .single();
    if (error || !user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid refresh session' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tokenType: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' },
    );
    return res.json({ token });
  } catch (_err) {
    return res.status(401).json({ error: 'Refresh token expired or invalid' });
  }
});

router.get('/me', requireAuth(), async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, role, status, phone')
    .eq('id', req.user.id)
    .single();
  if (error || !user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user });
});

module.exports = router;
