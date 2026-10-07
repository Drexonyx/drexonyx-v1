// Outreach email sending layer — Resend transport.
//
// HARD BOUNDARY: never sends to real prospects when SALES_OUTREACH_TEST_MODE=true.
// Test mode redirects every send to OUTREACH_TEST_RECIPIENT (Irenfold@gmail.com).
// Standard cold email outreach (approval_status NOT_REQUIRED) is sent automatically.
// High-risk messages (proposals, pricing, sensitive content) remain PENDING until manually approved.
//
// Idempotency: a message whose external_message_id is already set is treated as
// already sent and returns ok:true without re-sending (safe to retry).

import { Resend } from 'resend';
import { db } from '@/db/index';
import { outreachMessages, followUps, salesLeads } from '@/db/schema/sales';
import { auditEvents } from '@/db/schema/system';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import {
  getApprovalPolicy,
  getEmailOptOut,
  ensureOptOutToken,
  type OutreachChannel,
} from '@/lib/sales/queries';

export const OUTREACH_TEST_RECIPIENT = 'Irenfold@gmail.com';

// ── Result type ───────────────────────────────────────────────────────────────

export type OutreachSendResult =
  | { ok: true; messageId: string; threadId: string; redirected: boolean }
  | {
      ok: false;
      reason: string;
      code:
        | 'ALREADY_SENT'
        | 'POLICY_BLOCKED'
        | 'INVALID_EMAIL'
        | 'MISSING_EMAIL'
        | 'SEND_FAILURE'
        | 'MISSING_CONFIG'
        | 'NOT_FOUND'
        | 'DB_ERROR'
        | 'OPT_OUT';
    };

// ── Email validation ──────────────────────────────────────────────────────────

const BLOCKED_DOMAINS = new Set([
  'example.com',
  'example.net',
  'example.org',
  'test.com',
  'test.net',
  'localhost',
  'invalid',
]);

export function isValidPublicEmail(email: unknown): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(trimmed)) return false;
  const domain = trimmed.split('@')[1]?.toLowerCase() ?? '';
  if (BLOCKED_DOMAINS.has(domain)) return false;
  return true;
}

// ── Initial outreach send ─────────────────────────────────────────────────────

