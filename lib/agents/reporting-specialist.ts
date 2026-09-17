// Reporting Specialist Agent — DR 0117
// Provides read-only operational intelligence for OWNER and ADMIN_OPERATIONS.
//
// CONSTRAINTS (DR 0117, DR 0001, DR 0052, DR 0083):
//   - READ ONLY — no writes to any table
//   - NEVER exposes financial amounts, margins, cost, or internal financial data
//   - NEVER exposes QC review notes, production job metadata, or audit event payloads
//   - No AGENT_ALLOWLIST expansion; uses existing VERIFY + NOTIFICATION step types
//   - organizationId always from server-side token, never from agent context
//   - Initiator roles: OWNER, ADMIN_OPERATIONS only

import { delegateSubTask } from '@/lib/orchestration/delegation';
import type { InitiatorRole, TaskContext } from '@/lib/orchestration/types';

export interface ReportingDelegationParams {
  parentTaskId: string;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: Extract<InitiatorRole, 'OWNER' | 'ADMIN_OPERATIONS'>;
  context?: TaskContext;
}

export type ReportingDelegationResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegateReporting(
  params: ReportingDelegationParams,
): Promise<ReportingDelegationResult> {
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
      error: 'Operational reporting may only be initiated by OWNER or ADMIN_OPERATIONS',
    };
  }

  // DR 0117 §2.2: fixed two-step plan
  // Step 0: VERIFY     — read-only queries across commercial, production, orchestration schemas
  // Step 1: NOTIFICATION — write REPORTING_COMPLETED audit event
  const plan = {
    steps: [
      {
        step_index: 0,
        step_type: 'VERIFY' as const,
        input: { reportType: 'OPERATIONAL_REPORT' },
      },
      {
        step_index: 1,
        step_type: 'NOTIFICATION' as const,
        input: { eventType: 'REPORTING_COMPLETED' },
      },
    ],
    generated_at: new Date().toISOString(),
  };

  const result = await delegateSubTask({
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    intentType: 'GENERATE_OPERATIONAL_REPORT',
    title: 'Operational report generation',
    context: context ?? {},
    plan,
  });

  return result;
}
