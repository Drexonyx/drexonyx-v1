import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockUpdate, mockTransaction } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    transaction: mockTransaction,
  },
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-uuid' }));

import { createApproval, cancelApproval } from '../admin/approvals';
import { decideApproval } from '../portal/approvals';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const end = vi.fn().mockResolvedValue(result);
  return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: end };
}

function selectSequence(results: unknown[][]) {
  let call = 0;
  mockSelect.mockImplementation(() => {
    const result = results[call] ?? [];
    call++;
    return makeSelectChain(result);
  });
}

// ─── createApproval ───────────────────────────────────────────────────────────

describe('createApproval', () => {
  const base = {
    orderId: 'order1',
    organizationId: 'org1',
    targetType: 'ASSET' as const,
    targetId: 'asset1',
    actorId: 'actor1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false for QC role', async () => {
    const result = await createApproval({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns ok:false for CREATIVE_PRODUCTION role', async () => {
    const result = await createApproval({ ...base, actorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:false when order not found', async () => {
    selectSequence([[]]);
    const result = await createApproval(base);
    expect(result).toMatchObject({ ok: false, reason: 'Order not found' });
  });

  it('returns ok:false when order not ACTIVE', async () => {
    selectSequence([[{ id: 'order1', status: 'CANCELLED' }]]);
    const result = await createApproval(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('CANCELLED') });
  });

  it('returns ok:false when asset not found (ASSET target)', async () => {
    selectSequence([[{ id: 'order1', status: 'ACTIVE' }], []]);
    const result = await createApproval(base);
    expect(result).toMatchObject({ ok: false, reason: 'Asset not found' });
  });

  it('returns ok:false when asset belongs to different order', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [{ id: 'asset1', status: 'CLIENT_PREVIEW', order_id: 'other-order' }],
    ]);
    const result = await createApproval(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('belong') });
  });

  it('returns ok:false when asset not in CLIENT_PREVIEW status', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [{ id: 'asset1', status: 'READY_FOR_QC', order_id: 'order1' }],
    ]);
    const result = await createApproval(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('CLIENT_PREVIEW') });
  });

  it('creates approval and returns ok:true for ASSET target', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [{ id: 'asset1', status: 'CLIENT_PREVIEW', order_id: 'order1' }],
    ]);
    mockTransaction.mockResolvedValue(undefined);

    const result = await createApproval(base);
    expect(result).toMatchObject({ ok: true, approvalId: 'test-uuid' });
  });

  it('QUOTE target skips asset validation', async () => {
    selectSequence([[{ id: 'order1', status: 'ACTIVE' }]]);
    mockTransaction.mockResolvedValue(undefined);

    const result = await createApproval({ ...base, targetType: 'QUOTE', targetId: 'quote1' });
    expect(result).toMatchObject({ ok: true });
    // Only one select call (order check, no asset check)
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it('ADMIN_OPERATIONS is also authorized', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [{ id: 'asset1', status: 'CLIENT_PREVIEW', order_id: 'order1' }],
    ]);
    mockTransaction.mockResolvedValue(undefined);

    const result = await createApproval({ ...base, actorRole: 'ADMIN_OPERATIONS' });
    expect(result).toMatchObject({ ok: true });
  });
});

// ─── cancelApproval ───────────────────────────────────────────────────────────

describe('cancelApproval', () => {
  const base = {
    approvalId: 'approval1',
    organizationId: 'org1',
    actorId: 'actor1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false for QC role', async () => {
    const result = await cancelApproval({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns ok:false when approval not found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const result = await cancelApproval(base);
    expect(result).toMatchObject({ ok: false, reason: 'Approval not found' });
  });

  it('returns ok:true when approval already CANCELLED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'approval1', status: 'CANCELLED' }]));
    const result = await cancelApproval(base);
    expect(result).toMatchObject({ ok: true });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false when approval is APPROVED (non-PENDING terminal)', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'approval1', status: 'APPROVED' }]));
    const result = await cancelApproval(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('APPROVED') });
  });

  it('cancels a PENDING approval', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'approval1', status: 'PENDING' }]));
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'approval1' }]) }) }) }),
      };
      await fn(tx);
    });

    const result = await cancelApproval(base);
    expect(result).toMatchObject({ ok: true });
  });

  it('returns ok:true on concurrent modification (idempotent)', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'approval1', status: 'PENDING' }]));
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }) }),
      };
      await fn(tx);
    });

    const result = await cancelApproval(base);
    expect(result).toMatchObject({ ok: true });
  });
});

// ─── decideApproval (portal CLIENT) ──────────────────────────────────────────

describe('decideApproval', () => {
  const base = {
    approvalId: 'approval1',
    organizationId: 'org1',
    decision: 'APPROVED' as const,
    actorId: 'client1',
    actorRole: 'CLIENT',
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false for OWNER role (DR 0029 constraint 1)', async () => {
    const result = await decideApproval({ ...base, actorRole: 'OWNER' });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns ok:false for ADMIN_OPERATIONS role', async () => {
    const result = await decideApproval({ ...base, actorRole: 'ADMIN_OPERATIONS' });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:true when idempotency key is COMPLETED', async () => {
    mockSelect.mockReturnValueOnce(makeSelectChain([{ id: 'approval1', status: 'PENDING', target_type: 'ASSET', expires_at: null }]));
    // Second call for idempotency check
    const idempEnd = vi.fn().mockResolvedValue([{ status: 'COMPLETED' }]);
    mockSelect.mockReturnValueOnce({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: idempEnd });
    const result = await decideApproval(base);
    expect(result).toMatchObject({ ok: true });
  });

  it('returns ok:false when approval not found', async () => {
    selectSequence([[], []]);
    const result = await decideApproval(base);
    expect(result).toMatchObject({ ok: false, reason: 'Approval not found' });
  });

  it('returns ok:false when approval not PENDING (DR 0029 constraint 3)', async () => {
    selectSequence([[{ id: 'approval1', status: 'APPROVED', target_type: 'ASSET', expires_at: null }], []]);
    const result = await decideApproval(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('not pending') });
  });

  it('returns ok:false when approval is expired (DR 0029 constraint 4)', async () => {
    const pastDate = new Date(Date.now() - 1000);
    selectSequence([[{ id: 'approval1', status: 'PENDING', target_type: 'ASSET', expires_at: pastDate }], []]);
    const result = await decideApproval(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('expired') });
  });

  it('returns ok:false for QUOTE target_type (DR 0029 constraint 5)', async () => {
    selectSequence([[{ id: 'approval1', status: 'PENDING', target_type: 'QUOTE', expires_at: null }], []]);
    const result = await decideApproval(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('ASSET') });
  });

  it('decides APPROVED for a valid PENDING ASSET approval', async () => {
    selectSequence([[{ id: 'approval1', status: 'PENDING', target_type: 'ASSET', expires_at: null }], []]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'approval1' }]) }) }) }),
      };
      await fn(tx);
    });

    const result = await decideApproval(base);
    expect(result).toMatchObject({ ok: true });
  });

  it('decides REJECTED for a valid PENDING ASSET approval', async () => {
    selectSequence([[{ id: 'approval1', status: 'PENDING', target_type: 'ASSET', expires_at: null }], []]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'approval1' }]) }) }) }),
      };
      await fn(tx);
    });

    const result = await decideApproval({ ...base, decision: 'REJECTED' });
    expect(result).toMatchObject({ ok: true });
  });
});
