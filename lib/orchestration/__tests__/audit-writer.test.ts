import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockInsert } = vi.hoisted(() => ({ mockInsert: vi.fn() }));

vi.mock('@/db/index', () => ({ db: { insert: mockInsert } }));
vi.mock('uuidv7', () => ({ uuidv7: () => 'audit-uuid' }));

import {
  auditTaskCreated,
  auditPlanGenerated,
  auditStepDispatched,
  auditStepSucceeded,
  auditStepFailed,
  auditGateCreated,
  auditGateResolved,
  auditTaskCompleted,
  auditTaskFailed,
  auditTaskEscalated,
  auditTaskCancelled,
  auditBoundaryViolation,
} from '../audit';

function makeInsertChain() {
  const values = vi.fn().mockResolvedValue(undefined);
  mockInsert.mockReturnValue({ values });
  return values;
}

const ORG = 'org-1';
const TASK = 'task-1';

describe('audit writer — correct action per lifecycle event', () => {
  beforeEach(() => vi.clearAllMocks());

  it('auditTaskCreated writes TASK_CREATED', async () => {
    const values = makeInsertChain();
    await auditTaskCreated({ organizationId: ORG, taskId: TASK, intentType: 'ROUTE_APPROVAL', initiatorId: 'u1', initiatorRole: 'OWNER' });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ action: 'TASK_CREATED' }));
  });

  it('auditPlanGenerated writes PLAN_GENERATED', async () => {
    const values = makeInsertChain();
    await auditPlanGenerated({ organizationId: ORG, taskId: TASK, stepCount: 2, stepTypes: ['SKILL', 'HUMAN_GATE'] });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ action: 'PLAN_GENERATED' }));
  });

  it('auditStepDispatched writes STEP_DISPATCHED', async () => {
    const values = makeInsertChain();
    await auditStepDispatched({ organizationId: ORG, taskId: TASK, stepIndex: 0, stepType: 'SKILL' });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ action: 'STEP_DISPATCHED' }));
  });

  it('auditStepSucceeded writes STEP_SUCCEEDED', async () => {
    const values = makeInsertChain();
    await auditStepSucceeded({ organizationId: ORG, taskId: TASK, stepIndex: 0, durationMs: 100 });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ action: 'STEP_SUCCEEDED' }));
  });

  it('auditStepFailed writes STEP_FAILED', async () => {
    const values = makeInsertChain();
    await auditStepFailed({ organizationId: ORG, taskId: TASK, stepIndex: 0, errorType: 'TRANSIENT', isTransient: true, retryCount: 1 });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ action: 'STEP_FAILED' }));
  });

  it('auditGateCreated writes GATE_CREATED', async () => {
    const values = makeInsertChain();
    await auditGateCreated({ organizationId: ORG, taskId: TASK, stepIndex: 1, gateType: 'HUMAN_GATE', requiredRole: 'OWNER' });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ action: 'GATE_CREATED' }));
  });

  it('auditGateResolved writes GATE_RESOLVED', async () => {
    const values = makeInsertChain();
    await auditGateResolved({ organizationId: ORG, taskId: TASK, gateId: 'gate-1', decision: 'APPROVED', resolverId: 'u2' });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ action: 'GATE_RESOLVED' }));
  });

  it('auditTaskCompleted writes TASK_COMPLETED', async () => {
    const values = makeInsertChain();
    await auditTaskCompleted({ organizationId: ORG, taskId: TASK, totalDurationMs: 5000, stepsCompleted: 3 });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ action: 'TASK_COMPLETED' }));
  });

  it('auditTaskFailed writes TASK_FAILED', async () => {
    const values = makeInsertChain();
    await auditTaskFailed({ organizationId: ORG, taskId: TASK, failedStepIndex: 1, errorSummary: 'oops' });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ action: 'TASK_FAILED' }));
  });

  it('auditTaskEscalated writes TASK_ESCALATED', async () => {
    const values = makeInsertChain();
    await auditTaskEscalated({ organizationId: ORG, taskId: TASK, escalationReason: 'violation', escalatedToRole: 'OWNER' });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ action: 'TASK_ESCALATED' }));
  });

  it('auditTaskCancelled writes TASK_CANCELLED', async () => {
    const values = makeInsertChain();
    await auditTaskCancelled({ organizationId: ORG, taskId: TASK, cancelledById: 'u1', reason: 'manual' });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ action: 'TASK_CANCELLED' }));
  });

  it('auditBoundaryViolation writes BOUNDARY_VIOLATION with entity_type=AGENT_TASK', async () => {
    const values = makeInsertChain();
    await auditBoundaryViolation({ organizationId: ORG, taskId: TASK, attemptedAction: 'SELF_APPROVE', blockReason: 'self' });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'BOUNDARY_VIOLATION', entity_type: 'AGENT_TASK' }),
    );
  });
});
