// Orchestration step runner for AGENT_TASK execution (Architecture v2 §8–§14).
// Advances a task one step at a time. Designed to be called by an external
// scheduler or request handler — retry delays (5 s / 30 s) are enforced by
// re-invocation cadence, not an inline sleep.
//
// Idempotency: a step in DISPATCHED or RUNNING is never re-dispatched.
// Plan-before-execute: task must carry a validated plan before the runner runs.

import { db } from '@/db/index';
import { agentTasks, taskSteps } from '@/db/schema/orchestration';
import { eq, and, asc, isNull, desc } from 'drizzle-orm';
import { productionJobs } from '@/db/schema/production';
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
import { isRetryable } from './retry';
import type { TaskPlan, PlanStep, InitiatorRole, ApproverRole, StepType } from './types';

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
        input: step.input ?? null,
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
    stepType: step.step_type as StepType,
  });

  switch (step.step_type) {
    case 'HUMAN_GATE':
      return processHumanGate(step, taskId, organizationId, now);

    case 'QC_GATE':
      return processQcGate(step, taskId, organizationId, now);

    case 'FINANCIAL_CHECK':
      return processFinancialCheck(step, task, taskId, organizationId, now);

    case 'SKILL':
      return processSkill(step, task, taskId, organizationId, now);

    case 'PRODUCTION_JOB':
      return processProductionJob(step, taskId, organizationId, now);

    case 'STATUS_TRANSITION':
      return processStatusTransition(step, taskId, organizationId, now);

    case 'NOTIFICATION':
      return processNotification(step, taskId, organizationId, now);

    case 'VERIFY':
      return processVerify(step, taskId, organizationId, now);

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

// ── resolveGateRole ───────────────────────────────────────────────────────────
// Maps an array of role strings to a single ApproverRole for createGate.
// OWNER always satisfies any gate (per hasRequiredApproverRole semantics), so
// 'ADMIN_OPERATIONS' is returned when it is in the list (OWNER + ADMIN pass).
// Priority: ADMIN_OPERATIONS > QC > OWNER.

function resolveGateRole(roles: string[]): ApproverRole {
  if (roles.includes('ADMIN_OPERATIONS')) return 'ADMIN_OPERATIONS';
  if (roles.includes('QC')) return 'QC';
  if (roles.includes('OWNER')) return 'OWNER';
  return 'ADMIN_OPERATIONS';
}

// ── processHumanGate ──────────────────────────────────────────────────────────

async function processHumanGate(
  step: typeof taskSteps.$inferSelect,
  taskId: string,
  organizationId: string,
  now: Date,
): Promise<RunnerResult> {
  const input = (step.input ?? {}) as Record<string, unknown>;

  let requiredRole: ApproverRole;
  if (Array.isArray(input.requiredRoles) && (input.requiredRoles as unknown[]).length > 0) {
    requiredRole = resolveGateRole(input.requiredRoles as string[]);
  } else if (typeof input.required_role === 'string' && input.required_role) {
    // Backward-compatible: step was authored with legacy snake_case key
    requiredRole = input.required_role as ApproverRole;
  } else {
    requiredRole = 'ADMIN_OPERATIONS';
  }

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

    if (isRetryable(result.isTransient, retryCount)) {
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

// ── processQcGate ─────────────────────────────────────────────────────────────

async function processQcGate(
  step: typeof taskSteps.$inferSelect,
  taskId: string,
  organizationId: string,
  now: Date,
): Promise<RunnerResult> {
  const result = await createGate({
    taskId,
    organizationId,
    stepId: step.id,
    stepIndex: step.step_index,
    requiredRole: 'QC',
    gateType: 'QC_GATE',
  });

  if (!result.ok) {
    await markStepFailed(step.id, organizationId, result.reason);
    await markTaskFailed(taskId, organizationId, step.step_index, result.reason);
    return { ok: false, outcome: 'TASK_FAILED', reason: result.reason };
  }

  void now;
  return { ok: true, outcome: 'AWAITING_GATE' };
}

// ── processProductionJob ──────────────────────────────────────────────────────

async function processProductionJob(
  step: typeof taskSteps.$inferSelect,
  taskId: string,
  organizationId: string,
  now: Date,
): Promise<RunnerResult> {
  const input = (step.input ?? {}) as Record<string, unknown>;

  let resolvedJobId: string;
  const explicitJobId = input.production_job_id as string | undefined;

  if (explicitJobId) {
    resolvedJobId = explicitJobId;
  } else {
    // Specialists supply orderId (camelCase) — look up the active production job.
    const orderId = input.orderId as string | undefined;
    if (!orderId) {
      const reason = 'PRODUCTION_JOB step requires production_job_id or orderId in input';
      await markStepFailed(step.id, organizationId, reason);
      await markTaskFailed(taskId, organizationId, step.step_index, reason);
      return { ok: false, outcome: 'TASK_FAILED', reason };
    }

    const jobType = input.jobType as string | undefined;
    const matchingJobs = await db
      .select({ id: productionJobs.id })
      .from(productionJobs)
      .where(and(
        eq(productionJobs.order_id, orderId),
        eq(productionJobs.organization_id, organizationId),
        isNull(productionJobs.archived_at),
        jobType ? eq(productionJobs.job_type, jobType as 'AI_GENERATION' | 'MANUAL_UPLOAD') : undefined,
      ))
      .orderBy(desc(productionJobs.created_at));

    const job = matchingJobs[0] ?? null;
    if (!job) {
      const reason = `No active production job found for order ${orderId}; create a production job before advancing this step`;
      await markStepFailed(step.id, organizationId, reason);
      await markTaskFailed(taskId, organizationId, step.step_index, reason);
      return { ok: false, outcome: 'TASK_FAILED', reason };
    }
    resolvedJobId = job.id;
  }

  await db
    .update(taskSteps)
    .set({
      production_job_id: resolvedJobId,
      status: 'SUCCEEDED',
      output: { production_job_id: resolvedJobId },
      completed_at: now,
      updated_at: now,
    })
    .where(and(eq(taskSteps.id, step.id), eq(taskSteps.organization_id, organizationId)));

  const durationMs = now.getTime() - (step.started_at ?? now).getTime();
  await auditStepSucceeded({ organizationId, taskId, stepIndex: step.step_index, durationMs });

  return { ok: true, outcome: 'STEP_SUCCEEDED' };
}

// ── processStatusTransition ───────────────────────────────────────────────────

async function processStatusTransition(
  step: typeof taskSteps.$inferSelect,
  taskId: string,
  organizationId: string,
  now: Date,
): Promise<RunnerResult> {
  const input = (step.input ?? {}) as Record<string, unknown>;
  const entityType = input.entity_type as string | undefined;
  const entityId = input.entity_id as string | undefined;
  const newStatus = input.new_status as string | undefined;

  if (!entityType || !entityId || !newStatus) {
    const reason = 'STATUS_TRANSITION step requires entity_type, entity_id, and new_status in input';
    await markStepFailed(step.id, organizationId, reason);
    await markTaskFailed(taskId, organizationId, step.step_index, reason);
    return { ok: false, outcome: 'TASK_FAILED', reason };
  }

  await db
    .update(taskSteps)
    .set({
      status: 'SUCCEEDED',
      output: { entity_type: entityType, entity_id: entityId, new_status: newStatus },
      completed_at: now,
      updated_at: now,
    })
    .where(and(eq(taskSteps.id, step.id), eq(taskSteps.organization_id, organizationId)));

  const durationMs = now.getTime() - (step.started_at ?? now).getTime();
  await auditStepSucceeded({ organizationId, taskId, stepIndex: step.step_index, durationMs });

  return { ok: true, outcome: 'STEP_SUCCEEDED' };
}

// ── processNotification ───────────────────────────────────────────────────────

async function processNotification(
  step: typeof taskSteps.$inferSelect,
  taskId: string,
  organizationId: string,
  now: Date,
): Promise<RunnerResult> {
  const input = (step.input ?? {}) as Record<string, unknown>;
  const notificationType = (input.notification_type as string | undefined) ?? 'SYSTEM';

  // Email notifications use Resend; system notifications are recorded as output only.
  if (notificationType === 'EMAIL') {
    const to = input.to as string | string[] | undefined;
    const subject = (input.subject as string | undefined) ?? 'DREXONYX notification';
    const body = (input.body as string | undefined) ?? '';

    if (to) {
      try {
        const { Resend } = await import('resend');
        const apiKey = process.env.RESEND_API_KEY;
        const from = process.env.RESEND_FROM_ADDRESS;
        if (apiKey && from) {
          const resend = new Resend(apiKey);
          const toAddresses = Array.isArray(to) ? to : [to];
          await resend.emails.send({ from, to: toAddresses, subject, html: body });
        }
      } catch {
        // Best-effort notification — failure does not block task progression
      }
    }
  }

  await db
    .update(taskSteps)
    .set({
      status: 'SUCCEEDED',
      output: { notification_type: notificationType, dispatched_at: now.toISOString() },
      completed_at: now,
      updated_at: now,
    })
    .where(and(eq(taskSteps.id, step.id), eq(taskSteps.organization_id, organizationId)));

  const durationMs = now.getTime() - (step.started_at ?? now).getTime();
  await auditStepSucceeded({ organizationId, taskId, stepIndex: step.step_index, durationMs });

  return { ok: true, outcome: 'STEP_SUCCEEDED' };
}

// ── processVerify ─────────────────────────────────────────────────────────────

async function processVerify(
  step: typeof taskSteps.$inferSelect,
  taskId: string,
  organizationId: string,
  now: Date,
): Promise<RunnerResult> {
  const input = (step.input ?? {}) as Record<string, unknown>;
  const checkType = (input.check_type as string | undefined) ?? 'GENERIC';

  // Verification result is written by the step dispatcher or external system.
  // If the step carries a pre-computed result, use it; otherwise mark SUCCEEDED.
  const passed = input.result !== 'FAIL';

  if (!passed) {
    const reason = `VERIFY step failed check: ${checkType}`;
    await markStepFailed(step.id, organizationId, reason);
    await markTaskFailed(taskId, organizationId, step.step_index, reason);
    return { ok: false, outcome: 'TASK_FAILED', reason };
  }

  await db
    .update(taskSteps)
    .set({
      status: 'SUCCEEDED',
      output: { check_type: checkType, verified_at: now.toISOString() },
      completed_at: now,
      updated_at: now,
    })
    .where(and(eq(taskSteps.id, step.id), eq(taskSteps.organization_id, organizationId)));

  const durationMs = now.getTime() - (step.started_at ?? now).getTime();
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
