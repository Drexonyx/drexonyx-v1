import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockSelect,
  mockInsert,
  mockUpdate,
  mockAuditGateCreated,
  mockAuditGateResolved,
  mockAuditBoundaryViolation,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockAuditGateCreated: vi.fn().mockResolvedValue(undefined),
  mockAuditGateResolved: vi.fn().mockResolvedValue(undefined),
  mockAuditBoundaryViolation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/db/index', () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate },
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'gate-uuid' }));

vi.mock('../audit', () => ({
  auditGateCreated: mockAuditGateCreated,
  auditGateResolved: mockAuditGateResolved,
  auditBoundaryViolation: mockAuditBoundaryViolation,
}));

import { createGate, resolveGate } from '../gates';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSelectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
}

function makeUpdateChain() {
  return { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
}

function makeInsertChain() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}

const baseCreate = {
  taskId: 'task-1',
  organizationId: 'org-1',
  stepId: 'step-1',
  stepIndex: 0,
  requiredRole: 'ADMIN_OPERATIONS' as const,
};

const baseResolve = {
  gateId: 'gate-uuid',
  taskId: 'task-1',
  organizationId: 'org-1',
  stepId: 'step-1',
  resolverId: 'user-2',
  resolverRole: 'ADMIN_OPERATIONS',
  decision: 'APPROVED' as const,
};

const pendingGate = {
  id: 'gate-uuid',
  organization_id: 'org-1',
  agent_task_id: 'task-1',
  approver_role: 'ADMIN_OPERATIONS',
  status: 'PENDING',
};

const taskRow = { initiated_by_user_id: 'user-1' };

// ── createGate ────────────────────────────────────────────────────────────────

describe('createGate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts taskApproval, updates step and task, audits, returns gateId', async () => {
    mockInsert.mockReturnValue(makeInsertChain());
    mockUpdate.mockReturnValue(makeUpdateChain());

    const result = await createGate(baseCreate);

    expect(result).toEqual({ ok: true, gateId: 'gate-uuid' });
    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockUpdate).toHaveBeenCalledTimes(2); // step + task
    expect(mockAuditGateCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task-1',
        stepIndex: 0,
        gateType: 'HUMAN_GATE',
        requiredRole: 'ADMIN_OPERATIONS',
      }),
    );
  });

  it('passes expiresAt to the approval record', async () => {
    const insertMock = makeInsertChain();
    mockInsert.mockReturnValue(insertMock);
    mockUpdate.mockReturnValue(makeUpdateChain());

    const expiresAt = new Date('2030-01-01');
    await createGate({ ...baseCreate, expiresAt });

    expect(insertMock.values).toHaveBeenCalledWith(
      expect.objectContaining({ expires_at: expiresAt }),
    );
  });
});

// ── resolveGate ───────────────────────────────────────────────────────────────

describe('resolveGate — validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns ok:false when gate not found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const result = await resolveGate(baseResolve);
    expect(result).toEqual({ ok: false, reason: 'Gate not found' });
  });

  it('returns ok:false when gate is already resolved', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ ...pendingGate, status: 'APPROVED' }]));
    const result = await resolveGate(baseResolve);
    expect(result).toEqual({ ok: false, reason: 'Gate is already APPROVED' });
  });

  it('returns ok:false when task not found', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      const rows = call === 0 ? [pendingGate] : [];
      call++;
      return makeSelectChain(rows);
    });
    const result = await resolveGate(baseResolve);
    expect(result).toEqual({ ok: false, reason: 'Task not found' });
  });

  it('blocks self-approval and audits BOUNDARY_VIOLATION', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      const rows = call === 0 ? [pendingGate] : [{ initiated_by_user_id: 'user-2' }];
      call++;
      return makeSelectChain(rows);
    });
    const result = await resolveGate(baseResolve); // resolverId is also 'user-2'
    expect(result).toEqual({ ok: false, reason: 'Self-approval is not permitted' });
    expect(mockAuditBoundaryViolation).toHaveBeenCalledWith(
      expect.objectContaining({ attemptedAction: 'HUMAN_GATE_SELF_APPROVE' }),
    );
  });

  it('blocks resolver with insufficient role and audits', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      const rows = call === 0 ? [{ ...pendingGate, approver_role: 'OWNER' }] : [taskRow];
      call++;
      return makeSelectChain(rows);
    });
    const result = await resolveGate({ ...baseResolve, resolverRole: 'ADMIN_OPERATIONS' });
    expect(result).toEqual({ ok: false, reason: 'Resolver does not have the required approver role' });
    expect(mockAuditBoundaryViolation).toHaveBeenCalledWith(
      expect.objectContaining({ attemptedAction: 'HUMAN_GATE_UNAUTHORIZED_RESOLVER' }),
    );
  });
});

