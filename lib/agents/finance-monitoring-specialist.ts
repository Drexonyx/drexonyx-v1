// Finance Monitoring Specialist Agent — DR 0116
// Provides read-only financial intelligence: payment alerts, ledger status,
// provider credit expiry, and reserve visibility.
//
// CONSTRAINTS (DR 0116, DR 0001, DR 0052, DR 0083):
//   - NEVER writes to financial_ledger or any financial table
//   - NEVER initiates settlements, refunds, withdrawals, or pricing changes
//   - NEVER exposes estimated_cost, gross_margin, AI cost, or provider rates
//   - No AGENT_ALLOWLIST expansion; uses existing FINANCIAL_CHECK step type
//   - organizationId always from server-side token, never from agent context
//   - Initiator roles: OWNER, ADMIN_OPERATIONS only

import { delegateSubTask } from '@/lib/orchestration/delegation';
import type { InitiatorRole, TaskContext } from '@/lib/orchestration/types';

export interface FinanceMonitoringDelegationParams {
  parentTaskId: string;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: Extract<InitiatorRole, 'OWNER' | 'ADMIN_OPERATIONS'>;
  context?: TaskContext;
}

export type FinanceMonitoringDelegationResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegateFinanceMonitoring(
  params: FinanceMonitoringDelegationParams,
): Promise<FinanceMonitoringDelegationResult> {
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
      error: 'Finance monitoring may only be initiated by OWNER or ADMIN_OPERATIONS',
    };
  }

  // DR 0116 §2.2: fixed two-step plan
  // Step 0: FINANCIAL_CHECK — read-only financial status query (no ledger write)
  // Step 1: NOTIFICATION   — audit event + best-effort alert escalation
  const plan = {
    steps: [
      {
        step_index: 0,
        step_type: 'FINANCIAL_CHECK' as const,
        // organizationId is resolved server-side by the runner; never from agent context
        input: { reportType: 'FULL_STATUS' },
      },
      {
        step_index: 1,
        step_type: 'NOTIFICATION' as const,
        input: { eventType: 'FINANCIAL_MONITORING_COMPLETED' },
      },
    ],
    generated_at: new Date().toISOString(),
  };

  const result = await delegateSubTask({
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    intentType: 'COORDINATE_FINANCIAL_MONITORING',
    title: 'Financial monitoring check',
    context: context ?? {},
    plan,
  });

  return result;
}
