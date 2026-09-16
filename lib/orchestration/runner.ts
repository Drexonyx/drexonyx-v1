// Orchestration step runner for AGENT_TASK execution (Architecture v2 §8–§14).
// Advances a task one step at a time. Designed to be called by an external
// scheduler or request handler — retry delays (5 s / 30 s) are enforced by
// re-invocation cadence, not an inline sleep.
//
// Idempotency: a step in DISPATCHED or RUNNING is never re-dispatched.
// Plan-before-execute: task must carry a validated plan before the runner runs.

import { db } from '@/db/index';
import { agentTasks, taskSteps } from '@/db/schema/orchestration';
import { eq, and, asc } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { executeSkillStep } from './executor';
import { createGate } from './gates';
import { runFinancialGuard } from './financial-guard';
import {
  auditStepDispatched,
  auditStepSucceeded,
  auditStepFailed,
  auditTaskCompleted,
  auditTaskFailed,
  auditBoundaryViolation,
} from './audit';
import type { TaskPlan, PlanStep, InitiatorRole, ApproverRole } from './types';

const MAX_RETRIES = 2;

// ── Types ─────────────────────────────────────────────────────────────────────

export type RunnerOutcome =
  | 'STEP_SUCCEEDED'
  | 'AWAITING_GATE'
  | 'TASK_COMPLETED'
  | 'RETRY_PENDING';

export type RunnerResult =
  | { ok: true; outcome: RunnerOutcome }
  | { ok: false; outcome: 'TASK_FAILED' | 'BOUNDARY_VIOLATED' | 'INVALID_STATE'; reason: string };

// ── advanceTask ───────────────────────────────────────────────────────────────

export async function advanceTask(params: {
  taskId: string;
  organizationId: string;
}): Promise<RunnerResult> {
  const { taskId, organizationId } = params;

  // ── Load task (org-scoped) ────────────────────────────────────────────────
  const tasks = await db
    .select()
    .from(agentTasks)
    .where(and(eq(agentTasks.id, taskId), eq(agentTasks.organization_id, organizationId)))
    .limit(1);

  if (tasks.length === 0) {
    return { ok: false, outcome: 'INVALID_STATE', reason: 'Task not found' };
  }

  const task = tasks[0];

  if (!['PLAN_READY', 'EXECUTING'].includes(task.status)) {
    return {
      ok: false,
      outcome: 'INVALID_STATE',
      reason: `Task status ${task.status} is not eligible for step execution`,
    };
  }

  // ── Plan-before-execute ───────────────────────────────────────────────────
  if (!task.plan) {
    return { ok: false, outcome: 'INVALID_STATE', reason: 'Task has no plan' };
  }

  const plan = task.plan as unknown as TaskPlan;

  if (!plan.steps || plan.steps.length === 0) {
    return { ok: false, outcome: 'INVALID_STATE', reason: 'Task plan has no steps' };
  }

  const now = new Date();

  // ── Materialize steps from plan when first advancing (PLAN_READY) ─────────
  if (task.status === 'PLAN_READY') {
    const existing = await db
      .select({ id: taskSteps.id })
      .from(taskSteps)
      .where(and(eq(taskSteps.agent_task_id, taskId), eq(taskSteps.organization_id, organizationId)))
      .limit(1);

    if (existing.length === 0) {
      const stepRows: (typeof taskSteps.$inferInsert)[] = plan.steps.map((step: PlanStep) => ({
        id: uuidv7(),
        agent_task_id: taskId,
        organization_id: organizationId,
        step_index: step.step_index,
        step_type: step.step_type,
        skill_id: step.skill_id ?? null,
        status: 'PENDING',
      }));
      await db.insert(taskSteps).values(stepRows);
    }

    await db
      .update(agentTasks)
      .set({ status: 'EXECUTING', execution_started_at: now, updated_at: now })
      .where(and(eq(agentTasks.id, taskId), eq(agentTasks.organization_id, organizationId)));
  }

  // ── Load steps ordered by step_index ──────────────────────────────────────
  const steps = await db
    .select()
    .from(taskSteps)
    .where(and(eq(taskSteps.agent_task_id, taskId), eq(taskSteps.organization_id, organizationId)))
    .orderBy(asc(taskSteps.step_index));

  // ── Walk steps to find the next one to process ────────────────────────────
  const DONE_STATUSES = new Set(['SUCCEEDED', 'GATE_APPROVED', 'SKIPPED']);
  const FAIL_STATUSES = new Set(['FAILED', 'GATE_REJECTED']);
  const BUSY_STATUSES = new Set(['DISPATCHED', 'RUNNING']);

  let allDone = true;

  for (const step of steps) {
    if (DONE_STATUSES.has(step.status)) continue;

    allDone = false;

    if (FAIL_STATUSES.has(step.status)) {
      await markTaskFailed(taskId, organizationId, step.step_index, step.error ?? `Step ${step.step_index} ${step.status}`);
      return {
        ok: false,
        outcome: 'TASK_FAILED',
        reason: step.error ?? `Step ${step.step_index} reached terminal failure status`,
      };
    }

    if (BUSY_STATUSES.has(step.status)) {
      // Idempotency: already being processed — do not re-dispatch
      return { ok: true, outcome: 'RETRY_PENDING' };
    }

    if (step.status === 'GATE_PENDING') {
      return { ok: true, outcome: 'AWAITING_GATE' };
    }

    // PENDING or RETRY_PENDING: dispatch this step
    return await processStep(step, task, taskId, organizationId, now);
  }

  if (allDone) {
    const completedCount = steps.filter((s) => DONE_STATUSES.has(s.status)).length;
    const startMs = task.execution_started_at ? task.execution_started_at.getTime() : now.getTime();

    await db
      .update(agentTasks)
      .set({ status: 'COMPLETED', completed_at: now, updated_at: now })
      .where(and(eq(agentTasks.id, taskId), eq(agentTasks.organization_id, organizationId)));

    await auditTaskCompleted({
      organizationId,
      taskId,
      totalDurationMs: now.getTime() - startMs,
      stepsCompleted: completedCount,
    });

    return { ok: true, outcome: 'TASK_COMPLETED' };
  }

  return { ok: false, outcome: 'INVALID_STATE', reason: 'No processable step found' };
}

