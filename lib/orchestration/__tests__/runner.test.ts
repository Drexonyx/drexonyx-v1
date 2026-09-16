import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockSelect,
  mockInsert,
  mockUpdate,
  mockExecuteSkillStep,
  mockCreateGate,
  mockRunFinancialGuard,
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
  mockExecuteSkillStep: vi.fn(),
  mockCreateGate: vi.fn(),
  mockRunFinancialGuard: vi.fn(),
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

vi.mock('uuidv7', () => ({ uuidv7: () => 'new-step-uuid' }));

vi.mock('../executor', () => ({ executeSkillStep: mockExecuteSkillStep }));
vi.mock('../gates', () => ({ createGate: mockCreateGate }));
vi.mock('../financial-guard', () => ({ runFinancialGuard: mockRunFinancialGuard }));

vi.mock('../audit', () => ({
  auditStepDispatched: mockAuditStepDispatched,
  auditStepSucceeded: mockAuditStepSucceeded,
  auditStepFailed: mockAuditStepFailed,
  auditTaskCompleted: mockAuditTaskCompleted,
  auditTaskFailed: mockAuditTaskFailed,
  auditBoundaryViolation: mockAuditBoundaryViolation,
}));

import { advanceTask } from '../runner';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSelectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
    orderBy: vi.fn().mockResolvedValue(rows),
    select: vi.fn().mockReturnThis(),
  };
}

function makeUpdateChain() {
  return { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
}

function makeInsertChain() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}

const taskExecuting = {
  id: 'task-1',
  organization_id: 'org-1',
  status: 'EXECUTING',
  initiated_by_user_id: 'user-1',
  initiator_role: 'OWNER',
  intent_type: 'ROUTE_APPROVAL',
  plan: { steps: [{ step_index: 0, step_type: 'SKILL', skill_id: 'utility.prompt.optimize' }], generated_at: '2024-01-01' },
  context: { order_id: 'order-1' },
  execution_started_at: new Date('2024-01-01'),
  budget_cents: null,
  completed_at: null,
  failure_reason: null,
};

const pendingSkillStep = {
  id: 'step-1',
  organization_id: 'org-1',
  agent_task_id: 'task-1',
  step_index: 0,
  step_type: 'SKILL',
  skill_id: 'utility.prompt.optimize',
  status: 'PENDING',
  input: null,
  output: null,
  error: null,
  gate_id: null,
  retry_count: 0,
  started_at: null,
};

const params = { taskId: 'task-1', organizationId: 'org-1' };

// ── Task loading / validation ─────────────────────────────────────────────────

describe('advanceTask — task validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns INVALID_STATE when task not found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: false, outcome: 'INVALID_STATE', reason: 'Task not found' });
  });

  it('returns INVALID_STATE for non-executable task status', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ ...taskExecuting, status: 'COMPLETED' }]));
    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: false, outcome: 'INVALID_STATE' });
  });

  it('returns INVALID_STATE when task has no plan', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ ...taskExecuting, plan: null }]));
    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: false, outcome: 'INVALID_STATE', reason: 'Task has no plan' });
  });

  it('returns INVALID_STATE when plan has no steps', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ ...taskExecuting, plan: { steps: [], generated_at: '' } }]));
    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: false, outcome: 'INVALID_STATE' });
  });
});

// ── PLAN_READY → EXECUTING materialization ────────────────────────────────────

