// INTERNAL TEST ONLY — active only when SALES_OUTREACH_TEST_MODE=true.
// Exercises the full Resend outreach transport with a synthetic lead and
// outreach record. Verifies all DB side-effects, then removes synthetic records.
//
// HARD BOUNDARY: returns 403 unless SALES_OUTREACH_TEST_MODE=true.
// HARD BOUNDARY: sendOutreachEmail() always redirects to OUTREACH_TEST_RECIPIENT
//                when testMode:true — no real prospect is ever contacted.
// NOT for production outreach — do not wire into any cron or workflow.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { salesLeads, outreachMessages } from '@/db/schema/sales';
import { auditEvents } from '@/db/schema/system';
import { eq } from 'drizzle-orm';
import { sendOutreachEmail, OUTREACH_TEST_RECIPIENT } from '@/lib/sales/outreach-sender';
import { uuidv7 } from 'uuidv7';

export const maxDuration = 30;

export async function POST(_req: NextRequest): Promise<NextResponse> {
  if (process.env.SALES_OUTREACH_TEST_MODE !== 'true') {
    return NextResponse.json(
      { ok: false, error: 'SALES_OUTREACH_TEST_MODE is not enabled' },
      { status: 403 },
    );
  }

  const organizationId = process.env.DREXONYX_ORG_ID?.trim();
  if (!organizationId) {
    return NextResponse.json(
      { ok: false, error: 'DREXONYX_ORG_ID not configured' },
      { status: 500 },
    );
  }

  const leadId = uuidv7();
  const msgId = uuidv7();

  // 1. Insert synthetic records
  await db.insert(salesLeads).values({
    id: leadId,
    business_name: 'TEST_INTERNAL_MDA_RESEND_PROBE',
    primary_source_platform: 'manual',
    source_type: 'manual',
    public_email: 'probe@mda-internal-test.io',
    status: 'QUALIFIED',
    priority: 'COLD',
    discovered_by: 'agent',
  });

  await db.insert(outreachMessages).values({
    id: msgId,
    lead_id: leadId,
    channel: 'email',
    message_text: 'This is an internal MDA pipeline test. No action needed.',
    message_type: 'cold_outreach',
    status: 'DRAFT',
    approval_status: 'NOT_REQUIRED',
  });

  // 2. Exercise the full send path (testMode forced true)
  const result = await sendOutreachEmail({
    outreachMessageId: msgId,
    leadId,
    toEmail: 'probe@mda-internal-test.io',
    businessName: 'TEST_INTERNAL_MDA_RESEND_PROBE',
    organizationId,
    testMode: true,
  });

  // 3. Read back DB state before cleanup
  const [msgRow] = await db
    .select({
      status: outreachMessages.status,
      external_message_id: outreachMessages.external_message_id,
    })
    .from(outreachMessages)
    .where(eq(outreachMessages.id, msgId))
    .limit(1);

  const auditRows = await db
    .select({ id: auditEvents.id, action: auditEvents.action })
    .from(auditEvents)
    .where(eq(auditEvents.entity_id, leadId as unknown as string))
    .limit(1);

  // 4. Cleanup synthetic records (audit trail remains for traceability)
  await db.delete(outreachMessages).where(eq(outreachMessages.id, msgId));
  await db.delete(salesLeads).where(eq(salesLeads.id, leadId));

  return NextResponse.json({
    ok: result.ok,
    testMode: true,
    recipient: OUTREACH_TEST_RECIPIENT,
    sender: process.env.RESEND_FROM_ADDRESS ?? null,
    resendAccepted: result.ok,
    externalMessageId: result.ok ? result.messageId : null,
    redirected: result.ok ? result.redirected : null,
    dbStatus: msgRow?.status ?? null,
    dbExternalMessageId: msgRow?.external_message_id ?? null,
    auditRecorded: auditRows.length > 0,
    auditAction: auditRows[0]?.action ?? null,
    noRealProspectContacted: true,
    ...(result.ok ? {} : { error: result.reason, code: result.code }),
  });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: false, error: 'Use POST' }, { status: 405 });
}