describe('resolveGate — happy paths', () => {
  function setup() {
    let call = 0;
    mockSelect.mockImplementation(() => {
      const rows = call === 0 ? [pendingGate] : [taskRow];
      call++;
      return makeSelectChain(rows);
    });
    mockUpdate.mockReturnValue(makeUpdateChain());
  }

  beforeEach(() => { vi.clearAllMocks(); setup(); });

  it('APPROVED: updates approval, step, task, audits gate resolved', async () => {
    const result = await resolveGate(baseResolve);
    expect(result).toEqual({ ok: true, decision: 'APPROVED' });
    expect(mockUpdate).toHaveBeenCalledTimes(3); // approval + step + task
    expect(mockAuditGateResolved).toHaveBeenCalledWith(
      expect.objectContaining({ gateId: 'gate-uuid', decision: 'APPROVED', resolverId: 'user-2' }),
    );
  });

  it('REJECTED: sets task to FAILED and step to GATE_REJECTED', async () => {
    const result = await resolveGate({ ...baseResolve, decision: 'REJECTED', decisionReason: 'not ok' });
    expect(result).toEqual({ ok: true, decision: 'REJECTED' });
    expect(mockAuditGateResolved).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'REJECTED' }),
    );
  });

  it('REJECTED on non-QC gate without decisionReason succeeds', async () => {
    // ADMIN_OPERATIONS gate can be rejected without reason (backward compat)
    const result = await resolveGate({ ...baseResolve, decision: 'REJECTED' });
    expect(result).toEqual({ ok: true, decision: 'REJECTED' });
  });

  it('OWNER can resolve an ADMIN_OPERATIONS-required gate', async () => {
    const result = await resolveGate({ ...baseResolve, resolverRole: 'OWNER' });
    expect(result).toEqual({ ok: true, decision: 'APPROVED' });
  });

  it('OWNER can resolve an OWNER-required gate', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      const rows = call === 0 ? [{ ...pendingGate, approver_role: 'OWNER' }] : [taskRow];
      call++;
      return makeSelectChain(rows);
    });
    const result = await resolveGate({ ...baseResolve, resolverRole: 'OWNER' });
    expect(result).toEqual({ ok: true, decision: 'APPROVED' });
  });
});

// ── DR 0123 §2.4: QC gate rejection requires decisionReason ──────────────────

describe('resolveGate — QC gate decisionReason enforcement (DR 0123)', () => {
  const qcGate = { ...pendingGate, approver_role: 'QC' };

  function setupQcGate() {
    let call = 0;
    mockSelect.mockImplementation(() => {
      const rows = call === 0 ? [qcGate] : [taskRow];
      call++;
      return makeSelectChain(rows);
    });
    mockUpdate.mockReturnValue(makeUpdateChain());
  }

  beforeEach(() => { vi.clearAllMocks(); setupQcGate(); });

  it('rejects QC gate rejection when decisionReason is absent', async () => {
    const result = await resolveGate({
      ...baseResolve,
      resolverRole: 'QC',
      decision: 'REJECTED',
      // no decisionReason
    });
    expect(result).toEqual({
      ok: false,
      reason: 'QC gate rejections require a decisionReason documenting the findings',
    });
  });

  it('rejects QC gate rejection when decisionReason is empty string', async () => {
    const result = await resolveGate({
      ...baseResolve,
      resolverRole: 'QC',
      decision: 'REJECTED',
      decisionReason: '   ',
    });
    expect(result).toEqual({
      ok: false,
      reason: 'QC gate rejections require a decisionReason documenting the findings',
    });
  });

  it('accepts QC gate rejection when decisionReason is provided', async () => {
    const result = await resolveGate({
      ...baseResolve,
      resolverRole: 'QC',
      decision: 'REJECTED',
      decisionReason: 'Product shot does not match brief — wrong color variant shown',
    });
    expect(result).toEqual({ ok: true, decision: 'REJECTED' });
  });

  it('accepts QC gate approval without decisionReason', async () => {
    const result = await resolveGate({
      ...baseResolve,
      resolverRole: 'QC',
      decision: 'APPROVED',
      // no decisionReason required for approval
    });
    expect(result).toEqual({ ok: true, decision: 'APPROVED' });
  });

  it('OWNER resolving QC gate rejection also requires decisionReason', async () => {
    const result = await resolveGate({
      ...baseResolve,
      resolverRole: 'OWNER',
      decision: 'REJECTED',
      // no decisionReason
    });
    expect(result).toEqual({
      ok: false,
      reason: 'QC gate rejections require a decisionReason documenting the findings',
    });
  });
});
