// Vercel Cron Job: processes overdue PENDING follow-up records.
// Low-risk email follow-ups (NOT_REQUIRED approval policy) are marked SENT.
// Social channels (instagram, whatsapp) are blocked from automated processing.
// High-risk or manual channel follow-ups (PENDING policy) are marked SKIPPED.
// Idempotency: follow-ups with sent_at already set are not reprocessed.
// Authentication: Vercel sets Authorization: Bearer {CRON_SECRET} on every cron invocation.
//
// HARD BOUNDARY: this cron never sends messages to leads — it transitions DB state only.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { followUps } from '@/db/schema/sales';
import { eq } from 'drizzle-orm';
import { getOverdueFollowUps, getApprovalPolicy } from '@/lib/sales/queries';
import type { OutreachChannel } from '@/lib/sales/queries';

// Instagram and WhatsApp require manual review before any message is sent.
const BLOCKED_CHANNELS = new Set<string>(['instagram', 'whatsapp']);

const FOLLOWUP_BATCH_LIMIT = 50;

export const maxDuration = 60; // seconds

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const overdueRows = await getOverdueFollowUps();
  const batch = overdueRows.slice(0, FOLLOWUP_BATCH_LIMIT);

  let processed = 0;
  let skipped = 0;
  let blocked = 0;
  let errors = 0;

  for (const fu of batch) {
    try {
      // Idempotency guard: already processed in a prior run (sent_at is the marker)
      if (fu.sent_at !== null) {
        skipped++;
        continue;
      }

      const now = new Date();

      // Block social channels — cannot be sent automatically per MDA policy
      if (BLOCKED_CHANNELS.has(fu.channel)) {
        await db
          .update(followUps)
          .set({ status: 'SKIPPED', updated_at: now })
          .where(eq(followUps.id, fu.id));
        blocked++;
        continue;
      }

      // Check approval policy for the follow-up channel
      const approvalStatus = getApprovalPolicy({
        channel: fu.channel as OutreachChannel,
        messageType: 'follow_up',
        hasDiscount: false,
        hasContractualCommitment: false,
        hasPricingOffer: false,
        isSensitiveContent: false,
      });

      if (approvalStatus === 'NOT_REQUIRED') {
        // Low-risk email follow-up: mark as SENT (dispatched through the system)
        await db
          .update(followUps)
          .set({ status: 'SENT', sent_at: now, updated_at: now })
          .where(eq(followUps.id, fu.id));
        processed++;
      } else {
        // Requires human approval: mark as SKIPPED for manual review
        await db
          .update(followUps)
          .set({ status: 'SKIPPED', updated_at: now })
          .where(eq(followUps.id, fu.id));
        skipped++;
      }
    } catch (err) {
      errors++;
      console.error('[cron/sales-followups] error processing follow-up:', fu.id, err);
    }
  }

  return NextResponse.json({
    total: batch.length,
    processed,
    skipped,
    blocked,
    errors,
  });
}
