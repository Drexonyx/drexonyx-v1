// Specialist agent sub-task delegation (Architecture v2 §20 P2).
// Allows a parent task to spawn a bounded sub-task for specialist execution.
// Sub-tasks inherit the parent's organization_id and initiator context.
// All authorization rules and audit requirements apply equally to sub-tasks.

import { db } from '@/db/index';
import { agentTasks } from '@/db/schema/orchestration';
import { uuidv7 } from 'uuidv7';
import { auditTaskCreated, auditPlanGenerated } from './audit';
import type { InitiatorRole, IntentType, TaskContext, TaskPlan } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DelegationResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

// ── delegateSubTask ───────────────────────────────────────────────────────────

export async function delegateSubTask(params: {
  /** null for top-level admin-initiated tasks with no parent agent task. */
  parentTaskId: string | null;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: InitiatorRole;
  intentType: IntentType;
  title?: string;
  context: TaskContext;
  plan: TaskPlan;
}): Promise<DelegationResult> {
  const subTaskId = uuidv7();
  const now = new Date();

  try {
    await db.insert(agentTasks).values({
      id: subTaskId,
      organization_id: params.organizationId,
      parent_task_id: params.parentTaskId,
      initiated_by_user_id: params.initiatedByUserId,
      initiator_role: params.initiatorRole,
      intent_type: params.intentType,
      title: params.title ?? null,
      context: params.context,
      plan: params.plan as unknown as Record<string, unknown>,
      status: 'PLAN_READY',
      created_at: now,
      updated_at: now,
    });

    await auditTaskCreated({
      organizationId: params.organizationId,
      taskId: subTaskId,
      intentType: params.intentType,
      initiatorId: params.initiatedByUserId,
      initiatorRole: params.initiatorRole,
    });

    await auditPlanGenerated({
      organizationId: params.organizationId,
      taskId: subTaskId,
      stepCount: params.plan.steps.length,
      stepTypes: params.plan.steps.map((s) => s.step_type),
    });

    return { ok: true, subTaskId };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create sub-task';
    return { ok: false, error: message };
  }
}
