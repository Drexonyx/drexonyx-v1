'use server';

import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/index';
import { outreachMessages, followUps, salesLeads } from '@/db/schema/sales';
import { eq, and, isNull } from 'drizzle-orm';
import { sendOutreachEmail } from '@/lib/sales/outreach-sender';

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

export async function actionSendOutreach(
  leadId: string,
): Promise<{ ok: boolean; reason?: string; redirected?: boolean }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  if (session.role !== 'OWNER' && session.role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden' };
  }

  const organizationId = process.env.DREXONYX_ORG_ID?.trim();
  if (!organizationId) return { ok: false, reason: 'DREXONYX_ORG_ID not configured' };

  // Fetch lead + its cold_outreach email message
  const rows = await db
    .select({
      messageId: outreachMessages.id,
      messageStatus: outreachMessages.status,
      approvalStatus: outreachMessages.approval_status,
      externalMessageId: outreachMessages.external_message_id,
      publicEmail: salesLeads.public_email,
      businessName: salesLeads.business_name,
    })
    .from(outreachMessages)
    .innerJoin(salesLeads, eq(salesLeads.id, outreachMessages.lead_id))
    .where(
      and(
        eq(outreachMessages.lead_id, leadId),
        eq(outreachMessages.channel, 'email'),
        eq(outreachMessages.message_type, 'cold_outreach'),
      ),
    )
    .limit(1);

  if (rows.length === 0) return { ok: false, reason: 'No email outreach message found for this lead' };
  const { messageId, externalMessageId, publicEmail, businessName } = rows[0];

  if (businessName === 'Al-Falah Accounting') return { ok: false, reason: 'Al-Falah excluded' };
  if (externalMessageId) return { ok: false, reason: 'Already sent' };

  // Approve
  await db
    .update(outreachMessages)
    .set({ approval_status: 'APPROVED', updated_at: new Date() })
    .where(eq(outreachMessages.id, messageId));

  // Send
  const result = await sendOutreachEmail({
    outreachMessageId: messageId,
    leadId,
    toEmail: publicEmail,
    businessName,
    organizationId,
  });

  if (!result.ok) return { ok: false, reason: result.reason };

  // Schedule follow-up in 3 business days (skipped if reply arrives before then via cron)
  const scheduledAt = addBusinessDays(new Date(), 3);
  await db.insert(followUps).values({
    lead_id: leadId,
    outreach_id: messageId,
    scheduled_at: scheduledAt,
    channel: 'email',
    message_text: `Hi ${businessName} team,\n\nJust following up on my previous email — did you get a chance to look it over?\n\nHappy to put together a brief mockup at no commitment.\n\nMaster Digital Agency\ndrexonyx.com/mda`,
    status: 'PENDING',
  });

  revalidatePath('/admin/sales');
  return { ok: true, redirected: result.redirected };
}
