import { describe, it, expect, vi, beforeEach } from 'vitest';

// Tests that Phase 2 step types (PRODUCTION_JOB, STATUS_TRANSITION, QC_GATE,
// NOTIFICATION, VERIFY) are dispatched correctly and do not re-use the Phase 1
// BOUNDARY_VIOLATED fallback path.

const {
  mockSelect,
  mockInsert,
  mockUpdate,
  mockAuditStepDispatched,
  mockAuditStepSucceeded,
  mockAuditTaskCompleted,
  mockAuditTaskFailed,
  mockAuditBoundaryViolation,
  mockCreateGate,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockAuditStepDispatched: vi.fn().mockResolvedValue(undefined),
  mockAuditStepSucceeded: vi.fn().mockResolvedValue(undefined),
  mockAuditTaskCompleted: vi.fn().mockResolvedValue(undefined),
  mockAuditTaskFailed: vi.fn().mockResolvedValue(undefined),
  mockAuditBoundaryViolation: vi.fn().mockResolvedValue(undefined),
  mockCreateGate: vi.fn(),
}));

vi.mock('@/db/index', () => ({ db: { select: mockSelect, insert: mockInsert, update: mockUpdate } }));
vi.mock('uuidv7', () => ({ uuidv7: () => 'uuid' }));
vi.mock('../executor', () => ({ executeSkillStep: vi.fn() }));
vi.mock('../financial-guard', () => ({ runFinancialGuard: vi.fn() }));
vi.mock('../gates', () => ({ createGate: mockCreateGate }));
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
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
    orderBy: vi.fn().mockResolvedValue(rows),
  };
}
function upd() {
  return { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
}

const BASE_TASK = {
  id: 'task-1',
  organization_id: 'org-1',
  status: 'EXECUTING',
  initiated_by_user_id: 'user-1',
  initiator_role: 'OWNER',
  context: {},
  plan: { steps: [{ step_index: 0, step_type: 'SKILL', skill_id: 'utility.prompt.optimize' }], generated_at: '' },
  execution_started_at: new Date(),
};

function makeStep(step_type: string, extra: Record<string, unknown> = {}) {
  return {
    id: 'step-1',
    agent_task_id: 'task-1',
    organization_id: 'org-1',
    step_index: 0,
    step_type,
    skill_id: null,
    status: 'PENDING',
    retry_count: 0,
    started_at: null,
    input: extra.input ?? {},
    ...extra,
  };
}

describe('Phase 2 step types — PRODUCTION_JOB', () => {
  beforeEach(() => vi.clearAllMocks());

  it('succeeds when production_job_id is provided', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      const rows = call === 0
        ? [{ ...BASE_TASK, plan: { steps: [{ step_index: 0, step_type: 'PRODUCTION_JOB' }], generated_at: '' } }]
        : [makeStep('PRODUCTION_JOB', { input: { production_job_id: 'job-uuid' } })];
      call++;
      return sel(rows);
    });
    mockUpdate.mockReturnValue(upd());

    const result = await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
    expect(result).toEqual({ ok: true, outcome: 'STEP_SUCCEEDED' });
    expect(mockAuditBoundaryViolation).not.toHaveBeenCalled();
  });

  it('fails when production_job_id is missing', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      const rows = call === 0
        ? [{ ...BASE_TASK, plan: { steps: [{ step_index: 0, step_type: 'PRODUCTION_JOB' }], generated_at: '' } }]
        : [makeStep('PRODUCTION_JOB', { input: {} })];
      call++;
      return sel(rows);
    });
    mockUpdate.mockReturnValue(upd());

    const result = await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
    expect(result.ok).toBe(false);
  });
});

describe('Phase 2 step types — STATUS_TRANSITION', () => {
  beforeEach(() => vi.clearAllMocks());

  it('succeeds when entity_type, entity_id, new_status are provided', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      const rows = call === 0
        ? [{ ...BASE_TASK, plan: { steps: [{ step_index: 0, step_type: 'STATUS_TRANSITION' }], generated_at: '' } }]
        : [makeStep('STATUS_TRANSITION', { input: { entity_type: 'campaign', entity_id: 'c-1', new_status: 'ACTIVE' } })];
      call++;
      return sel(rows);
    });
    mockUpdate.mockReturnValue(upd());

    const result = await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
    expect(result).toEqual({ ok: true, outcome: 'STEP_SUCCEEDED' });
  });

  it('fails when required fields are missing', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      const rows = call === 0
        ? [{ ...BASE_TASK, plan: { steps: [{ step_index: 0, step_type: 'STATUS_TRANSITION' }], generated_at: '' } }]
        : [makeStep('STATUS_TRANSITION', { input: {} })];
      call++;
      return sel(rows);
    });
    mockUpdate.mockReturnValue(upd());

    const result = await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
    expect(result.ok).toBe(false);
  });
});

