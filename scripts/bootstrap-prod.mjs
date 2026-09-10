/**
 * DREXONYX V1 — Production Bootstrap
 *
 * Run ONCE against the production (or staging) Neon database to create:
 *   1. The DREXONYX root organization
 *   2. The first OWNER admin user
 *   3. An OWNER membership linking the user to the organization
 *   4. A pricing config (minimum acceptable margin and target margin)
 *
 * Usage:
 *   DATABASE_URL="<neon-connection-string>" \
 *   BOOTSTRAP_ADMIN_EMAIL="owner@drexonyx.studio" \
 *   BOOTSTRAP_ADMIN_PASSWORD="<choose-a-strong-password>" \
 *   BOOTSTRAP_ORG_NAME="DREXONYX" \
 *   BOOTSTRAP_ORG_SLUG="drexonyx" \
 *   BOOTSTRAP_MIN_MARGIN="0.20" \
 *   BOOTSTRAP_TARGET_MARGIN="0.35" \
 *   node scripts/bootstrap-prod.mjs
 *
 * After it runs:
 *   - Set DREXONYX_ORG_ID in Vercel (printed below as "Organization ID")
 *   - The printed password IS the one you supplied; log in to /admin/login immediately
 *   - This script is idempotent: re-running when the org slug already exists exits safely
 *
 * SECURITY:
 *   - BOOTSTRAP_ADMIN_PASSWORD is hashed with bcrypt cost 12; the plaintext is never stored.
 *   - DATABASE_URL is a production secret — do not log, commit, or share it.
 *   - This file contains NO real credentials; it reads them from environment variables only.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { uuidv7 } = require('uuidv7');
const bcrypt = require('bcryptjs');
const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const ORG_NAME = (process.env.BOOTSTRAP_ORG_NAME ?? 'DREXONYX').trim();
const ORG_SLUG = (process.env.BOOTSTRAP_ORG_SLUG ?? 'drexonyx').trim().toLowerCase();
const MIN_MARGIN = process.env.BOOTSTRAP_MIN_MARGIN ?? '0.20';
const TARGET_MARGIN = process.env.BOOTSTRAP_TARGET_MARGIN ?? '0.35';

if (!DATABASE_URL) { console.error('ERROR: DATABASE_URL is required'); process.exit(1); }
if (!ADMIN_EMAIL) { console.error('ERROR: BOOTSTRAP_ADMIN_EMAIL is required'); process.exit(1); }
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
  console.error('ERROR: BOOTSTRAP_ADMIN_PASSWORD is required (minimum 12 characters)');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 });

async function main() {
  console.log('Connecting to production database…');

  // Idempotency: exit safely if the org slug already exists
  const existing = await sql`
    SELECT id FROM core.organizations WHERE slug = ${ORG_SLUG} LIMIT 1
  `;
  if (existing.length > 0) {
    console.log(`\nOrganization slug "${ORG_SLUG}" already exists.`);
    console.log(`Organization ID: ${existing[0].id}`);
    console.log('\nBootstrap already applied — set DREXONYX_ORG_ID to the ID above.');
    await sql.end();
    return;
  }

  const orgId = uuidv7();
  const userId = uuidv7();
  const membershipId = uuidv7();
  const pricingId = uuidv7();

  console.log(`Hashing password (bcrypt cost 12)…`);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  console.log('Inserting bootstrap records…');

  await sql.begin(async (tx) => {
    // 1. Root organization
    await tx`
      INSERT INTO core.organizations (id, name, slug)
      VALUES (${orgId}, ${ORG_NAME}, ${ORG_SLUG})
    `;

    // 2. OWNER admin user
    await tx`
      INSERT INTO identity.users (id, email, display_name, password_hash)
      VALUES (${userId}, ${ADMIN_EMAIL.toLowerCase()}, ${'Owner'}, ${passwordHash})
    `;

    // 3. OWNER membership
    await tx`
      INSERT INTO identity.org_memberships (id, organization_id, user_id, role)
      VALUES (${membershipId}, ${orgId}, ${userId}, 'OWNER')
    `;

    // 4. Pricing config (required for DRAFT→SENT margin check)
    await tx`
      INSERT INTO commercial.pricing_configs (id, organization_id, minimum_acceptable_margin_rate, target_margin_rate)
      VALUES (${pricingId}, ${orgId}, ${MIN_MARGIN}, ${TARGET_MARGIN})
    `;
  });

  console.log('\n✓ Bootstrap complete.\n');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`Organization Name : ${ORG_NAME}`);
  console.log(`Organization Slug : ${ORG_SLUG}`);
  console.log(`Organization ID   : ${orgId}   ← set as DREXONYX_ORG_ID in Vercel`);
  console.log(`Admin Email       : ${ADMIN_EMAIL.toLowerCase()}`);
  console.log(`Admin Role        : OWNER`);
  console.log(`Min Margin Rate   : ${MIN_MARGIN}`);
  console.log(`Target Margin     : ${TARGET_MARGIN}`);
  console.log('─────────────────────────────────────────────────────────');
  console.log('\nNext steps:');
  console.log('  1. Copy "Organization ID" above → set DREXONYX_ORG_ID in Vercel dashboard');
  console.log('  2. Log in to /admin/login with the email and password you supplied');
  console.log('  3. Change your password (not yet implemented — use DB update if needed)');
  console.log('  4. Verify /admin/dashboard loads with 0 counts (clean slate)');

  await sql.end();
}

main().catch((e) => {
  console.error('Bootstrap failed:', e.message ?? e);
  process.exit(1);
});