describe('advanceTask — PLAN_READY step materialization', () => {
  beforeEach(() => vi.clearAllMocks());

  it('materializes steps and transitions task to EXECUTING', async () => {
    const planReadyTask = { ...taskExecuting, status: 'PLAN_READY', execution_started_at: null };
    let selectCall = 0;
    mockSelect.mockImplementation(() => {
      selectCall++;
      // 1st: load task, 2nd: check existing steps (empty), 3rd: load steps for processing
      if (selectCall === 1) return makeSelectChain([planReadyTask]);
      if (selectCall === 2) return makeSelectChain([]); // no existing steps
      return makeSelectChain([{ ...pendingSkillStep, status: 'PENDING' }]);
    });
    mockInsert.mockReturnValue(makeInsertChain());
    mockUpdate.mockReturnValue(makeUpdateChain());
    mockExecuteSkillStep.mockResolvedValue({ ok: true, output: { result: 'done' } });

    const result = await advanceTask(params);
    expect(mockInsert).toHaveBeenCalledOnce(); // step materialization
    expect(result).toMatchObject({ ok: true, outcome: 'STEP_SUCCEEDED' });
  });

  it('skips materialization if steps already exist', async () => {
    const planReadyTask = { ...taskExecuting, status: 'PLAN_READY' };
    let selectCall = 0;
    mockSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([planReadyTask]);
      if (selectCall === 2) return makeSelectChain([{ id: 'step-1' }]); // steps already exist
      return makeSelectChain([{ ...pendingSkillStep, status: 'SUCCEEDED' }]);
    });
    mockUpdate.mockReturnValue(makeUpdateChain());
    mockAuditTaskCompleted.mockResolvedValue(undefined);

    await advanceTask(params);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

// ── SKILL step ────────────────────────────────────────────────────────────────

describe('advanceTask — SKILL step', () => {
  function setupSelectSequence(taskRow: unknown, stepsRows: unknown[]) {
    let call = 0;
    mockSelect.mockImplementation(() => {
      call++;
      if (call === 1) return makeSelectChain([taskRow]);
      return makeSelectChain(stepsRows);
    });
  }

  beforeEach(() => vi.clearAllMocks());

  it('STEP_SUCCEEDED on skill success', async () => {
    setupSelectSequence(taskExecuting, [pendingSkillStep]);
    mockUpdate.mockReturnValue(makeUpdateChain());
    mockExecuteSkillStep.mockResolvedValue({ ok: true, output: { result: 'ok' } });

    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: true, outcome: 'STEP_SUCCEEDED' });
    expect(mockAuditStepSucceeded).toHaveBeenCalledOnce();
  });

  it('RETRY_PENDING on transient failure with retries remaining', async () => {
    setupSelectSequence(taskExecuting, [{ ...pendingSkillStep, retry_count: 0 }]);
    mockUpdate.mockReturnValue(makeUpdateChain());
    mockExecuteSkillStep.mockResolvedValue({ ok: false, error: 'timeout', isTransient: true });

    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: true, outcome: 'RETRY_PENDING' });
    expect(mockAuditStepFailed).toHaveBeenCalledWith(
      expect.objectContaining({ isTransient: true, retryCount: 1 }),
    );
  });

  it('TASK_FAILED when max retries (2) exceeded', async () => {
    setupSelectSequence(taskExecuting, [{ ...pendingSkillStep, retry_count: 2 }]);
    mockUpdate.mockReturnValue(makeUpdateChain());
    mockExecuteSkillStep.mockResolvedValue({ ok: false, error: 'timeout', isTransient: true });

    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: false, outcome: 'TASK_FAILED' });
    expect(mockAuditStepFailed).toHaveBeenCalledWith(
      expect.objectContaining({ errorType: 'MAX_RETRIES_EXCEEDED' }),
    );
    expect(mockAuditTaskFailed).toHaveBeenCalledOnce();
  });

  it('BOUNDARY_VIOLATED on non-transient auth error', async () => {
    setupSelectSequence(taskExecuting, [pendingSkillStep]);
    mockUpdate.mockReturnValue(makeUpdateChain());
    mockExecuteSkillStep.mockResolvedValue({
      ok: false,
      error: 'Skill qc.asset.metadata is not authorized for agent execution',
      isTransient: false,
    });

    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: false, outcome: 'BOUNDARY_VIOLATED' });
  });

  it('idempotency: DISPATCHED step returns RETRY_PENDING without re-dispatching', async () => {
    setupSelectSequence(taskExecuting, [{ ...pendingSkillStep, status: 'DISPATCHED' }]);

    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: true, outcome: 'RETRY_PENDING' });
    expect(mockExecuteSkillStep).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('BOUNDARY_VIOLATED when SKILL step has no skill_id', async () => {
    setupSelectSequence(taskExecuting, [{ ...pendingSkillStep, skill_id: null }]);
    mockUpdate.mockReturnValue(makeUpdateChain());

    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: false, outcome: 'BOUNDARY_VIOLATED', reason: 'SKILL step has no skill_id' });
  });
});

// ── HUMAN_GATE step ───────────────────────────────────────────────────────────

