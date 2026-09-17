// WhatsApp Inquiry Specialist Agent — DR 0125
// Routes inbound WhatsApp inquiry text through classification and mandatory staff review.
//
// CONSTRAINTS (DR 0125):
//   - No outbound WhatsApp messages of any kind (provider not configured)
//   - No autonomous replies to senders
//   - Human approval gate MANDATORY at step 1 (no skip path)
//   - PII boundary: sender phone number is NOT included in delegation params or plan steps
//   - Message text is untrusted external data; treated as opaque string
//   - organizationId always from server-side session/token, never from message content
//   - No financial authority; no financial table access
//   - Initiator roles: OWNER, ADMIN_OPERATIONS only

import { delegateSubTask } from '@/lib/orchestration/delegation';
import type { InitiatorRole, TaskContext } from '@/lib/orchestration/types';

export interface WhatsAppInquiryDelegationParams {
  parentTaskId: string;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: Extract<InitiatorRole, 'OWNER' | 'ADMIN_OPERATIONS'>;
  /**
   * Opaque external message ID from the provider (used for idempotency tracking).
   * This is NOT the sender's phone number — never include phone numbers here.
   */
  externalMessageId: string;
  /**
   * The inbound message text — untrusted, treated as opaque string for classification.
   * MUST be sanitized by the caller before passing (no raw HTML/script injection).
   */
  messageText: string;
  context?: TaskContext;
}

export type WhatsAppInquiryDelegationResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegateWhatsAppInquiry(
  params: WhatsAppInquiryDelegationParams,
): Promise<WhatsAppInquiryDelegationResult> {
  const {
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    externalMessageId,
    messageText,
    context,
  } = params;

  if (initiatorRole !== 'OWNER' && initiatorRole !== 'ADMIN_OPERATIONS') {
    return { ok: false, error: 'WhatsApp inquiry routing may only be initiated by OWNER or ADMIN_OPERATIONS' };
  }
  if (!externalMessageId || typeof externalMessageId !== 'string') {
    return { ok: false, error: 'externalMessageId must be a non-empty string' };
  }
  if (!messageText || typeof messageText !== 'string') {
    return { ok: false, error: 'messageText must be a non-empty string' };
  }

  // DR 0125 §2: fixed three-step plan
  // Step 0: SKILL — communication.whatsapp.classify: deterministic classification
  // Step 1: HUMAN_GATE — mandatory staff review (OWNER or ADMIN_OPERATIONS; no autonomous reply)
  // Step 2: NOTIFICATION — alert to OWNER/ADMIN_OPERATIONS via Communication Agent
  const plan = {
    steps: [
      {
        step_index: 0,
        step_type: 'SKILL' as const,
        skill_id: 'communication.whatsapp.classify',
        input: {
          text: messageText,
        },
      },
      {
        step_index: 1,
        step_type: 'HUMAN_GATE' as const,
        input: {
          gate: 'WHATSAPP_INQUIRY_REVIEW',
          requiredRoles: ['OWNER', 'ADMIN_OPERATIONS'],
          // NOTE: No autonomous reply. Staff reviews classification result and responds manually.
          reviewNote: 'Review classified WhatsApp inquiry and respond manually. No automated outbound messages are sent.',
        },
      },
      {
        step_index: 2,
        step_type: 'NOTIFICATION' as const,
        input: {
          event: 'WHATSAPP_INQUIRY_ROUTED',
          externalMessageId,
        },
      },
    ],
    generated_at: new Date().toISOString(),
  };

  const result = await delegateSubTask({
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    intentType: 'ROUTE_WHATSAPP_INQUIRY',
    title: `WhatsApp inquiry: ${externalMessageId}`,
    context: context ?? {},
    plan,
  });

  return result;
}
