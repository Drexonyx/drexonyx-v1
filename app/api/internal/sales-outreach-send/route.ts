// Vercel Cron Job: sends approved and auto-approved outreach messages via Resend.
// Queries DRAFT/APPROVED outreach messages with approval_status NOT_REQUIRED or APPROVED.
// Calls sendOutreachEmail() for each; marks sent or failed in the DB.
// Test mode: SALES_OUTREACH_TEST_MODE=true redirects all sends to OUTREACH_TEST_RECIPIENT.
// Authentication: Vercel sets Authorization: Bearer {CRON_SECRET} on every cron invocation.
//
// HARD BOUNDARY: never sends to real prospects when SALES_OUTREACH_TEST_MODE=true.
// HARD BOUNDARY: only sends messages whose approval policy permits autonomous sending.

import { NextRequest, NextResponse } from 'next/server';
import { getOutreachSendable } from '@/lib/sales/queries';
import { sendOutreachEmail } from '@/lib/sales/outreach-sender';

const SEND_BATCH_LIMIT = 20;

export const maxDuration = 60; // seconds

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organizationId = process.env.DREXONYX_ORG_ID?.trim();
  if (!organizationId) {
    return NextResponse.json({ error: 'DREXONYX_ORG_ID not configured' }, { status: 500 });
  }

  const testMode = process.env.SALES_OUTREACH_TEST_MODE === 'true';

  const sendableRows = await getOutreachSendable(SEND_BATCH_LIMIT);

  let sent = 0;
  let failed = 0;
  let blocked = 0;
  const errorDetails: string[] = [];

  for (const row of sendableRows) {
    const result = await sendOutreachEmail({
      outreachMessageId: row.id,
      leadId: row.lead_id,
      toEmail: row.publicEmail,
      businessName: row.businessName,
      organizationId,
      testMode,
    });

    if (result.ok) {
      sent++;
    } else if (result.code === 'POLICY_BLOCKED' || result.code === 'ALREADY_SENT') {
      blocked++;
    } else {
      failed++;
      errorDetails.push(`${row.id}: ${result.reason}`);
    }
  }

  return NextResponse.json({
    total: sendableRows.length,
    sent,
    failed,
    blocked,
    errors: errorDetails.slice(0, 10),
    testMode,
  });
}