describe('advanceTask — HUMAN_GATE step', () => {
  const gateStep = {
    ...pendingSkillStep,
    step_type: 'HUMAN_GATE',
    skill_id: null,
    input: { required_role: 'ADMIN_OPERATIONS' },
  };

  function setupSelectSequence(stepsRows: unknown[]) {
    let call = 0;
    mockSelect.mockImplementation(() => {
      call++;
      return makeSelectChain(call === 1 ? [taskExecuting] : stepsRows);
    });
  }

  beforeEach(() => vi.clearAllMocks());

  it('creates gate and returns AWAITING_GATE', async () => {
    setupSelectSequence([gateStep]);
    mockUpdate.mockReturnValue(makeUpdateChain());
    mockCreateGate.mockResolvedValue({ ok: true, gateId: 'gate-1' });

    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: true, outcome: 'AWAITING_GATE' });
    expect(mockCreateGate).toHaveBeenCalledWith(
      expect.objectContaining({ requiredRole: 'ADMIN_OPERATIONS' }),
    );
  });

  it('returns AWAITING_GATE when gate is already GATE_PENDING', async () => {
    setupSelectSequence([{ ...gateStep, status: 'GATE_PENDING' }]);

    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: true, outcome: 'AWAITING_GATE' });
    expect(mockCreateGate).not.toHaveBeenCalled();
  });

  it('TASK_FAILED when createGate fails', async () => {
    setupSelectSequence([gateStep]);
    mockUpdate.mockReturnValue(makeUpdateChain());
    mockCreateGate.mockResolvedValue({ ok: false, reason: 'DB error' });

    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: false, outcome: 'TASK_FAILED' });
  });
});

// ── FINANCIAL_CHECK step ──────────────────────────────────────────────────────

describe('advanceTask — FINANCIAL_CHECK step', () => {
  const financialStep = {
    ...pendingSkillStep,
    step_type: 'FINANCIAL_CHECK',
    skill_id: null,
    input: { estimated_cost: '50.00', total_amount: '200.00', provider: 'higgsfield' },
  };

  function setup(stepsRows: unknown[], taskOverrides = {}) {
    let call = 0;
    mockSelect.mockImplementation(() => {
      call++;
      return makeSelectChain(call === 1 ? [{ ...taskExecuting, ...taskOverrides }] : stepsRows);
    });
  }

  beforeEach(() => vi.clearAllMocks());

  it('STEP_SUCCEEDED when financial guard passes', async () => {
    setup([financialStep]);
    mockUpdate.mockReturnValue(makeUpdateChain());
    mockRunFinancialGuard.mockResolvedValue({ ok: true });

    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: true, outcome: 'STEP_SUCCEEDED' });
    expect(mockAuditStepSucceeded).toHaveBeenCalledOnce();
  });

  it('TASK_FAILED when financial guard fails', async () => {
    setup([financialStep]);
    mockUpdate.mockReturnValue(makeUpdateChain());
    mockRunFinancialGuard.mockResolvedValue({ ok: false, state: 'FAIL', reason: 'budget exhausted' });

    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: false, outcome: 'TASK_FAILED', reason: 'budget exhausted' });
  });

  it('TASK_FAILED when task context has no order_id', async () => {
    setup([financialStep], { context: {} });
    mockUpdate.mockReturnValue(makeUpdateChain());

    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: false, outcome: 'TASK_FAILED' });
    expect(result.ok).toBe(false);
  });
});

// ── Task completion ───────────────────────────────────────────────────────────

describe('advanceTask — task completion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TASK_COMPLETED when all steps are SUCCEEDED', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      call++;
      return makeSelectChain(
        call === 1
          ? [taskExecuting]
          : [{ ...pendingSkillStep, status: 'SUCCEEDED' }],
      );
    });
    mockUpdate.mockReturnValue(makeUpdateChain());

    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: true, outcome: 'TASK_COMPLETED' });
    expect(mockAuditTaskCompleted).toHaveBeenCalledOnce();
  });

  it('TASK_FAILED when a step has FAILED status', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      call++;
      return makeSelectChain(
        call === 1
          ? [taskExecuting]
          : [{ ...pendingSkillStep, status: 'FAILED', error: 'something broke' }],
      );
    });
    mockUpdate.mockReturnValue(makeUpdateChain());

    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: false, outcome: 'TASK_FAILED' });
    expect(mockAuditTaskFailed).toHaveBeenCalledOnce();
  });

  it('GATE_APPROVED step is treated as completed — moves to next step', async () => {
    const succeededStep = { ...pendingSkillStep, status: 'GATE_APPROVED' };
    const nextPendingStep = { ...pendingSkillStep, id: 'step-2', step_index: 1, step_type: 'SKILL', skill_id: 'utility.prompt.optimize', status: 'PENDING' };
    let call = 0;
    mockSelect.mockImplementation(() => {
      call++;
      return makeSelectChain(call === 1 ? [taskExecuting] : [succeededStep, nextPendingStep]);
    });
    mockUpdate.mockReturnValue(makeUpdateChain());
    mockExecuteSkillStep.mockResolvedValue({ ok: true, output: {} });

    const result = await advanceTask(params);
    expect(result).toMatchObject({ ok: true, outcome: 'STEP_SUCCEEDED' });
    expect(mockExecuteSkillStep).toHaveBeenCalledOnce();
  });
});
