// ONE-SHOT DIAGNOSTIC ROUTE — verify & optionally create follow-up records
// for DXB Market and Creative Shelf LLC.
//
// HARD LIMITS:
//   - Never sends email.
//   - Al-Falah Accounting is excluded and cannot be created.
//   - Only creates records when ?action=create is passed.
//   - Idempotent: ON CONFLICT DO NOTHING prevents duplicates.
//   - Secrets (emails, IDs) are not returned in responses.
//
// Authentication: CRON_SECRET (same as all other /api/internal/* routes).
// DELETE THIS FILE after verification is complete.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { salesLeads, outreachMessages, followUps } from '@/db/schema/sales';
import { eq, and, isNotNull, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const maxDuration = 30;

const TARGET_LEADS = ['DXB Market', 'Creative Shelf LLC'] as const;

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const action = request.nextUrl.searchParams.get('action') ?? 'check';
  const results: Record<string, unknown>[] = [];

  for (const name of TARGET_LEADS) {
    const leadRows = await db
      .select({ id: salesLeads.id })
      .from(salesLeads)
      .where(eq(salesLeads.business_name, name))
      .limit(1);

    if (leadRows.length === 0) {
      results.push({ lead: name, found: false });
      continue;
    }

    const leadId = leadRows[0].id;

    const outreachRows = await db
      .select({
        id: outreachMessages.id,
        sent_at: outreachMessages.sent_at,
        reply_received_at: outreachMessages.reply_received_at,
      })
      .from(outreachMessages)
      .where(
        and(
          eq(outreachMessages.lead_id, leadId),
          eq(outreachMessages.channel, 'email'),
          eq(outreachMessages.message_type, 'cold_outreach'),
          isNotNull(outreachMessages.external_message_id),
        ),
      )
      .orderBy(desc(outreachMessages.sent_at))
      .limit(1);

    if (outreachRows.length === 0) {
      results.push({ lead: name, found: true, outreach_sent: false });
      continue;
    }

    const outreach = outreachRows[0];

    const existingFU = await db
      .select({
        id: followUps.id,
        scheduled_at: followUps.scheduled_at,
        status: followUps.status,
        sent_at: followUps.sent_at,
      })
      .from(followUps)
      .where(eq(followUps.lead_id, leadId));

    if (existingFU.length > 0) {
      results.push({
        lead: name,
        found: true,
        outreach_sent: true,
        outreach_replied: outreach.reply_received_at !== null,
        follow_ups: existingFU.map((fu) => ({
          id: fu.id,
          scheduled_at: fu.scheduled_at?.toISOString() ?? null,
          status: fu.status,
          sent_at: fu.sent_at?.toISOString() ?? null,
        })),
      });
      continue;
    }

    // No follow-up exists
    if (action !== 'create') {
      const sentAt = outreach.sent_at ?? new Date();
      results.push({
        lead: name,
        found: true,
        outreach_sent: true,
        outreach_replied: outreach.reply_received_at !== null,
        follow_ups: [],
        would_schedule_at: addBusinessDays(sentAt, 3).toISOString(),
      });
      continue;
    }

    // action=create: insert missing follow-up
    const sentAt = outreach.sent_at ?? new Date();
    const scheduledAt = addBusinessDays(sentAt, 3);
    const messageText =
      `Hi ${name} team,\n\nJust following up on my previous email — did you get a chance to look it over?\n\nHappy to put together a brief mockup at no commitment.\n\nMaster Digital Agency\ndrexonyx.com/mda`;

    const fuId = randomUUID();
    await db
      .insert(followUps)
      .values({
        id: fuId,
        lead_id: leadId,
        outreach_id: outreach.id,
        scheduled_at: scheduledAt,
        channel: 'email',
        message_text: messageText,
        status: 'PENDING',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflictDoNothing();

    results.push({
      lead: name,
      found: true,
      outreach_sent: true,
      outreach_replied: outreach.reply_received_at !== null,
      follow_ups: [],
      created: true,
      scheduled_at: scheduledAt.toISOString(),
    });
  }

  return NextResponse.json({ action, results });
}
