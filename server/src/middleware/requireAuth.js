'use strict';

const jwt = require('jsonwebtoken');

function requireAuth(allowedRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return res.status(401).json({ error: 'Missing auth token' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ error: 'JWT_SECRET is not configured' });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload?.tokenType && payload.tokenType !== 'access') {
        return res.status(401).json({ error: 'Invalid token type' });
      }
      req.user = payload;
      if (allowedRoles.length && !allowedRoles.includes(payload.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      return next();
    } catch (_err) {
      return res.status(401).json({ error: 'Invalid auth token' });
    }
  };
}

module.exports = { requireAuth };
