'use strict';

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const applyMode = process.argv.includes('--apply');
const targetRoles = new Set(['client', 'owner', 'operator']);

function normalizePhone(value) {
  const digits = (value || '').toString().replace(/\D/g, '');
  if (!digits) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function isValidIndianMobile(value) {
  return /^[6-9]\d{9}$/.test(value);
}

async function run() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const { data: users, error } = await supabase
    .from('users')
    .select('id, role, name, phone')
    .in('role', Array.from(targetRoles));

  if (error) throw error;

  const rows = users || [];
  const report = {
    totalScanned: rows.length,
    valid: 0,
    needsNormalization: 0,
    invalid: 0,
    updated: 0,
  };

  for (const user of rows) {
    const rawPhone = (user.phone || '').toString().trim();
    const normalized = normalizePhone(rawPhone);
    const valid = isValidIndianMobile(normalized);

    if (valid && rawPhone === normalized) {
      report.valid += 1;
      continue;
    }

    if (valid && rawPhone !== normalized) {
      report.needsNormalization += 1;
      if (applyMode) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ phone: normalized })
          .eq('id', user.id);
        if (updateError) {
          console.error(`[phone-normalize] update failed for ${user.id}: ${updateError.message}`);
        } else {
          report.updated += 1;
        }
      } else {
        console.log(`[phone-normalize] normalize needed id=${user.id} role=${user.role} name="${user.name || ''}" from="${rawPhone}" to="${normalized}"`);
      }
      continue;
    }

    report.invalid += 1;
    console.log(`[phone-normalize] invalid phone id=${user.id} role=${user.role} name="${user.name || ''}" value="${rawPhone}" normalized="${normalized}"`);
  }

  console.log('[phone-normalize] summary', report);
  if (!applyMode) {
    console.log('[phone-normalize] dry-run only. Re-run with --apply to write normalized values.');
  }
}

run().catch((err) => {
  console.error('[phone-normalize] failed', err.message || err);
  process.exit(1);
});
