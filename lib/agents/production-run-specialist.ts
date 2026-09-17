// Production Run Specialist Agent — DR 0113
// Coordinates prompt optimization → human job-approval gate → production job monitoring → QC notification.
//
// CONSTRAINTS (DR 0113):
//   - Does NOT create ProductionJob records (DR 0080 §2.1 — human gate required)
//   - Does NOT dispatch to any AI provider directly
//   - Does NOT issue QC verdicts or modify asset status
//   - Zero financial authority; no financial table access
//   - Initiator roles: OWNER, ADMIN_OPERATIONS only

import { delegateSubTask } from '@/lib/orchestration/delegation';
import type { InitiatorRole, TaskContext } from '@/lib/orchestration/types';

export interface ProductionRunDelegationParams {
  parentTaskId: string;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: Extract<InitiatorRole, 'OWNER' | 'ADMIN_OPERATIONS'>;
  orderId: string;
  briefId: string;
  /** Prompt text from the approved brief, to be optimized before job approval. */
  briefPrompt: string;
  context?: TaskContext;
}

export type ProductionRunDelegationResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegateProductionRun(
  params: ProductionRunDelegationParams,
): Promise<ProductionRunDelegationResult> {
  const {
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    orderId,
    briefId,
    briefPrompt,
    context,
  } = params;

  if (initiatorRole !== 'OWNER' && initiatorRole !== 'ADMIN_OPERATIONS') {
    return { ok: false, error: 'Production run may only be initiated by OWNER or ADMIN_OPERATIONS' };
  }
  if (!orderId || typeof orderId !== 'string') {
    return { ok: false, error: 'orderId must be a non-empty string' };
  }
  if (!briefId || typeof briefId !== 'string') {
    return { ok: false, error: 'briefId must be a non-empty string' };
  }
  if (!briefPrompt || typeof briefPrompt !== 'string') {
    return { ok: false, error: 'briefPrompt must be a non-empty string' };
  }

  // DR 0113 §2.2: fixed four-step plan
  // Step 0: Optimize prompt (utility.prompt.optimize — already on AGENT_ALLOWLIST)
  // Step 1: HUMAN_GATE — job approval (DR 0080 §2.1 mandatory gate before ProductionJob creation)
  // Step 2: PRODUCTION_JOB — runner monitors job status via existing driver
  // Step 3: NOTIFICATION — write PRODUCTION_COMPLETED audit event, alert ADMIN_OPERATIONS
  const plan = {
    steps: [
      {
        step_index: 0,
        step_type: 'SKILL' as const,
        skill_id: 'utility.prompt.optimize',
        input: { prompt: briefPrompt, briefId, orderId },
      },
      {
        step_index: 1,
        step_type: 'HUMAN_GATE' as const,
        input: { gate: 'JOB_APPROVAL', orderId, briefId, requiredRoles: ['OWNER', 'ADMIN_OPERATIONS'] },
      },
      {
        step_index: 2,
        step_type: 'PRODUCTION_JOB' as const,
        input: { orderId },
      },
      {
        step_index: 3,
        step_type: 'NOTIFICATION' as const,
        input: { event: 'PRODUCTION_COMPLETED', orderId },
      },
    ],
    generated_at: new Date().toISOString(),
  };

  const result = await delegateSubTask({
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    intentType: 'COORDINATE_PRODUCTION_RUN',
    title: `Production run: order ${orderId}`,
    context: context ?? { order_id: orderId, brief_id: briefId },
    plan,
  });

  return result;
}
