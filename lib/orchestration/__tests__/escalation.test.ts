import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockInsert, mockUpdate, mockAuditTaskEscalated } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockAuditTaskEscalated: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/db/index', () => ({
  db: { insert: mockInsert, update: mockUpdate },
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'escalation-uuid' }));

vi.mock('../audit', () => ({
  auditTaskEscalated: mockAuditTaskEscalated,
}));

import { escalateTask } from '../escalation';

function makeInsertChain() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}
function makeUpdateChain() {
  return { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
}

describe('escalateTask', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts a task_approval, updates task to ESCALATED, audits, returns approvalId', async () => {
    mockInsert.mockReturnValue(makeInsertChain());
    mockUpdate.mockReturnValue(makeUpdateChain());

    const result = await escalateTask({
      taskId: 'task-1',
      organizationId: 'org-1',
      reason: 'Boundary violation detected',
    });

    expect(result).toEqual({ ok: true, approvalId: 'escalation-uuid' });
    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockAuditTaskEscalated).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task-1',
        escalationReason: 'Boundary violation detected',
        escalatedToRole: 'OWNER',
      }),
    );
  });

  it('defaults escalatedToRole to OWNER when not specified', async () => {
    mockInsert.mockReturnValue(makeInsertChain());
    mockUpdate.mockReturnValue(makeUpdateChain());

    await escalateTask({ taskId: 'task-1', organizationId: 'org-1', reason: 'test' });

    expect(mockAuditTaskEscalated).toHaveBeenCalledWith(
      expect.objectContaining({ escalatedToRole: 'OWNER' }),
    );
  });

  it('uses the provided escalatedToRole when specified', async () => {
    mockInsert.mockReturnValue(makeInsertChain());
    mockUpdate.mockReturnValue(makeUpdateChain());

    await escalateTask({
      taskId: 'task-1',
      organizationId: 'org-1',
      reason: 'test',
      escalatedToRole: 'ADMIN_OPERATIONS',
    });

    expect(mockAuditTaskEscalated).toHaveBeenCalledWith(
      expect.objectContaining({ escalatedToRole: 'ADMIN_OPERATIONS' }),
    );
  });
});