export async function sendOutreachEmail(params: {
  outreachMessageId: string;
  leadId: string;
  toEmail: string | null;
  businessName: string;
  organizationId: string;
  testMode?: boolean;
}): Promise<OutreachSendResult> {
  const {
    outreachMessageId,
    leadId,
    toEmail,
    businessName,
    organizationId,
    testMode,
  } = params;
  const isTestMode = testMode ?? process.env.SALES_OUTREACH_TEST_MODE === 'true';

  // 1. Validate email
  if (!toEmail) {
    return { ok: false, reason: 'Lead has no public email', code: 'MISSING_EMAIL' };
  }
  if (!isValidPublicEmail(toEmail)) {
    return { ok: false, reason: `Invalid email address: ${toEmail}`, code: 'INVALID_EMAIL' };
  }

  // 1b. Opt-out check and unsubscribe token (production only — test sends bypass this)
  let unsubscribeUrl: string | undefined;
  if (!isTestMode) {
    const normalizedEmail = toEmail.toLowerCase();
    const optOut = await getEmailOptOut(normalizedEmail);
    if (optOut?.opted_out_at) {
      return { ok: false, reason: 'Email has opted out of outreach', code: 'OPT_OUT' };
    }
    const token = await ensureOptOutToken(normalizedEmail, outreachMessageId);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.drexonyx.com';
    unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${token}`;
  }

  // 2. Fetch the outreach message
  const rows = await db
    .select({
      id: outreachMessages.id,
      channel: outreachMessages.channel,
      message_text: outreachMessages.message_text,
      message_type: outreachMessages.message_type,
      status: outreachMessages.status,
      approval_status: outreachMessages.approval_status,
      external_message_id: outreachMessages.external_message_id,
      external_thread_id: outreachMessages.external_thread_id,
    })
    .from(outreachMessages)
    .where(eq(outreachMessages.id, outreachMessageId))
    .limit(1);

  if (rows.length === 0) {
    return { ok: false, reason: 'Outreach message not found', code: 'NOT_FOUND' };
  }
  const msg = rows[0];

  // 3. Idempotency: already sent
  if (msg.external_message_id) {
    return {
      ok: true,
      messageId: msg.external_message_id,
      threadId: msg.external_thread_id ?? msg.external_message_id,
      redirected: false,
    };
  }
  if (msg.status === 'SENT') {
    return {
      ok: true,
      messageId: outreachMessageId,
      threadId: outreachMessageId,
      redirected: false,
    };
  }

  // 4. Approval policy (defense in depth)
  if (
    msg.approval_status !== 'NOT_REQUIRED' &&
    msg.approval_status !== 'APPROVED'
  ) {
    return {
      ok: false,
      reason: `Approval required (status: ${msg.approval_status})`,
      code: 'POLICY_BLOCKED',
    };
  }

  const policy = getApprovalPolicy({
    channel: msg.channel as OutreachChannel,
    messageType: msg.message_type,
    hasDiscount: false,
    hasContractualCommitment: false,
    hasPricingOffer: false,
    isSensitiveContent: false,
  });
  if (policy === 'PENDING' && msg.approval_status !== 'APPROVED') {
    return {
      ok: false,
      reason: 'Policy requires human approval',
      code: 'POLICY_BLOCKED',
    };
  }

  // 5. Resend config
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_ADDRESS;
  if (!apiKey || !from) {
    return { ok: false, reason: 'Resend not configured', code: 'MISSING_CONFIG' };
  }

  // 6. Determine actual recipient
  const actualRecipient = isTestMode ? OUTREACH_TEST_RECIPIENT : toEmail;
  const redirected = isTestMode && toEmail !== OUTREACH_TEST_RECIPIENT;

  const subject = buildOutreachSubject(msg.message_type, businessName);
  const paymentUrl = msg.message_type === 'proposal'
    ? 'https://pay.ziina.com/drexonyx/Md6AyFJ0z?source=app'
    : undefined;
  const html = buildEmailHtml(msg.message_text, unsubscribeUrl, paymentUrl);

  // 7. Send
  const now = new Date();
  let messageId: string;

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: [actualRecipient],
      subject,
      html,
    });
    if (error || !data?.id) {
      await db
        .update(outreachMessages)
        .set({ status: 'FAILED', updated_at: now })
        .where(eq(outreachMessages.id, outreachMessageId));
      return {
        ok: false,
        reason: error?.message ?? 'Resend returned no message ID',
        code: 'SEND_FAILURE',
      };
    }
    messageId = data.id;
  } catch (err) {
    await db
      .update(outreachMessages)
      .set({ status: 'FAILED', updated_at: now })
      .where(eq(outreachMessages.id, outreachMessageId));
    return { ok: false, reason: String(err), code: 'SEND_FAILURE' };
  }

  // 8. Update DB records
  try {
    await db
      .update(outreachMessages)
      .set({
        status: 'SENT',
        sent_at: now,
        external_message_id: messageId,
        external_thread_id: messageId,
        updated_at: now,
      })
      .where(eq(outreachMessages.id, outreachMessageId));

    // Advance lead to OUTREACH_SENT only if currently QUALIFIED
    await db
      .update(salesLeads)
      .set({ status: 'OUTREACH_SENT', last_activity_at: now, updated_at: now })
      .where(and(eq(salesLeads.id, leadId), eq(salesLeads.status, 'QUALIFIED')));

    await db.insert(auditEvents).values({
      organization_id: organizationId,
      entity_type: 'sales_lead',
      entity_id: leadId,
      actor_role: 'sales_cron',
      action: 'OUTREACH_SENT',
      payload: {
        outreach_message_id: outreachMessageId,
        message_id: messageId,
        channel: msg.channel,
        message_type: msg.message_type,
        redirected,
        test_mode: isTestMode,
      },
    });
  } catch (err) {
    // Email sent but DB update failed — return ok:true with the real messageId
    console.error('[outreach-sender] DB update failed after send:', outreachMessageId, err);
    return { ok: true, messageId, threadId: messageId, redirected };
  }

  return { ok: true, messageId, threadId: messageId, redirected };
}

// ── Follow-up email send ──────────────────────────────────────────────────────

export async function sendFollowUpEmail(params: {
  followUpId: string;
  leadId: string;
  outreachId: string | null;
  toEmail: string | null;
  businessName: string;
  messageText: string | null;
  organizationId: string;
  testMode?: boolean;
}): Promise<OutreachSendResult> {
  const {
    followUpId,
    leadId,
    outreachId,
    toEmail,
    businessName,
    messageText,
    organizationId,
    testMode,
  } = params;
  const isTestMode = testMode ?? process.env.SALES_OUTREACH_TEST_MODE === 'true';

  // 1. Validate email
  if (!toEmail) {
    return { ok: false, reason: 'Lead has no public email', code: 'MISSING_EMAIL' };
  }
  if (!isValidPublicEmail(toEmail)) {
    return { ok: false, reason: `Invalid email address: ${toEmail}`, code: 'INVALID_EMAIL' };
  }

  // 1b. Opt-out check (production only)
  let followUpUnsubscribeUrl: string | undefined;
  if (!isTestMode) {
    const normalizedEmail = toEmail.toLowerCase();
    const optOut = await getEmailOptOut(normalizedEmail);
    if (optOut?.opted_out_at) {
      return { ok: false, reason: 'Email has opted out of outreach', code: 'OPT_OUT' };
    }
    const token = await ensureOptOutToken(normalizedEmail);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.drexonyx.com';
    followUpUnsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${token}`;
  }

  // 2. Policy check — follow-up email is always NOT_REQUIRED for low-risk
  const policy = getApprovalPolicy({
    channel: 'email',
    messageType: 'follow_up',
    hasDiscount: false,
    hasContractualCommitment: false,
    hasPricingOffer: false,
    isSensitiveContent: false,
  });
  if (policy !== 'NOT_REQUIRED') {
    return {
      ok: false,
      reason: 'Follow-up policy requires approval',
      code: 'POLICY_BLOCKED',
    };
  }

  // 3. Resend config
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_ADDRESS;
  if (!apiKey || !from) {
    return { ok: false, reason: 'Resend not configured', code: 'MISSING_CONFIG' };
  }

  // 4. Determine actual recipient
  const actualRecipient = isTestMode ? OUTREACH_TEST_RECIPIENT : toEmail;
  const redirected = isTestMode && toEmail !== OUTREACH_TEST_RECIPIENT;

  const text =
    messageText ??
    `Following up on our previous email regarding content collaboration for ${businessName}.`;
  const subject = buildOutreachSubject('follow_up', businessName);
  const html = buildEmailHtml(text, followUpUnsubscribeUrl);

  // 5. Send
  const now = new Date();
  let messageId: string;

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: [actualRecipient],
      subject,
      html,
    });
    if (error || !data?.id) {
      return {
        ok: false,
        reason: error?.message ?? 'Resend returned no message ID',
        code: 'SEND_FAILURE',
      };
    }
    messageId = data.id;
  } catch (err) {
    return { ok: false, reason: String(err), code: 'SEND_FAILURE' };
  }

  // 6. Update DB
  try {
    // Mark the follow-up record as sent
    await db
      .update(followUps)
      .set({ status: 'SENT', sent_at: now, updated_at: now })
      .where(eq(followUps.id, followUpId));

    // Create an outreach_messages record so reply detection can track this thread
    await db.insert(outreachMessages).values({
      lead_id: leadId,
      channel: 'email',
      message_text: text,
      message_type: 'follow_up',
      status: 'SENT',
      approval_status: 'NOT_REQUIRED',
      sent_at: now,
      external_message_id: messageId,
      external_thread_id: messageId,
    });

    // Update lead activity
    await db
      .update(salesLeads)
      .set({ last_activity_at: now, updated_at: now })
      .where(eq(salesLeads.id, leadId));

    await db.insert(auditEvents).values({
      organization_id: organizationId,
      entity_type: 'sales_lead',
      entity_id: leadId,
      actor_role: 'sales_cron',
      action: 'FOLLOW_UP_SENT',
      payload: {
        follow_up_id: followUpId,
        outreach_id: outreachId,
        message_id: messageId,
        redirected,
        test_mode: isTestMode,
      },
    });
  } catch (err) {
    // Email sent but DB update failed — return ok:true
    console.error('[outreach-sender] DB update failed after follow-up send:', followUpId, err);
    return { ok: true, messageId, threadId: messageId, redirected };
  }

  return { ok: true, messageId, threadId: messageId, redirected };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildOutreachSubject(messageType: string, businessName: string): string {
  if (messageType === 'follow_up') {
    return `Following up — Master Digital Agency × ${businessName}`;
  }
  return `Master Digital Agency — Content Partnership Opportunity`;
}

