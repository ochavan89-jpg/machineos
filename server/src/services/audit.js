'use strict';

const { supabase } = require('./supabase');
const { logger } = require('./logger');

async function writeAuditLog({ actorId, actorRole, action, entityType, entityId, metadata }) {
  try {
    const payload = {
      actor_id: actorId || null,
      actor_role: actorRole || null,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      metadata: metadata || null,
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('audit_logs').insert([payload]);
    if (error && error.code !== '42P01') {
      logger.warn({ err: error.message, action }, 'Failed to write audit log');
    }
  } catch (err) {
    logger.warn({ err: err.message, action }, 'Audit logging error');
  }
}

module.exports = { writeAuditLog };
