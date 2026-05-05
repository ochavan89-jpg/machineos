'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../services/supabase');
const { logger } = require('../services/logger');
const { createRateLimiter } = require('../middleware/rateLimit');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
router.use(createRateLimiter({ windowMs: 60 * 1000, maxHits: 20 }));

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body || {};
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'email, password and role are required' });
  }
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    return res.status(503).json({ error: 'JWT secrets are not configured' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, status, phone, password_hash')
      .eq('email', email)
      .eq('role', role)
      .single();

    if (error || !user || !user.password_hash) {
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
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.status && user.status !== 'active') {
      return res.status(403).json({ error: 'User is not active' });
    }

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
