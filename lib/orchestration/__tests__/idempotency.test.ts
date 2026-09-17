import { describe, it, expect, vi, beforeEach } from 'vitest';

// Tests that runner.ts does not re-dispatch steps already in DISPATCHED or RUNNING status.

const {
  mockSelect,
  mockInsert,
  mockUpdate,
  mockAuditStepDispatched,
  mockAuditStepSucceeded,
  mockAuditStepFailed,
  mockAuditTaskCompleted,
  mockAuditTaskFailed,
  mockAuditBoundaryViolation,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockAuditStepDispatched: vi.fn().mockResolvedValue(undefined),
  mockAuditStepSucceeded: vi.fn().mockResolvedValue(undefined),
  mockAuditStepFailed: vi.fn().mockResolvedValue(undefined),
  mockAuditTaskCompleted: vi.fn().mockResolvedValue(undefined),
  mockAuditTaskFailed: vi.fn().mockResolvedValue(undefined),
  mockAuditBoundaryViolation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/db/index', () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate },
}));
vi.mock('uuidv7', () => ({ uuidv7: () => 'step-uuid' }));
vi.mock('../executor', () => ({ executeSkillStep: vi.fn() }));
vi.mock('../gates', () => ({ createGate: vi.fn() }));
vi.mock('../financial-guard', () => ({ runFinancialGuard: vi.fn() }));
vi.mock('../audit', () => ({
  auditStepDispatched: mockAuditStepDispatched,
  auditStepSucceeded: mockAuditStepSucceeded,
  auditStepFailed: mockAuditStepFailed,
  auditTaskCompleted: mockAuditTaskCompleted,
  auditTaskFailed: mockAuditTaskFailed,
  auditBoundaryViolation: mockAuditBoundaryViolation,
}));

import { advanceTask } from '../runner';

function makeSelectChain(rows: unknown[]) {
  return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue(rows), orderBy: vi.fn().mockResolvedValue(rows) };
}

const baseTask = {
  id: 'task-1',
  organization_id: 'org-1',
  status: 'EXECUTING',
  initiated_by_user_id: 'user-1',
  initiator_role: 'OWNER',
  plan: { steps: [{ step_index: 0, step_type: 'SKILL', skill_id: 'utility.prompt.optimize' }], generated_at: '' },
  context: {},
  execution_started_at: new Date(),
};

describe('idempotency — DISPATCHED step is not re-dispatched', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns RETRY_PENDING without calling dispatch when step is DISPATCHED', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      const rows = call === 0
        ? [baseTask]
        : [{ id: 'step-1', agent_task_id: 'task-1', organization_id: 'org-1', step_index: 0, step_type: 'SKILL', skill_id: 'utility.prompt.optimize', status: 'DISPATCHED', retry_count: 0, started_at: null, input: null }];
      call++;
      return makeSelectChain(rows);
    });

    const result = await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
    expect(result).toEqual({ ok: true, outcome: 'RETRY_PENDING' });
    expect(mockAuditStepDispatched).not.toHaveBeenCalled();
  });

  it('returns RETRY_PENDING without calling dispatch when step is RUNNING', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      const rows = call === 0
        ? [baseTask]
        : [{ id: 'step-1', agent_task_id: 'task-1', organization_id: 'org-1', step_index: 0, step_type: 'SKILL', skill_id: 'utility.prompt.optimize', status: 'RUNNING', retry_count: 0, started_at: null, input: null }];
      call++;
      return makeSelectChain(rows);
    });

    const result = await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
    expect(result).toEqual({ ok: true, outcome: 'RETRY_PENDING' });
    expect(mockAuditStepDispatched).not.toHaveBeenCalled();
  });
});

describe('idempotency — PLAN_READY does not re-insert steps if they exist', () => {
  beforeEach(() => vi.clearAllMocks());

  it('skips insert when steps already exist', async () => {
    const planReadyTask = { ...baseTask, status: 'PLAN_READY' };
    let call = 0;
    mockSelect.mockImplementation(() => {
      if (call === 0) { call++; return makeSelectChain([planReadyTask]); }
      if (call === 1) { call++; return makeSelectChain([{ id: 'existing-step' }]); } // steps exist
      call++;
      return makeSelectChain([{ id: 'step-1', agent_task_id: 'task-1', organization_id: 'org-1', step_index: 0, step_type: 'SKILL', skill_id: 'utility.prompt.optimize', status: 'DISPATCHED', retry_count: 0, started_at: null, input: null }]);
    });
    mockUpdate.mockReturnValue({ set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) });

    await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
