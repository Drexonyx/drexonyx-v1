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

import {
  createDelivery,
  sendDelivery,
  completeDelivery,
  failDelivery,
  cancelDelivery,
} from '../admin/deliveries';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const end = vi.fn().mockResolvedValue(result);
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: end,
    // For count queries that don't call .limit()
    then: undefined,
  };
}

// count() queries don't call .limit() — they resolve directly from .where()
function makeCountSelectChain(result: unknown[]) {
  const end = vi.fn().mockResolvedValue(result);
  return { from: vi.fn().mockReturnThis(), where: end };
}

function selectSequence(results: Array<{ type: 'limit' | 'count'; data: unknown[] }>) {
  let call = 0;
  mockSelect.mockImplementation(() => {
    const spec = results[call];
    call++;
    if (!spec) return makeSelectChain([]);
    if (spec.type === 'count') return makeCountSelectChain(spec.data);
    return makeSelectChain(spec.data);
  });
}

function makeTx() {
  return {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'del1' }]) }) }) }),
  };
}

// ─── createDelivery ───────────────────────────────────────────────────────────

describe('createDelivery', () => {
  const base = {
    orderId: 'order1',
    organizationId: 'org1',
    assetIds: ['asset1'],
    actorId: 'actor1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false for QC role', async () => {
    const result = await createDelivery({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns ok:false when assetIds is empty', async () => {
    const result = await createDelivery({ ...base, assetIds: [] });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('least one') });
  });

  it('returns ok:false when order not found', async () => {
    selectSequence([{ type: 'limit', data: [] }]);
    const result = await createDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: 'Order not found' });
  });

  it('returns ok:false when order not ACTIVE (DR 0034)', async () => {
    selectSequence([{ type: 'limit', data: [{ id: 'order1', status: 'COMPLETED' }] }]);
    const result = await createDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('ACTIVE') });
  });

  it('blocks and audits when no approvals exist (DR 0034)', async () => {
    selectSequence([
      { type: 'limit', data: [{ id: 'order1', status: 'ACTIVE' }] },
      { type: 'limit', data: [] }, // no approvals — getAdminApprovals doesn't use .limit()
    ]);
    // The approvals query doesn't call .limit() so we need different mocking
    let call = 0;
    mockSelect.mockImplementation(() => {
      call++;
      if (call === 1) return makeSelectChain([{ id: 'order1', status: 'ACTIVE' }]); // order
      // approvals — no limit call
      const noApprovals = vi.fn().mockResolvedValue([]);
      return { from: vi.fn().mockReturnThis(), where: noApprovals };
    });
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

    const result = await createDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('Approval') });
    expect(mockInsert).toHaveBeenCalled(); // DELIVERY_CREATION_BLOCKED audit
  });

  it('blocks when approvals exist but not all APPROVED (DR 0034)', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      call++;
      if (call === 1) return makeSelectChain([{ id: 'order1', status: 'ACTIVE' }]);
      const pendingApproval = vi.fn().mockResolvedValue([{ id: 'a1', status: 'PENDING' }]);
      return { from: vi.fn().mockReturnThis(), where: pendingApproval };
    });
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

    const result = await createDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('APPROVED') });
  });

  it('creates delivery when all gates pass', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      call++;
      if (call === 1) return makeSelectChain([{ id: 'order1', status: 'ACTIVE' }]);
      if (call === 2) {
        const approvedApprovals = vi.fn().mockResolvedValue([{ id: 'a1', status: 'APPROVED' }]);
        return { from: vi.fn().mockReturnThis(), where: approvedApprovals };
      }
      // assets
      const assetList = vi.fn().mockResolvedValue([{ id: 'asset1', order_id: 'order1' }]);
      return { from: vi.fn().mockReturnThis(), where: assetList };
    });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });

    const result = await createDelivery(base);
    expect(result).toMatchObject({ ok: true, deliveryId: 'test-uuid' });
  });
});

// ─── sendDelivery ─────────────────────────────────────────────────────────────

