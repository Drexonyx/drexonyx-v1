// Analytics / Intelligence Specialist Agent — DR 0118
// Provides read-only operational analytics and intelligence for OWNER and ADMIN_OPERATIONS.
//
// CONSTRAINTS (DR 0118, DR 0001, DR 0052, DR 0083):
//   - READ ONLY — no writes to any table
//   - No LLM calls, no AI predictions, no invented benchmarks — deterministic only
//   - NEVER exposes financial amounts, margins, cost, or internal financial data
//   - NEVER exposes QC review notes, production job metadata, or audit event payloads
//   - No AGENT_ALLOWLIST expansion; uses existing VERIFY + NOTIFICATION step types
//   - organizationId always from server-side token, never from agent context
//   - Initiator roles: OWNER, ADMIN_OPERATIONS only

import { delegateSubTask } from '@/lib/orchestration/delegation';
import type { InitiatorRole, TaskContext } from '@/lib/orchestration/types';

export interface AnalyticsDelegationParams {
  parentTaskId: string;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: Extract<InitiatorRole, 'OWNER' | 'ADMIN_OPERATIONS'>;
  context?: TaskContext;
}

export type AnalyticsDelegationResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegateAnalytics(
  params: AnalyticsDelegationParams,
): Promise<AnalyticsDelegationResult> {
  const {
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    context,
  } = params;

  const allowedRoles: ReadonlyArray<string> = ['OWNER', 'ADMIN_OPERATIONS'];
  if (!allowedRoles.includes(initiatorRole)) {
    return {
      ok: false,
      error: 'Operational analytics may only be initiated by OWNER or ADMIN_OPERATIONS',
    };
  }

  // DR 0118 §2.2: fixed two-step plan
  // Step 0: VERIFY     — read-only analytics queries + deterministic anomaly detection
  // Step 1: NOTIFICATION — write ANALYTICS_COMPLETED audit event
  const plan = {
    steps: [
      {
        step_index: 0,
        step_type: 'VERIFY' as const,
        input: { reportType: 'INTELLIGENCE_REPORT' },
      },
      {
        step_index: 1,
        step_type: 'NOTIFICATION' as const,
        input: { eventType: 'ANALYTICS_COMPLETED' },
      },
    ],
    generated_at: new Date().toISOString(),
  };

  const result = await delegateSubTask({
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    intentType: 'GENERATE_INTELLIGENCE_REPORT',
    title: 'Operational intelligence report',
    context: context ?? {},
    plan,
  });

  return result;
}
