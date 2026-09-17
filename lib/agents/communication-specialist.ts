// Communication Specialist Agent — DR 0119
// Dispatches internal operational email notifications to DREXONYX staff via Resend.
//
// CONSTRAINTS (DR 0119, DR 0001, DR 0052):
//   - READ ONLY — no writes to any business table
//   - NEVER includes financial amounts, margins, costs, or provider rates
//   - No AGENT_ALLOWLIST expansion; uses existing NOTIFICATION step type only
//   - organizationId always from server-side token, never from agent context
//   - Initiator roles: OWNER, ADMIN_OPERATIONS only
//   - WhatsApp, SMS, push, social messaging: OUT OF SCOPE (DR 0111 is blocked)

import { delegateSubTask } from '@/lib/orchestration/delegation';
import type { InitiatorRole, TaskContext } from '@/lib/orchestration/types';
import type { InternalNotificationEventType } from '@/lib/communication/notifications';

export interface CommunicationDelegationParams {
  parentTaskId: string;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: Extract<InitiatorRole, 'OWNER' | 'ADMIN_OPERATIONS'>;
  eventType: InternalNotificationEventType;
  title: string;
  detail: string;
  entityId?: string;
  entityType?: string;
  context?: TaskContext;
}

export type CommunicationDelegationResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegateCommunication(
  params: CommunicationDelegationParams,
): Promise<CommunicationDelegationResult> {
  const {
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    eventType,
    title,
    detail,
    entityId,
    entityType,
    context,
  } = params;

  const allowedRoles: ReadonlyArray<string> = ['OWNER', 'ADMIN_OPERATIONS'];
  if (!allowedRoles.includes(initiatorRole)) {
    return {
      ok: false,
      error: 'Internal notifications may only be initiated by OWNER or ADMIN_OPERATIONS',
    };
  }

  // DR 0119 §2.3: single-step plan — NOTIFICATION carries event payload
  const plan = {
    steps: [
      {
        step_index: 0,
        step_type: 'NOTIFICATION' as const,
        input: {
          eventType,
          title,
          detail,
          ...(entityId !== undefined ? { entityId } : {}),
          ...(entityType !== undefined ? { entityType } : {}),
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
    intentType: 'COORDINATE_INTERNAL_NOTIFICATION',
    title: `Internal notification: ${eventType}`,
    context: context ?? {},
    plan,
  });

  return result;
}
