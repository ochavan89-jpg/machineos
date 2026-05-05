'use strict';

require('dotenv').config();

const modeArg = process.argv.find((x) => x.startsWith('--mode=')) || '';
const mode = (modeArg.split('=')[1] || process.env.NODE_ENV || 'development').toLowerCase();

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'ADMIN_API_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
];

const productionOnly = [
  'RAZORPAY_WEBHOOK_SECRET',
];

const placeholderTokens = ['your_', 'set_a_long_random', 'example.com', 'placeholder'];

function getMissing(keys) {
  return keys.filter((key) => !(process.env[key] || '').toString().trim());
}

function getPlaceholderLike() {
  const risky = [];
  for (const key of [...required, ...productionOnly]) {
    const value = (process.env[key] || '').toString().toLowerCase();
    if (!value) continue;
    if (placeholderTokens.some((token) => value.includes(token))) risky.push(key);
  }
  return risky;
}

const missing = getMissing(required);
const missingProd = mode === 'production' ? getMissing(productionOnly) : [];
const placeholders = getPlaceholderLike();

if (missing.length === 0 && missingProd.length === 0 && placeholders.length === 0) {
  console.log(`[env-check] OK (${mode})`);
  process.exit(0);
}

if (missing.length > 0) console.error(`[env-check] Missing required vars: ${missing.join(', ')}`);
if (missingProd.length > 0) console.error(`[env-check] Missing production vars: ${missingProd.join(', ')}`);
if (placeholders.length > 0) console.error(`[env-check] Placeholder-like values detected: ${placeholders.join(', ')}`);

process.exit(1);
