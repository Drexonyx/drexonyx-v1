// Append-only audit writer for orchestration events (Architecture v2 §13).
// All AGENT_TASK events use entity_type='AGENT_TASK', entity_id=task_id,
// actor_id=null, actor_role='AGENT' — human identity goes in payload only.
// No UPDATE or DELETE operations exist or may be added here.

import { db } from '@/db/index';
import { auditEvents } from '@/db/schema/system';
import { uuidv7 } from 'uuidv7';
import type { IntentType, InitiatorRole, StepType, ApproverRole } from './types';

const ENTITY_TYPE = 'AGENT_TASK';

async function write(
  organizationId: string,
  taskId: string,
  action: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await db.insert(auditEvents).values({
    id: uuidv7(),
    organization_id: organizationId,
    entity_type: ENTITY_TYPE,
    entity_id: taskId,
    actor_id: null,
    actor_role: 'AGENT',
    action,
    payload,
  });
}

export async function auditTaskCreated(params: {
  organizationId: string;
  taskId: string;
  intentType: IntentType;
  initiatorId: string;
  initiatorRole: InitiatorRole;
}): Promise<void> {
  await write(params.organizationId, params.taskId, 'TASK_CREATED', {
    task_id: params.taskId,
    intent_type: params.intentType,
    initiator_id: params.initiatorId,
    initiator_role: params.initiatorRole,
  });
}

export async function auditPlanGenerated(params: {
  organizationId: string;
  taskId: string;
  stepCount: number;
  stepTypes: StepType[];
}): Promise<void> {
  await write(params.organizationId, params.taskId, 'PLAN_GENERATED', {
    task_id: params.taskId,
    step_count: params.stepCount,
    step_types: params.stepTypes,
  });
}

export async function auditPlanApproved(params: {
  organizationId: string;
  taskId: string;
  approverId: string;
  approvedAt: string;
}): Promise<void> {
  await write(params.organizationId, params.taskId, 'PLAN_APPROVED', {
    task_id: params.taskId,
    approver_id: params.approverId,
    approved_at: params.approvedAt,
  });
}

export async function auditPlanRejected(params: {
  organizationId: string;
  taskId: string;
  rejectorId: string;
  reason: string;
}): Promise<void> {
  await write(params.organizationId, params.taskId, 'PLAN_REJECTED', {
    task_id: params.taskId,
    rejector_id: params.rejectorId,
    reason: params.reason,
  });
}

export async function auditStepDispatched(params: {
  organizationId: string;
  taskId: string;
  stepIndex: number;
  stepType: StepType;
}): Promise<void> {
  await write(params.organizationId, params.taskId, 'STEP_DISPATCHED', {
    task_id: params.taskId,
    step_index: params.stepIndex,
    step_type: params.stepType,
  });
}

export async function auditStepSucceeded(params: {
  organizationId: string;
  taskId: string;
  stepIndex: number;
  durationMs: number;
}): Promise<void> {
  await write(params.organizationId, params.taskId, 'STEP_SUCCEEDED', {
    task_id: params.taskId,
    step_index: params.stepIndex,
    duration_ms: params.durationMs,
  });
}

export async function auditStepFailed(params: {
  organizationId: string;
  taskId: string;
  stepIndex: number;
  errorType: string;
  isTransient: boolean;
  retryCount: number;
}): Promise<void> {
  await write(params.organizationId, params.taskId, 'STEP_FAILED', {
    task_id: params.taskId,
    step_index: params.stepIndex,
    error_type: params.errorType,
    is_transient: params.isTransient,
    retry_count: params.retryCount,
  });
}

export async function auditGateCreated(params: {
  organizationId: string;
  taskId: string;
  stepIndex: number;
  gateType: string;
  requiredRole: ApproverRole;
}): Promise<void> {
  await write(params.organizationId, params.taskId, 'GATE_CREATED', {
    task_id: params.taskId,
    step_index: params.stepIndex,
    gate_type: params.gateType,
    required_role: params.requiredRole,
  });
}

export async function auditGateResolved(params: {
  organizationId: string;
  taskId: string;
  gateId: string;
  decision: 'APPROVED' | 'REJECTED';
  resolverId: string;
}): Promise<void> {
  await write(params.organizationId, params.taskId, 'GATE_RESOLVED', {
    task_id: params.taskId,
    gate_id: params.gateId,
    decision: params.decision,
    resolver_id: params.resolverId,
  });
}

export async function auditFinancialGuardRun(params: {
  organizationId: string;
  taskId: string;
  checkType: string;
  result: 'PASS' | 'FAIL' | 'NOT_READY';
}): Promise<void> {
  await write(params.organizationId, params.taskId, 'FINANCIAL_GUARD_RUN', {
    task_id: params.taskId,
    check_type: params.checkType,
    result: params.result,
  });
}

export async function auditCostDataAbsent(params: {
  organizationId: string;
  taskId: string;
  stepIndex: number;
  provider: string;
}): Promise<void> {
  await write(params.organizationId, params.taskId, 'COST_DATA_ABSENT', {
    task_id: params.taskId,
    step_index: params.stepIndex,
    provider: params.provider,
  });
}

export async function auditTaskCompleted(params: {
  organizationId: string;
  taskId: string;
  totalDurationMs: number;
  stepsCompleted: number;
}): Promise<void> {
  await write(params.organizationId, params.taskId, 'TASK_COMPLETED', {
    task_id: params.taskId,
    total_duration_ms: params.totalDurationMs,
    steps_completed: params.stepsCompleted,
  });
}

export async function auditTaskFailed(params: {
  organizationId: string;
  taskId: string;
  failedStepIndex: number;
  errorSummary: string;
}): Promise<void> {
  await write(params.organizationId, params.taskId, 'TASK_FAILED', {
    task_id: params.taskId,
    failed_step_index: params.failedStepIndex,
    error_summary: params.errorSummary,
  });
}

export async function auditTaskEscalated(params: {
  organizationId: string;
  taskId: string;
  escalationReason: string;
  escalatedToRole: ApproverRole;
}): Promise<void> {
  await write(params.organizationId, params.taskId, 'TASK_ESCALATED', {
    task_id: params.taskId,
    escalation_reason: params.escalationReason,
    escalated_to_role: params.escalatedToRole,
  });
}

export async function auditTaskCancelled(params: {
  organizationId: string;
  taskId: string;
  cancelledById: string;
  reason: string;
}): Promise<void> {
  await write(params.organizationId, params.taskId, 'TASK_CANCELLED', {
    task_id: params.taskId,
    cancelled_by_id: params.cancelledById,
    reason: params.reason,
  });
}

// BOUNDARY_VIOLATION must never be suppressed (Architecture v2 §5, §13).
// Call this whenever the runner detects a prohibited action attempt.
export async function auditBoundaryViolation(params: {
  organizationId: string;
  taskId: string;
  attemptedAction: string;
  blockReason: string;
}): Promise<void> {
  await write(params.organizationId, params.taskId, 'BOUNDARY_VIOLATION', {
    task_id: params.taskId,
    attempted_action: params.attemptedAction,
    block_reason: params.blockReason,
  });
}
