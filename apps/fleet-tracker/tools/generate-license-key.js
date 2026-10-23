#!/usr/bin/env node
/**
 * MDA Internal Tool — Fleet Tracker License Key Generator
 *
 * Usage:
 *   node tools/generate-license-key.js <client-id>
 *
 * <client-id> can be any 6 alphanumeric chars you choose, e.g. the
 * client's initials + a number:  ALI001  or  FLEET1
 *
 * Example:
 *   LICENSE_SECRET=your-secret node tools/generate-license-key.js ALI001
 *   → FT-ALI001-3F9A
 *
 * The LICENSE_SECRET must match the one baked into the client's app build.
 * Keep it private — never share it.
 */

const crypto = require('crypto');

const secret = process.env.LICENSE_SECRET;
const clientId = (process.argv[2] ?? '').toUpperCase();

if (!secret) {
  console.error('Error: set LICENSE_SECRET env var before running.');
  console.error('  LICENSE_SECRET=your-secret node tools/generate-license-key.js <id>');
  process.exit(1);
}

if (!/^[A-Z0-9]{1,6}$/.test(clientId)) {
  console.error('Error: client-id must be 1–6 alphanumeric characters (e.g. ALI001).');
  process.exit(1);
}

const padded = clientId.padEnd(6, '0');
const hash = crypto.createHash('sha256').update(secret + 'FT-' + padded).digest('hex');
const checksum = hash.slice(0, 4).toUpperCase();
const key = `FT-${padded}-${checksum}`;

console.log('\n✅ License Key Generated\n');
console.log(`  Client ID : ${padded}`);
console.log(`  Key       : ${key}`);
console.log('\nSend this key to the client AFTER payment is confirmed.\n');
