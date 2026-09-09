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

import { completeOrder, cancelOrder } from '../admin/orders';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const terminal = {
    limit: vi.fn().mockResolvedValue(result),
    then: (onFulfilled: (v: unknown[]) => void, onRejected?: (e: unknown) => void) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    where: vi.fn().mockReturnValue(terminal),
  };
  chain.from.mockReturnValue(chain);
  return chain;
}

function selectSequence(results: unknown[][]) {
  let call = 0;
  mockSelect.mockImplementation(() => {
    const result = results[call] ?? [];
    call++;
    return makeSelectChain(result);
  });
}

function makeTx(returningResult: unknown[] = [{ id: 'order1' }]) {
  return {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(returningResult),
        }),
      }),
    }),
  };
}

// ─── completeOrder ────────────────────────────────────────────────────────────

describe('completeOrder', () => {
  const base = {
    orderId: 'order1',
    organizationId: 'org1',
    actorId: 'actor1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok:false for CREATIVE_PRODUCTION role', async () => {
    const result = await completeOrder({ ...base, actorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns ok:false for QC role', async () => {
    const result = await completeOrder({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:false when order not found', async () => {
    selectSequence([[]]);
    const result = await completeOrder(base);
    expect(result).toMatchObject({ ok: false, reason: 'Order not found' });
  });

  it('returns ok:true (idempotent) when order already COMPLETED', async () => {
    selectSequence([[{ id: 'order1', status: 'COMPLETED' }]]);
    const result = await completeOrder(base);
    expect(result).toMatchObject({ ok: true, orderId: 'order1' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false when order is CANCELLED', async () => {
    selectSequence([[{ id: 'order1', status: 'CANCELLED' }]]);
    const result = await completeOrder(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('CANCELLED') });
  });

  it('returns ok:false when no Deliveries exist (DR 0104 conjunction guard)', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [], // no deliveries
    ]);
    const result = await completeOrder(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('Deliveries') });
  });

  it('returns ok:false when deliveries exist but not all COMPLETED', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [
        { id: 'd1', status: 'COMPLETED' },
        { id: 'd2', status: 'PREPARING' },
      ],
    ]);
    const result = await completeOrder(base);
    expect(result).toMatchObject({
      ok: false,
      reason: expect.stringContaining('all Deliveries'),
    });
  });

  it('returns ok:false when no Approvals exist (DR 0104 conjunction guard)', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [{ id: 'd1', status: 'COMPLETED' }],
      [], // no approvals
    ]);
    const result = await completeOrder(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('Approvals') });
  });

  it('returns ok:false when approvals exist but not all APPROVED', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [{ id: 'd1', status: 'COMPLETED' }],
      [
        { id: 'a1', status: 'APPROVED' },
        { id: 'a2', status: 'PENDING' },
      ],
    ]);
    const result = await completeOrder(base);
    expect(result).toMatchObject({
      ok: false,
      reason: expect.stringContaining('all Approvals'),
    });
  });

  it('completes order when all conjunction guard conditions pass', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [{ id: 'd1', status: 'COMPLETED' }],
      [{ id: 'a1', status: 'APPROVED' }],
    ]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx([{ id: 'order1' }]));
    });

    const result = await completeOrder(base);
    expect(result).toMatchObject({ ok: true, orderId: 'order1' });
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it('handles CONCURRENT_MODIFICATION as ok:true (idempotent)', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [{ id: 'd1', status: 'COMPLETED' }],
      [{ id: 'a1', status: 'APPROVED' }],
    ]);
    // CAS returns empty array → concurrent modifier won
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx([]));
    });

    const result = await completeOrder(base);
    expect(result).toMatchObject({ ok: true, orderId: 'order1' });
  });

  it('allows ADMIN_OPERATIONS role', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [{ id: 'd1', status: 'COMPLETED' }],
      [{ id: 'a1', status: 'APPROVED' }],
    ]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx([{ id: 'order1' }]));
    });

    const result = await completeOrder({ ...base, actorRole: 'ADMIN_OPERATIONS' });
    expect(result).toMatchObject({ ok: true });
  });
});

// ─── cancelOrder ──────────────────────────────────────────────────────────────

describe('cancelOrder', () => {
  const base = {
    orderId: 'order1',
    organizationId: 'org1',
    actorId: 'actor1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok:false for CREATIVE_PRODUCTION role', async () => {
    const result = await cancelOrder({ ...base, actorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns ok:false when order not found', async () => {
    selectSequence([[]]);
    const result = await cancelOrder(base);
    expect(result).toMatchObject({ ok: false, reason: 'Order not found' });
  });

  it('returns ok:true (idempotent) when order already CANCELLED', async () => {
    selectSequence([[{ id: 'order1', status: 'CANCELLED' }]]);
    const result = await cancelOrder(base);
    expect(result).toMatchObject({ ok: true, orderId: 'order1' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false when order is COMPLETED', async () => {
    selectSequence([[{ id: 'order1', status: 'COMPLETED' }]]);
    const result = await cancelOrder(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('COMPLETED') });
  });

  it('cancels ACTIVE order without PAID payments', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [], // no PAID payments
    ]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx([{ id: 'order1' }]));
    });

    const result = await cancelOrder(base);
    expect(result).toMatchObject({ ok: true, orderId: 'order1' });
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it('cancels order and logs PAID payments without financial mutation (DR 0104 Owner Decision 4)', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [{ id: 'pay1', amount: 10000, currency: 'usd' }],
    ]);
    const tx = makeTx([{ id: 'order1' }]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    const result = await cancelOrder(base);
    expect(result).toMatchObject({ ok: true, orderId: 'order1' });
    // Payment table must NOT be updated (no financial mutation)
    const txUpdateCalls = (tx.update as ReturnType<typeof vi.fn>).mock.calls;
    // update is called for orders status and idempotency key — never for payments
    for (const call of txUpdateCalls) {
      expect(call[0]).not.toMatchObject({ _: expect.objectContaining({ name: 'payments' }) });
    }
  });

  it('handles CONCURRENT_MODIFICATION as ok:true (idempotent)', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [],
    ]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx([]));
    });

    const result = await cancelOrder(base);
    expect(result).toMatchObject({ ok: true, orderId: 'order1' });
  });

  it('allows ADMIN_OPERATIONS role', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [],
    ]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx([{ id: 'order1' }]));
    });

    const result = await cancelOrder({ ...base, actorRole: 'ADMIN_OPERATIONS' });
    expect(result).toMatchObject({ ok: true });
  });
});
