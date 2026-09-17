import { describe, it, expect, vi, beforeEach } from 'vitest';

// Validates all valid state transitions and that invalid states are rejected.

const {
  mockSelect,
  mockInsert,
  mockUpdate,
  mockAuditStepDispatched,
  mockAuditStepSucceeded,
  mockAuditTaskCompleted,
  mockAuditTaskFailed,
  mockAuditBoundaryViolation,
  mockExecuteSkillStep,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockAuditStepDispatched: vi.fn().mockResolvedValue(undefined),
  mockAuditStepSucceeded: vi.fn().mockResolvedValue(undefined),
  mockAuditTaskCompleted: vi.fn().mockResolvedValue(undefined),
  mockAuditTaskFailed: vi.fn().mockResolvedValue(undefined),
  mockAuditBoundaryViolation: vi.fn().mockResolvedValue(undefined),
  mockExecuteSkillStep: vi.fn(),
}));

vi.mock('@/db/index', () => ({ db: { select: mockSelect, insert: mockInsert, update: mockUpdate } }));
vi.mock('uuidv7', () => ({ uuidv7: () => 'uuid' }));
vi.mock('../executor', () => ({ executeSkillStep: mockExecuteSkillStep }));
vi.mock('../gates', () => ({ createGate: vi.fn() }));
vi.mock('../financial-guard', () => ({ runFinancialGuard: vi.fn() }));
vi.mock('../audit', () => ({
  auditStepDispatched: mockAuditStepDispatched,
  auditStepSucceeded: mockAuditStepSucceeded,
  auditStepFailed: vi.fn().mockResolvedValue(undefined),
  auditTaskCompleted: mockAuditTaskCompleted,
  auditTaskFailed: mockAuditTaskFailed,
  auditBoundaryViolation: mockAuditBoundaryViolation,
}));

import { advanceTask } from '../runner';

function sel(rows: unknown[]) {
  return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue(rows), orderBy: vi.fn().mockResolvedValue(rows) };
}
function upd() {
  return { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
}

const PLAN = { steps: [{ step_index: 0, step_type: 'SKILL', skill_id: 'utility.prompt.optimize' }], generated_at: '' };

describe('task lifecycle — invalid status rejected', () => {
  beforeEach(() => vi.clearAllMocks());

  const INVALID_STATUSES = ['PENDING', 'AWAITING_GATE', 'COMPLETED', 'FAILED', 'ESCALATED', 'CANCELLED'];

  INVALID_STATUSES.forEach((status) => {
    it(`status ${status} returns INVALID_STATE`, async () => {
      mockSelect.mockReturnValue(sel([{ id: 'task-1', organization_id: 'org-1', status, plan: PLAN }]));
      const result = await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.outcome).toBe('INVALID_STATE');
    });
  });
});

describe('task lifecycle — task not found', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns INVALID_STATE when task does not exist', async () => {
    mockSelect.mockReturnValue(sel([]));
    const result = await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.outcome).toBe('INVALID_STATE');
  });
});

describe('task lifecycle — PLAN_READY → EXECUTING → STEP_SUCCEEDED → TASK_COMPLETED', () => {
  beforeEach(() => vi.clearAllMocks());

  it('happy path: PLAN_READY task advances to STEP_SUCCEEDED', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      if (call === 0) { call++; return sel([{ id: 'task-1', organization_id: 'org-1', status: 'PLAN_READY', plan: PLAN, initiated_by_user_id: 'u1', initiator_role: 'OWNER', context: {}, execution_started_at: null }]); }
      if (call === 1) { call++; return sel([]); } // no existing steps
      call++;
      return sel([{ id: 'step-1', agent_task_id: 'task-1', organization_id: 'org-1', step_index: 0, step_type: 'SKILL', skill_id: 'utility.prompt.optimize', status: 'PENDING', retry_count: 0, started_at: null, input: null }]);
    });
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
    mockUpdate.mockReturnValue(upd());
    mockExecuteSkillStep.mockResolvedValueOnce({ ok: true, output: { optimizedPrompt: 'x' } });

    const result = await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
    expect(result).toEqual({ ok: true, outcome: 'STEP_SUCCEEDED' });
    expect(mockAuditStepDispatched).toHaveBeenCalledOnce();
    expect(mockAuditStepSucceeded).toHaveBeenCalledOnce();
  });

  it('all steps SUCCEEDED → TASK_COMPLETED', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      if (call === 0) { call++; return sel([{ id: 'task-1', organization_id: 'org-1', status: 'EXECUTING', plan: PLAN, initiated_by_user_id: 'u1', initiator_role: 'OWNER', context: {}, execution_started_at: new Date() }]); }
      call++;
      return sel([{ id: 'step-1', agent_task_id: 'task-1', organization_id: 'org-1', step_index: 0, step_type: 'SKILL', skill_id: 'utility.prompt.optimize', status: 'SUCCEEDED', retry_count: 0, started_at: null, input: null }]);
    });
    mockUpdate.mockReturnValue(upd());

    const result = await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
    expect(result).toEqual({ ok: true, outcome: 'TASK_COMPLETED' });
    expect(mockAuditTaskCompleted).toHaveBeenCalledOnce();
  });
});