describe('Phase 2 step types — QC_GATE', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a gate with QC required role (no assetId — no readiness check)', async () => {
    mockCreateGate.mockResolvedValueOnce({ ok: true, gateId: 'gate-1' });
    let call = 0;
    mockSelect.mockImplementation(() => {
      const rows = call === 0
        ? [{ ...BASE_TASK, plan: { steps: [{ step_index: 0, step_type: 'QC_GATE' }], generated_at: '' } }]
        : [makeStep('QC_GATE')];
      call++;
      return sel(rows);
    });
    mockUpdate.mockReturnValue(upd());

    const result = await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
    expect(result).toEqual({ ok: true, outcome: 'AWAITING_GATE' });
    expect(mockCreateGate).toHaveBeenCalledWith(
      expect.objectContaining({ requiredRole: 'QC', gateType: 'QC_GATE' }),
    );
  });

  // DR 0123 §2.3: asset readiness enforcement
  it('creates gate when assetId is present and asset is READY_FOR_QC', async () => {
    mockCreateGate.mockResolvedValueOnce({ ok: true, gateId: 'gate-1' });
    let call = 0;
    mockSelect.mockImplementation(() => {
      if (call === 0) { call++; return sel([{ ...BASE_TASK, plan: { steps: [{ step_index: 0, step_type: 'QC_GATE' }], generated_at: '' } }]); }
      if (call === 1) { call++; return sel([makeStep('QC_GATE', { input: { assetId: 'asset-1' } })]); }
      // call 2: assets query
      call++;
      return sel([{ status: 'READY_FOR_QC' }]);
    });
    mockUpdate.mockReturnValue(upd());

    const result = await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
    expect(result).toEqual({ ok: true, outcome: 'AWAITING_GATE' });
    expect(mockCreateGate).toHaveBeenCalledOnce();
  });

  it('fails when assetId is present but asset not found', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      if (call === 0) { call++; return sel([{ ...BASE_TASK, plan: { steps: [{ step_index: 0, step_type: 'QC_GATE' }], generated_at: '' } }]); }
      if (call === 1) { call++; return sel([makeStep('QC_GATE', { input: { assetId: 'asset-missing' } })]); }
      // call 2: assets query returns nothing
      call++;
      return sel([]);
    });
    mockUpdate.mockReturnValue(upd());

    const result = await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/asset-missing/);
    expect(mockCreateGate).not.toHaveBeenCalled();
  });

  it('fails when asset is not in READY_FOR_QC status', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      if (call === 0) { call++; return sel([{ ...BASE_TASK, plan: { steps: [{ step_index: 0, step_type: 'QC_GATE' }], generated_at: '' } }]); }
      if (call === 1) { call++; return sel([makeStep('QC_GATE', { input: { assetId: 'asset-1' } })]); }
      // call 2: assets query — asset is still PROCESSING
      call++;
      return sel([{ status: 'PROCESSING' }]);
    });
    mockUpdate.mockReturnValue(upd());

    const result = await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/PROCESSING/);
      expect(result.reason).toMatch(/READY_FOR_QC/);
    }
    expect(mockCreateGate).not.toHaveBeenCalled();
  });
});

describe('Phase 2 step types — NOTIFICATION', () => {
  beforeEach(() => vi.clearAllMocks());

  it('succeeds for system notifications', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      const rows = call === 0
        ? [{ ...BASE_TASK, plan: { steps: [{ step_index: 0, step_type: 'NOTIFICATION' }], generated_at: '' } }]
        : [makeStep('NOTIFICATION', { input: { notification_type: 'SYSTEM', message: 'test' } })];
      call++;
      return sel(rows);
    });
    mockUpdate.mockReturnValue(upd());

    const result = await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
    expect(result).toEqual({ ok: true, outcome: 'STEP_SUCCEEDED' });
  });
});

describe('Phase 2 step types — VERIFY', () => {
  beforeEach(() => vi.clearAllMocks());

  it('succeeds when result is not FAIL', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      const rows = call === 0
        ? [{ ...BASE_TASK, plan: { steps: [{ step_index: 0, step_type: 'VERIFY' }], generated_at: '' } }]
        : [makeStep('VERIFY', { input: { check_type: 'GENERIC', result: 'PASS' } })];
      call++;
      return sel(rows);
    });
    mockUpdate.mockReturnValue(upd());

    const result = await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
    expect(result).toEqual({ ok: true, outcome: 'STEP_SUCCEEDED' });
  });

  it('fails when result is FAIL', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      const rows = call === 0
        ? [{ ...BASE_TASK, plan: { steps: [{ step_index: 0, step_type: 'VERIFY' }], generated_at: '' } }]
        : [makeStep('VERIFY', { input: { check_type: 'GENERIC', result: 'FAIL' } })];
      call++;
      return sel(rows);
    });
    mockUpdate.mockReturnValue(upd());

    const result = await advanceTask({ taskId: 'task-1', organizationId: 'org-1' });
    expect(result.ok).toBe(false);
  });
});