// ── processStep ───────────────────────────────────────────────────────────────

async function processStep(
  step: typeof taskSteps.$inferSelect,
  task: typeof agentTasks.$inferSelect,
  taskId: string,
  organizationId: string,
  now: Date,
): Promise<RunnerResult> {
  // Mark DISPATCHED before handing off to the step handler
  await db
    .update(taskSteps)
    .set({ status: 'DISPATCHED', started_at: now, updated_at: now })
    .where(and(eq(taskSteps.id, step.id), eq(taskSteps.organization_id, organizationId)));

  await auditStepDispatched({
    organizationId,
    taskId,
    stepIndex: step.step_index,
    stepType: step.step_type as 'SKILL' | 'HUMAN_GATE' | 'FINANCIAL_CHECK',
  });

  switch (step.step_type) {
    case 'HUMAN_GATE':
      return processHumanGate(step, taskId, organizationId, now);

    case 'FINANCIAL_CHECK':
      return processFinancialCheck(step, task, taskId, organizationId, now);

    case 'SKILL':
      return processSkill(step, task, taskId, organizationId, now);

    default: {
      await auditBoundaryViolation({
        organizationId,
        taskId,
        attemptedAction: `STEP_EXECUTE:${step.step_type}`,
        blockReason: `Unknown step type: ${step.step_type}`,
      });
      await markStepFailed(step.id, organizationId, `Unknown step type: ${step.step_type}`);
      await markTaskFailed(taskId, organizationId, step.step_index, `Unknown step type: ${step.step_type}`);
      return {
        ok: false,
        outcome: 'BOUNDARY_VIOLATED',
        reason: `Unknown step type: ${step.step_type}`,
      };
    }
  }
}

// ── processHumanGate ──────────────────────────────────────────────────────────

async function processHumanGate(
  step: typeof taskSteps.$inferSelect,
  taskId: string,
  organizationId: string,
  now: Date,
): Promise<RunnerResult> {
  const input = (step.input ?? {}) as Record<string, unknown>;
  const requiredRole: ApproverRole = (input.required_role as ApproverRole) ?? 'ADMIN_OPERATIONS';

  const result = await createGate({
    taskId,
    organizationId,
    stepId: step.id,
    stepIndex: step.step_index,
    requiredRole,
  });

  if (!result.ok) {
    await markStepFailed(step.id, organizationId, result.reason);
    await markTaskFailed(taskId, organizationId, step.step_index, result.reason);
    return { ok: false, outcome: 'TASK_FAILED', reason: result.reason };
  }

  void now; // started_at was already set at DISPATCHED stage
  return { ok: true, outcome: 'AWAITING_GATE' };
}

// ── processFinancialCheck ─────────────────────────────────────────────────────

