// DR 0125 Phase 1: WhatsApp webhook — Meta Cloud API inbound message processing.
// GET: Meta webhook verification challenge (requires WHATSAPP_WEBHOOK_VERIFY_TOKEN).
// POST: HMAC-verified inbound message receiver. Routes text messages to the
//       ROUTE_WHATSAPP_INQUIRY workflow (classify → HUMAN_GATE → NOTIFICATION).
//
// SECURITY (DR 0125 §2.9):
//   - WHATSAPP_WEBHOOK_VERIFY_TOKEN and WHATSAPP_APP_SECRET are server-side only
//   - organizationId is NEVER derived from message content
//   - Sender phone number is NEVER stored in the task context (PII boundary)
//   - No financial mutations, no autonomous replies, no outbound sends
//   - All inbound message text is untrusted external data
//   - HMAC-SHA256 signature verified before any payload processing

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { db } from '@/db/index';
import { agentTasks } from '@/db/schema/orchestration';
import { orgMemberships } from '@/db/schema/identity';
import { uuidv7 } from 'uuidv7';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { auditTaskCreated, auditPlanGenerated } from '@/lib/orchestration/audit';

// ─── Signature verification ───────────────────────────────────────────────────

export function verifyMetaSignature(
  appSecret: string,
  rawBody: string,
  sigHeader: string | null,
): boolean {
  if (!sigHeader?.startsWith('sha256=')) return false;
  const sig = sigHeader.slice(7);
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  if (sig.length !== expected.length) return false;
  try {
    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    // Buffer lengths must match after hex decode; catch any decode edge case
    if (sigBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}

// ─── Owner user resolution ────────────────────────────────────────────────────

async function resolveOwnerUserId(organizationId: string): Promise<string | null> {
  const rows = await db
    .select({ user_id: orgMemberships.user_id })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.organization_id, organizationId),
        eq(orgMemberships.role, 'OWNER'),
        isNull(orgMemberships.archived_at),
      ),
    )
    .limit(1);
  return rows[0]?.user_id ?? null;
}

// ─── Idempotency ──────────────────────────────────────────────────────────────

async function isAlreadyProcessed(waMessageId: string): Promise<boolean> {
  const rows = await db
    .select({ id: agentTasks.id })
    .from(agentTasks)
    .where(
      and(
        eq(agentTasks.intent_type, 'ROUTE_WHATSAPP_INQUIRY'),
        sql`${agentTasks.context}->>'wa_message_id' = ${waMessageId}`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

// ─── GET: Meta webhook verification challenge ─────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = searchParams.get('hub.verify_token');

  const configuredToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!configuredToken) {
    return new NextResponse('Provider not configured', { status: 403 });
  }

  if (mode === 'subscribe' && verifyToken === configuredToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// ─── POST: Inbound message receiver ──────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    return NextResponse.json(
      { received: true, status: 'provider_not_configured' },
      { status: 200 },
    );
  }

  // Read raw body before parsing — needed for HMAC verification
  const rawBody = await request.text();

  // Verify X-Hub-Signature-256 before touching payload content
  if (!verifyMetaSignature(appSecret, rawBody, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse payload (absorb parse errors to avoid Meta retry storms)
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ received: true, status: 'parse_error' }, { status: 200 });
  }

  // Only process WhatsApp Business Account webhook payloads
  if (payload.object !== 'whatsapp_business_account') {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const configuredPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const organizationId = process.env.DREXONYX_ORG_ID;

  // Both env vars required for org resolution
  if (!configuredPhoneNumberId || !organizationId) {
    return NextResponse.json(
      { received: true, status: 'org_mapping_not_configured' },
      { status: 200 },
    );
  }

  const entries = (payload.entry as Record<string, unknown>[] | undefined) ?? [];

  for (const entry of entries) {
    const changes = (entry.changes as Record<string, unknown>[] | undefined) ?? [];

    for (const change of changes) {
      if ((change.field as string | undefined) !== 'messages') continue;

      const value = change.value as Record<string, unknown> | undefined;
      if (!value) continue;

      const metadata = value.metadata as Record<string, unknown> | undefined;
      const phoneNumberId = metadata?.phone_number_id as string | undefined;

      // Reject messages for unknown phone numbers — never derive org from payload
      if (phoneNumberId !== configuredPhoneNumberId) continue;

      const messages = (value.messages as Record<string, unknown>[] | undefined) ?? [];

      for (const message of messages) {
        const messageId = message.id as string | undefined;
        const messageType = message.type as string | undefined;

        // Phase 1: text messages only
        if (!messageId || messageType !== 'text') continue;

        const textObj = message.text as Record<string, unknown> | undefined;
        const messageText = (textObj?.body as string | undefined)?.trim();

        if (!messageText) continue;

        // Idempotency: skip if already processed (Meta may retry deliveries)
        if (await isAlreadyProcessed(messageId)) continue;

        // Resolve OWNER user for task attribution (required by schema)
        const initiatorUserId = await resolveOwnerUserId(organizationId);
        if (!initiatorUserId) continue;

        const taskId = uuidv7();
        const now = new Date();

        const plan = {
          steps: [
            {
              step_index: 0,
              step_type: 'SKILL' as const,
              skill_id: 'communication.whatsapp.classify',
              input: { text: messageText },
            },
            {
              step_index: 1,
              step_type: 'HUMAN_GATE' as const,
              input: {
                gate: 'WHATSAPP_INQUIRY_REVIEW',
                requiredRoles: ['OWNER', 'ADMIN_OPERATIONS'],
                reviewNote:
                  'Review classified WhatsApp inquiry and respond manually. No automated outbound messages are sent.',
              },
            },
            {
              step_index: 2,
              step_type: 'NOTIFICATION' as const,
              input: {
                event: 'WHATSAPP_INQUIRY_ROUTED',
                externalMessageId: messageId,
              },
            },
          ],
          generated_at: now.toISOString(),
        };

        try {
          await db.insert(agentTasks).values({
            id: taskId,
            organization_id: organizationId,
            parent_task_id: null, // Root task — no parent task exists for webhook-originated inquiries
            initiated_by_user_id: initiatorUserId,
            initiator_role: 'OWNER',
            intent_type: 'ROUTE_WHATSAPP_INQUIRY',
            title: `WhatsApp inquiry: ${messageId}`,
            context: {
              wa_message_id: messageId,
              // PII boundary: sender phone number (message.from) is NOT stored here
            },
            plan: plan as unknown as Record<string, unknown>,
            status: 'PLAN_READY',
            created_at: now,
            updated_at: now,
          });

          await auditTaskCreated({
            organizationId,
            taskId,
            intentType: 'ROUTE_WHATSAPP_INQUIRY',
            initiatorId: initiatorUserId,
            initiatorRole: 'OWNER',
          });

          await auditPlanGenerated({
            organizationId,
            taskId,
            stepCount: plan.steps.length,
            stepTypes: plan.steps.map((s) => s.step_type),
          });
        } catch {
          // Absorb DB errors (e.g., unique constraint from concurrent retry)
          // Return 200 so Meta does not re-deliver the same message
        }
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