describe('sendDelivery', () => {
  const base = {
    deliveryId: 'del1',
    organizationId: 'org1',
    actorId: 'actor1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false for CREATIVE_PRODUCTION role', async () => {
    const result = await sendDelivery({ ...base, actorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:false when delivery not found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const result = await sendDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: 'Delivery not found' });
  });

  it('returns ok:true when delivery already SENDING', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'SENDING' }]));
    const result = await sendDelivery(base);
    expect(result).toMatchObject({ ok: true });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false when delivery is COMPLETED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'COMPLETED' }]));
    const result = await sendDelivery(base);
    expect(result).toMatchObject({ ok: false });
  });

  it('transitions PREPARING→SENDING', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'PREPARING' }]));
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });

    const result = await sendDelivery(base);
    expect(result).toMatchObject({ ok: true });
  });
});

// ─── completeDelivery ─────────────────────────────────────────────────────────

describe('completeDelivery', () => {
  const base = {
    deliveryId: 'del1',
    organizationId: 'org1',
    actorId: 'actor1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false for QC role', async () => {
    const result = await completeDelivery({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:false when delivery not found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const result = await completeDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: 'Delivery not found' });
  });

  it('returns ok:true when delivery already COMPLETED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'COMPLETED' }]));
    const result = await completeDelivery(base);
    expect(result).toMatchObject({ ok: true });
  });

  it('returns ok:false when delivery not in SENDING state', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'PREPARING' }]));
    const result = await completeDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('SENDING') });
  });

  it('returns ok:false when delivery has no assets (DR 0037 §2.4)', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      call++;
      if (call === 1) return makeSelectChain([{ id: 'del1', status: 'SENDING' }]);
      // count query — no .limit()
      const noAssets = vi.fn().mockResolvedValue([{ count: 0 }]);
      return { from: vi.fn().mockReturnThis(), where: noAssets };
    });

    const result = await completeDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('no associated assets') });
  });

  it('transitions SENDING→COMPLETED with assets present', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      call++;
      if (call === 1) return makeSelectChain([{ id: 'del1', status: 'SENDING' }]);
      if (call === 2) {
        const assetCount = vi.fn().mockResolvedValue([{ count: 2 }]);
        return { from: vi.fn().mockReturnThis(), where: assetCount };
      }
      return makeSelectChain([]); // idempotency check
    });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });

    const result = await completeDelivery(base);
    expect(result).toMatchObject({ ok: true });
  });
});

// ─── failDelivery ─────────────────────────────────────────────────────────────

describe('failDelivery', () => {
  const base = {
    deliveryId: 'del1',
    organizationId: 'org1',
    failureReason: 'Network error',
    actorId: 'actor1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false when failureReason is empty', async () => {
    const result = await failDelivery({ ...base, failureReason: '   ' });
    expect(result).toMatchObject({ ok: false, reason: 'failure_reason is required' });
  });

  it('returns ok:false when delivery not in SENDING state', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'PREPARING' }]));
    const result = await failDelivery(base);
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:true when delivery already FAILED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'FAILED' }]));
    const result = await failDelivery(base);
    expect(result).toMatchObject({ ok: true });
  });

  it('transitions SENDING→FAILED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'SENDING' }]));
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });

    const result = await failDelivery(base);
    expect(result).toMatchObject({ ok: true });
  });
});

// ─── cancelDelivery ───────────────────────────────────────────────────────────

describe('cancelDelivery', () => {
  const base = {
    deliveryId: 'del1',
    organizationId: 'org1',
    actorId: 'actor1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false for QC role', async () => {
    const result = await cancelDelivery({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:false when delivery not found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const result = await cancelDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: 'Delivery not found' });
  });

  it('returns ok:true when delivery already CANCELLED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'CANCELLED' }]));
    const result = await cancelDelivery(base);
    expect(result).toMatchObject({ ok: true });
  });

  it('returns ok:false when delivery is COMPLETED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'COMPLETED' }]));
    const result = await cancelDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('terminal') });
  });

  it('returns ok:false when delivery is FAILED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'FAILED' }]));
    const result = await cancelDelivery(base);
    expect(result).toMatchObject({ ok: false });
  });

  it('cancels a PREPARING delivery', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'PREPARING' }]));
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });

    const result = await cancelDelivery(base);
    expect(result).toMatchObject({ ok: true });
  });

  it('cancels a SENDING delivery', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'SENDING' }]));
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });

    const result = await cancelDelivery(base);
    expect(result).toMatchObject({ ok: true });
  });
});