async function processFinancialCheck(
  step: typeof taskSteps.$inferSelect,
  task: typeof agentTasks.$inferSelect,
  taskId: string,
  organizationId: string,
  now: Date,
): Promise<RunnerResult> {
  const context = (task.context ?? {}) as { order_id?: string };

  if (!context.order_id) {
    const reason = 'FINANCIAL_CHECK step requires order_id in task context';
    await markStepFailed(step.id, organizationId, reason);
    await markTaskFailed(taskId, organizationId, step.step_index, reason);
    return { ok: false, outcome: 'TASK_FAILED', reason };
  }

  const input = (step.input ?? {}) as Record<string, unknown>;
  const quote = {
    estimated_cost: (input.estimated_cost as string | null) ?? null,
    total_amount: (input.total_amount as string) ?? '0',
  };
  const pricingConfig = input.pricing_config
    ? (input.pricing_config as { minimum_acceptable_margin_rate: string; target_margin_rate: string | null })
    : null;
  const provider = (input.provider as string) ?? 'unknown';

  const result = await runFinancialGuard({
    organizationId,
    taskId,
    stepIndex: step.step_index,
    orderId: context.order_id,
    provider,
    quote,
    pricingConfig,
  });

  if (!result.ok) {
    await markStepFailed(step.id, organizationId, result.reason);
    await markTaskFailed(taskId, organizationId, step.step_index, result.reason);
    return { ok: false, outcome: 'TASK_FAILED', reason: result.reason };
  }

  await db
    .update(taskSteps)
    .set({ status: 'SUCCEEDED', completed_at: now, updated_at: now })
    .where(and(eq(taskSteps.id, step.id), eq(taskSteps.organization_id, organizationId)));

  const durationMs = now.getTime() - (step.started_at ?? now).getTime();
  await auditStepSucceeded({ organizationId, taskId, stepIndex: step.step_index, durationMs });

  return { ok: true, outcome: 'STEP_SUCCEEDED' };
}

// ── processSkill ──────────────────────────────────────────────────────────────

async function processSkill(
  step: typeof taskSteps.$inferSelect,
  task: typeof agentTasks.$inferSelect,
  taskId: string,
  organizationId: string,
  now: Date,
): Promise<RunnerResult> {
  if (!step.skill_id) {
    const reason = 'SKILL step has no skill_id';
    await markStepFailed(step.id, organizationId, reason);
    await markTaskFailed(taskId, organizationId, step.step_index, reason);
    return { ok: false, outcome: 'BOUNDARY_VIOLATED', reason };
  }

  // Mark RUNNING
  await db
    .update(taskSteps)
    .set({ status: 'RUNNING', updated_at: now })
    .where(and(eq(taskSteps.id, step.id), eq(taskSteps.organization_id, organizationId)));

  const input = (step.input ?? {}) as Record<string, unknown>;

  const result = await executeSkillStep({
    taskId,
    organizationId,
    stepIndex: step.step_index,
    skillId: step.skill_id,
    input,
    initiatorUserId: task.initiated_by_user_id,
    initiatorRole: task.initiator_role as InitiatorRole,
  });

  const doneAt = new Date();

  if (!result.ok) {
    const retryCount = step.retry_count;

    if (result.isTransient && retryCount < MAX_RETRIES) {
      const newRetryCount = retryCount + 1;
      await auditStepFailed({
        organizationId,
        taskId,
        stepIndex: step.step_index,
        errorType: 'TRANSIENT',
        isTransient: true,
        retryCount: newRetryCount,
      });
      await db
        .update(taskSteps)
        .set({ status: 'RETRY_PENDING', retry_count: newRetryCount, error: result.error, updated_at: doneAt })
        .where(and(eq(taskSteps.id, step.id), eq(taskSteps.organization_id, organizationId)));
      return { ok: true, outcome: 'RETRY_PENDING' };
    }

    const errorType = result.isTransient ? 'MAX_RETRIES_EXCEEDED' : 'NON_TRANSIENT';
    await auditStepFailed({
      organizationId,
      taskId,
      stepIndex: step.step_index,
      errorType,
      isTransient: false,
      retryCount: retryCount + (result.isTransient ? 1 : 0),
    });
    await markStepFailed(step.id, organizationId, result.error);
    await markTaskFailed(taskId, organizationId, step.step_index, result.error);

    const outcome = result.error.includes('not authorized') || result.error.includes('not on the AGENT allowlist')
      ? 'BOUNDARY_VIOLATED' as const
      : 'TASK_FAILED' as const;

    return { ok: false, outcome, reason: result.error };
  }

  await db
    .update(taskSteps)
    .set({ status: 'SUCCEEDED', output: result.output, completed_at: doneAt, updated_at: doneAt })
    .where(and(eq(taskSteps.id, step.id), eq(taskSteps.organization_id, organizationId)));

  const durationMs = doneAt.getTime() - (step.started_at ?? now).getTime();
  await auditStepSucceeded({ organizationId, taskId, stepIndex: step.step_index, durationMs });

  return { ok: true, outcome: 'STEP_SUCCEEDED' };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function markStepFailed(stepId: string, organizationId: string, error: string): Promise<void> {
  const now = new Date();
  await db
    .update(taskSteps)
    .set({ status: 'FAILED', error, completed_at: now, updated_at: now })
    .where(and(eq(taskSteps.id, stepId), eq(taskSteps.organization_id, organizationId)));
}

async function markTaskFailed(
  taskId: string,
  organizationId: string,
  failedStepIndex: number,
  errorSummary: string,
): Promise<void> {
  const now = new Date();
  await db
    .update(agentTasks)
    .set({ status: 'FAILED', failure_reason: errorSummary, completed_at: now, updated_at: now })
    .where(and(eq(agentTasks.id, taskId), eq(agentTasks.organization_id, organizationId)));

  await auditTaskFailed({ organizationId, taskId, failedStepIndex, errorSummary });
}
