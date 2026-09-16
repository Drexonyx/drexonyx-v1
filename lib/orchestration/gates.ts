// Human gate lifecycle for HUMAN_GATE step type (Architecture v2 §12).
// Gates block task execution until an authorized human resolves them.
// Human gates cannot be self-approved — resolver must not be the task initiator.
// Append-only: gate records are never deleted or overwritten.

import { db } from '@/db/index';
import { agentTasks, taskApprovals, taskSteps } from '@/db/schema/orchestration';
import { eq, and } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { auditGateCreated, auditGateResolved, auditBoundaryViolation } from './audit';
import type { ApproverRole } from './types';

// ── Authorization helper ──────────────────────────────────────────────────────

function hasRequiredApproverRole(resolverRole: string, requiredRole: string): boolean {
  if (resolverRole === 'OWNER') return true;
  return resolverRole === requiredRole;
}

// ── createGate ────────────────────────────────────────────────────────────────

export type CreateGateResult =
  | { ok: true; gateId: string }
  | { ok: false; reason: string };

export async function createGate(params: {
  taskId: string;
  organizationId: string;
  stepId: string;
  stepIndex: number;
  requiredRole: ApproverRole;
  expiresAt?: Date;
}): Promise<CreateGateResult> {
  const gateId = uuidv7();
  const now = new Date();

  await db.insert(taskApprovals).values({
    id: gateId,
    agent_task_id: params.taskId,
    organization_id: params.organizationId,
    approver_role: params.requiredRole,
    status: 'PENDING',
    expires_at: params.expiresAt ?? null,
  });

  await db
    .update(taskSteps)
    .set({ gate_id: gateId, status: 'GATE_PENDING', updated_at: now })
    .where(
      and(
        eq(taskSteps.id, params.stepId),
        eq(taskSteps.organization_id, params.organizationId),
      ),
    );

  await db
    .update(agentTasks)
    .set({ status: 'AWAITING_GATE', updated_at: now })
    .where(
      and(
        eq(agentTasks.id, params.taskId),
        eq(agentTasks.organization_id, params.organizationId),
      ),
    );

  await auditGateCreated({
    organizationId: params.organizationId,
    taskId: params.taskId,
    stepIndex: params.stepIndex,
    gateType: 'HUMAN_GATE',
    requiredRole: params.requiredRole,
  });

  return { ok: true, gateId };
}

// ── resolveGate ───────────────────────────────────────────────────────────────

export type ResolveGateResult =
  | { ok: true; decision: 'APPROVED' | 'REJECTED' }
  | { ok: false; reason: string };

export async function resolveGate(params: {
  gateId: string;
  taskId: string;
  organizationId: string;
  stepId: string;
  resolverId: string;
  resolverRole: string;
  decision: 'APPROVED' | 'REJECTED';
  decisionReason?: string;
}): Promise<ResolveGateResult> {
  const gates = await db
    .select()
    .from(taskApprovals)
    .where(
      and(
        eq(taskApprovals.id, params.gateId),
        eq(taskApprovals.organization_id, params.organizationId),
      ),
    )
    .limit(1);

  if (gates.length === 0) {
    return { ok: false, reason: 'Gate not found' };
  }

  const gate = gates[0];

  if (gate.status !== 'PENDING') {
    return { ok: false, reason: `Gate is already ${gate.status}` };
  }

  const tasks = await db
    .select({
      initiated_by_user_id: agentTasks.initiated_by_user_id,
    })
    .from(agentTasks)
    .where(
      and(
        eq(agentTasks.id, params.taskId),
        eq(agentTasks.organization_id, params.organizationId),
      ),
    )
    .limit(1);

  if (tasks.length === 0) {
    return { ok: false, reason: 'Task not found' };
  }

  // Human gates cannot be self-approved (Architecture v2 §12)
  if (tasks[0].initiated_by_user_id === params.resolverId) {
    await auditBoundaryViolation({
      organizationId: params.organizationId,
      taskId: params.taskId,
      attemptedAction: 'HUMAN_GATE_SELF_APPROVE',
      blockReason: 'Task initiator may not resolve their own gate',
    });
    return { ok: false, reason: 'Self-approval is not permitted' };
  }

  if (!hasRequiredApproverRole(params.resolverRole, gate.approver_role)) {
    await auditBoundaryViolation({
      organizationId: params.organizationId,
      taskId: params.taskId,
      attemptedAction: 'HUMAN_GATE_UNAUTHORIZED_RESOLVER',
      blockReason: `Resolver role ${params.resolverRole} does not meet required ${gate.approver_role}`,
    });
    return { ok: false, reason: 'Resolver does not have the required approver role' };
  }

  const now = new Date();
  const newApprovalStatus = params.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
  const newStepStatus = params.decision === 'APPROVED' ? 'GATE_APPROVED' : 'GATE_REJECTED';
  const newTaskStatus = params.decision === 'APPROVED' ? 'EXECUTING' : 'FAILED';

  await db
    .update(taskApprovals)
    .set({
      status: newApprovalStatus,
      decided_by_user_id: params.resolverId,
      decision_reason: params.decisionReason ?? null,
      decided_at: now,
      updated_at: now,
    })
    .where(
      and(
        eq(taskApprovals.id, params.gateId),
        eq(taskApprovals.organization_id, params.organizationId),
      ),
    );

  await db
    .update(taskSteps)
    .set({ status: newStepStatus, updated_at: now })
    .where(
      and(
        eq(taskSteps.id, params.stepId),
        eq(taskSteps.organization_id, params.organizationId),
      ),
    );

  await db
    .update(agentTasks)
    .set({
      status: newTaskStatus,
      failure_reason: params.decision === 'REJECTED' ? (params.decisionReason ?? 'Gate rejected') : null,
      updated_at: now,
    })
    .where(
      and(
        eq(agentTasks.id, params.taskId),
        eq(agentTasks.organization_id, params.organizationId),
      ),
    );

  await auditGateResolved({
    organizationId: params.organizationId,
    taskId: params.taskId,
    gateId: params.gateId,
    decision: params.decision,
    resolverId: params.resolverId,
  });

  return { ok: true, decision: params.decision };
}