function buildEmailHtml(messageText: string, unsubscribeUrl?: string, paymentUrl?: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paragraphs = messageText
    .split(/\n\n+/)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;">${esc(p.replace(/\n/g, '<br>'))}</p>`,
    )
    .join('');
  const paymentCta = paymentUrl
    ? `<div style="margin:28px 0 24px;padding:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;text-align:center;">` +
      `<p style="font-size:12px;color:#6b7280;margin:0 0 14px;letter-spacing:0.04em;text-transform:uppercase;">Secure your spot — pay to confirm</p>` +
      `<a href="${esc(paymentUrl)}" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:6px;">Pay 599 AED Securely</a>` +
      `<p style="font-size:11px;color:#9ca3af;margin:12px 0 0;">🔒 Powered by Ziina · DREXONYX</p>` +
      `</div>`
    : '';
  const footer = unsubscribeUrl
    ? `<p style="margin:32px 0 0;font-size:11px;color:#6b7280;">Master Digital Agency · Dubai, UAE — <a href="${esc(unsubscribeUrl)}" style="color:#6b7280;">Unsubscribe</a></p>`
    : '';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body style="font-family:system-ui,sans-serif;color:#111827;max-width:600px;margin:0 auto;padding:24px;">${paragraphs}${paymentCta}${footer}</body></html>`;
}
