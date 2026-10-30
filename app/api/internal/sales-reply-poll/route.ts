// Vercel Cron Job: polls Gmail for replies to tracked outreach threads.
// Foundation layer — requires GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN.
// When credentials are absent, returns a graceful not-configured response (no-op).
// Authentication: Vercel sets Authorization: Bearer {CRON_SECRET} on every cron invocation.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { outreachMessages } from '@/db/schema/sales';
import { salesLeads } from '@/db/schema/sales';
import { auditEvents } from '@/db/schema/system';
import { eq, and } from 'drizzle-orm';
import { getSentOutreachForReplyPoll } from '@/lib/sales/queries';
import { detectReplies } from '@/lib/sales/reply-detector';

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

  const pollRows = await getSentOutreachForReplyPoll(50);
  const detection = await detectReplies(pollRows);

  if (!detection.configured) {
    return NextResponse.json({
      configured: false,
      checked: 0,
      repliesFound: 0,
      recorded: 0,
      reason: 'Gmail OAuth credentials not configured',
    });
  }

  // Record detected replies
  let recorded = 0;
  const now = new Date();

  for (const reply of detection.repliesFound) {
    try {
      // Mark reply on outreach message
      await db
        .update(outreachMessages)
        .set({ reply_received_at: reply.receivedAt, updated_at: now })
        .where(eq(outreachMessages.id, reply.outreachMessageId));

      // Fetch lead_id for the outreach message
      const msgRows = await db
        .select({ lead_id: outreachMessages.lead_id })
        .from(outreachMessages)
        .where(eq(outreachMessages.id, reply.outreachMessageId))
        .limit(1);

      if (msgRows.length > 0) {
        const leadId = msgRows[0].lead_id;

        // Advance lead to REPLIED if currently OUTREACH_SENT
        await db
          .update(salesLeads)
          .set({ status: 'REPLIED', last_activity_at: now, updated_at: now })
          .where(
            and(
              eq(salesLeads.id, leadId),
              eq(salesLeads.status, 'OUTREACH_SENT'),
            ),
          );

        await db.insert(auditEvents).values({
          organization_id: organizationId,
          entity_type: 'sales_lead',
          entity_id: leadId,
          actor_role: 'sales_cron',
          action: 'REPLY_RECEIVED',
          payload: {
            outreach_message_id: reply.outreachMessageId,
            gmail_message_id: reply.gmailMessageId,
          },
        });
      }

      recorded++;
    } catch (err) {
      console.error('[cron/sales-reply-poll] error recording reply:', reply.outreachMessageId, err);
    }
  }

  return NextResponse.json({
    configured: true,
    checked: detection.checked,
    repliesFound: detection.repliesFound.length,
    recorded,
    errors: detection.errors,
  });
}
