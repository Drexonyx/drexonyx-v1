/**
 * Check & optionally fix follow-up records for MDA outreach leads.
 *
 * What it does:
 *   1. Finds DXB Market and Creative Shelf LLC leads.
 *   2. For each: checks whether a cold_outreach email was actually sent
 *      (external_message_id IS NOT NULL).
 *   3. Reports any existing follow_ups for those leads.
 *   4. If a lead has a sent outreach but NO follow_up row, and DRY_RUN=false,
 *      inserts a PENDING follow_up scheduled 3 business days from sent_at.
 *      Idempotent: skips if a follow_up already exists (any status).
 *
 * Al-Falah Accounting: excluded — never touched.
 * No emails sent by this script.
 */

import postgres from 'postgres';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;
const DRY_RUN = process.env.DRY_RUN !== 'false'; // default true = safe

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 });

const TARGET_LEADS = ['DXB Market', 'Creative Shelf LLC'];

/** Adds N business days (Mon–Fri) to a date. */
function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

/** UUIDv4 fallback (GitHub Actions Node has no uuidv7 without install) */
function newId() {
  return randomUUID();
}

async function run() {
  console.log(`\n=== Follow-up check (DRY_RUN=${DRY_RUN}) ===\n`);

  for (const name of TARGET_LEADS) {
    console.log(`--- ${name} ---`);

    // 1. Find the lead
    const leads = await sql`
      SELECT id, business_name, public_email
      FROM sales.sales_leads
      WHERE business_name = ${name}
      LIMIT 1
    `;

    if (leads.length === 0) {
      console.log(`  LEAD NOT FOUND in sales_leads`);
      continue;
    }

    const lead = leads[0];
    console.log(`  lead_id : ${lead.id}`);
    console.log(`  email   : ${lead.public_email ?? '(none)'}`);

    // 2. Check for a sent cold_outreach email
    const outreachRows = await sql`
      SELECT id, sent_at, external_message_id, reply_received_at
      FROM sales.outreach_messages
      WHERE lead_id      = ${lead.id}
        AND channel      = 'email'
        AND message_type = 'cold_outreach'
        AND external_message_id IS NOT NULL
      ORDER BY sent_at DESC
      LIMIT 1
    `;

    if (outreachRows.length === 0) {
      console.log(`  OUTREACH: no sent cold_outreach email found — skipping`);
      continue;
    }

    const outreach = outreachRows[0];
    console.log(`  outreach_id          : ${outreach.id}`);
    console.log(`  sent_at              : ${outreach.sent_at?.toISOString() ?? 'null'}`);
    console.log(`  external_message_id  : ${outreach.external_message_id}`);
    console.log(`  reply_received_at    : ${outreach.reply_received_at?.toISOString() ?? 'null (no reply yet)'}`);

    // 3. Check for existing follow_up rows
    const existingFU = await sql`
      SELECT id, scheduled_at, status, sent_at
      FROM sales.follow_ups
      WHERE lead_id = ${lead.id}
      ORDER BY scheduled_at ASC
    `;

    if (existingFU.length > 0) {
      console.log(`  FOLLOW-UPS (${existingFU.length} found):`);
      for (const fu of existingFU) {
        console.log(`    id=${fu.id}  scheduled_at=${fu.scheduled_at?.toISOString()}  status=${fu.status}  sent_at=${fu.sent_at?.toISOString() ?? 'null'}`);
      }
    } else {
      console.log(`  FOLLOW-UPS: none found`);

      if (DRY_RUN) {
        console.log(`  DRY_RUN=true — would insert follow-up (run with DRY_RUN=false to apply)`);

        const sentAt = outreach.sent_at ?? new Date();
        const scheduledAt = addBusinessDays(sentAt, 3);
        console.log(`  Would schedule at: ${scheduledAt.toISOString()} (3 business days from sent_at)`);
      } else {
        // Insert follow-up
        const sentAt = outreach.sent_at ?? new Date();
        const scheduledAt = addBusinessDays(sentAt, 3);
        const messageText =
          `Hi ${lead.business_name} team,\n\nJust following up on my previous email — did you get a chance to look it over?\n\nHappy to put together a brief mockup at no commitment.\n\nMaster Digital Agency\ndrexonyx.com/mda`;

        const fuId = newId();
        await sql`
          INSERT INTO sales.follow_ups
            (id, lead_id, outreach_id, scheduled_at, channel, message_text, status, created_at, updated_at)
          VALUES
            (${fuId}, ${lead.id}, ${outreach.id}, ${scheduledAt}, 'email', ${messageText}, 'PENDING', NOW(), NOW())
          ON CONFLICT DO NOTHING
        `;

        console.log(`  INSERTED follow-up:`);
        console.log(`    id           : ${fuId}`);
        console.log(`    scheduled_at : ${scheduledAt.toISOString()}`);
        console.log(`    status       : PENDING`);
      }
    }

    // 4. Confirm reply guard (informational)
    if (outreach.reply_received_at) {
      console.log(`  NOTE: reply already received — cron will skip this follow-up automatically`);
    } else {
      console.log(`  Reply guard: no reply yet — follow-up will run when overdue (unless reply arrives first)`);
    }

    console.log('');
  }

  console.log('=== Done ===');
}

run()
  .catch((err) => {
    console.error('Script error:', err);
    process.exit(1);
  })
  .finally(() => sql.end());
