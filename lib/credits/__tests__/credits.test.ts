import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    transaction: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/db/index', () => ({ db: mockDb }));
vi.mock('uuidv7', () => ({ uuidv7: () => 'test-uuid-0000' }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function selectChain(rows: unknown[]) {
  // terminal must be awaitable (Drizzle queries implement Promise interface)
  // AND support chained .limit() / .orderBy() for queries that use them.
  const resolved = Promise.resolve(rows);
  const terminal = Object.assign(resolved, {
    limit: vi.fn().mockResolvedValue(rows),
    orderBy: vi.fn().mockResolvedValue(rows),
  });
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    where: vi.fn().mockReturnValue(terminal),
    orderBy: vi.fn().mockReturnValue(terminal),
  };
  chain.from.mockReturnValue(chain);
  return chain;
}

function makeTx(insertedRows: unknown[] = [{ id: 'test-uuid-0000' }]) {
  return {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(insertedRows),
        }),
        returning: vi.fn().mockResolvedValue(insertedRows),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(insertedRows),
      }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── allocateCredits ──────────────────────────────────────────────────────────

describe('allocateCredits', () => {
  it('writes PURCHASE ledger entry and returns ok:true', async () => {
    const tx = makeTx();
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof tx) => Promise<void>) => fn(tx));

    const { allocateCredits } = await import('../ledger');
    const result = await allocateCredits({
      organizationId: 'org-1',
      creditPurchaseId: 'purchase-1',
      credits: 500,
    });

    expect(result).toEqual({ ok: true });
    expect(tx.insert).toHaveBeenCalled();
  });

  it('returns ok:true on idempotent re-run (0 rows inserted)', async () => {
    const tx = makeTx([]);
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof tx) => Promise<void>) => fn(tx));

    const { allocateCredits } = await import('../ledger');
    const result = await allocateCredits({
      organizationId: 'org-1',
      creditPurchaseId: 'purchase-1',
      credits: 500,
    });

    expect(result).toEqual({ ok: true });
  });

  it('returns ok:false on DB error', async () => {
    mockDb.transaction.mockRejectedValue(new Error('Connection timeout'));

    const { allocateCredits } = await import('../ledger');
    const result = await allocateCredits({
      organizationId: 'org-1',
      creditPurchaseId: 'purchase-1',
      credits: 500,
    });

    expect(result).toEqual({ ok: false, reason: 'Connection timeout' });
  });
});

// ─── reserveCredits ───────────────────────────────────────────────────────────

describe('reserveCredits', () => {
  it('returns INSUFFICIENT_CREDITS when balance < cost', async () => {
    // No existing reservation
    mockDb.select
      .mockReturnValueOnce(selectChain([]))                           // existing check
      .mockReturnValueOnce(selectChain([{ total: '300' }]));         // balance check

    const { reserveCredits } = await import('../ledger');
    const result = await reserveCredits({
      organizationId: 'org-1',
      productionJobId: 'job-1',
      credits: 500,
    });

    expect(result).toEqual({ ok: false, reason: 'INSUFFICIENT_CREDITS' });
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('reserves credits when balance is sufficient', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain([]))                           // existing check
      .mockReturnValueOnce(selectChain([{ total: '1000' }]));        // balance check

    const tx = makeTx();
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof tx) => Promise<void>) => fn(tx));

    const { reserveCredits } = await import('../ledger');
    const result = await reserveCredits({
      organizationId: 'org-1',
      productionJobId: 'job-1',
      credits: 500,
    });

    expect(result).toEqual({ ok: true });
    expect(tx.insert).toHaveBeenCalled();
  });

  it('is idempotent — skips if reservation already exists', async () => {
    mockDb.select.mockReturnValueOnce(selectChain([{ id: 'existing-entry' }]));

    const { reserveCredits } = await import('../ledger');
    const result = await reserveCredits({
      organizationId: 'org-1',
      productionJobId: 'job-1',
      credits: 500,
    });

    expect(result).toEqual({ ok: true });
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('returns ok:false on DB error during reservation', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain([]))
      .mockReturnValueOnce(selectChain([{ total: '1000' }]));
    mockDb.transaction.mockRejectedValue(new Error('Deadlock detected'));

    const { reserveCredits } = await import('../ledger');
    const result = await reserveCredits({
      organizationId: 'org-1',
      productionJobId: 'job-1',
      credits: 500,
    });

    expect(result).toEqual({ ok: false, reason: 'Deadlock detected' });
  });

  it('treats balance = exact cost as sufficient', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain([]))
      .mockReturnValueOnce(selectChain([{ total: '500' }]));

    const tx = makeTx();
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof tx) => Promise<void>) => fn(tx));

    const { reserveCredits } = await import('../ledger');
    const result = await reserveCredits({
      organizationId: 'org-1',
      productionJobId: 'job-1',
      credits: 500,
    });

    expect(result).toEqual({ ok: true });
  });
});

// ─── releaseCredits ───────────────────────────────────────────────────────────

describe('releaseCredits', () => {
  it('writes RELEASE ledger entry and returns ok:true', async () => {
    const tx = makeTx();
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof tx) => Promise<void>) => fn(tx));

    const { releaseCredits } = await import('../ledger');
    const result = await releaseCredits({
      organizationId: 'org-1',
      productionJobId: 'job-1',
      credits: 500,
    });

    expect(result).toEqual({ ok: true });
    expect(tx.insert).toHaveBeenCalled();
  });

  it('is idempotent — does not error when release already exists', async () => {
    const tx = makeTx([]);
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof tx) => Promise<void>) => fn(tx));

    const { releaseCredits } = await import('../ledger');
    const result = await releaseCredits({
      organizationId: 'org-1',
      productionJobId: 'job-1',
      credits: 500,
    });

    expect(result).toEqual({ ok: true });
  });
});

// ─── adjustCredits ────────────────────────────────────────────────────────────

describe('adjustCredits', () => {
  it('returns error when creditsDelta is zero', async () => {
    const { adjustCredits } = await import('../ledger');
    const result = await adjustCredits({
      organizationId: 'org-1',
      creditsDelta: 0,
      actorId: 'admin-1',
      actorRole: 'OWNER',
      reason: 'Test adjustment',
      idempotencyKey: 'adj-1',
    });

    expect(result).toEqual({ ok: false, reason: 'Adjustment delta cannot be zero' });
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('writes ADJUSTMENT entry for positive delta', async () => {
    const tx = makeTx();
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof tx) => Promise<void>) => fn(tx));

    const { adjustCredits } = await import('../ledger');
    const result = await adjustCredits({
      organizationId: 'org-1',
      creditsDelta: 100,
      actorId: 'admin-1',
      actorRole: 'OWNER',
      reason: 'Goodwill credit',
      idempotencyKey: 'adj-2',
    });

    expect(result).toEqual({ ok: true });
  });

  it('writes ADJUSTMENT entry for negative delta', async () => {
    const tx = makeTx();
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof tx) => Promise<void>) => fn(tx));

    const { adjustCredits } = await import('../ledger');
    const result = await adjustCredits({
      organizationId: 'org-1',
      creditsDelta: -200,
      actorId: 'admin-1',
      actorRole: 'OWNER',
      reason: 'Correction',
      idempotencyKey: 'adj-3',
    });

    expect(result).toEqual({ ok: true });
  });
});

// ─── refundCredits ────────────────────────────────────────────────────────────

describe('refundCredits', () => {
  it('writes REFUND entry (negative delta) and returns ok:true', async () => {
    const tx = makeTx();
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof tx) => Promise<void>) => fn(tx));

    const { refundCredits } = await import('../ledger');
    const result = await refundCredits({
      organizationId: 'org-1',
      creditPurchaseId: 'purchase-1',
      credits: 500,
    });

    expect(result).toEqual({ ok: true });
    expect(tx.insert).toHaveBeenCalled();
  });

  it('is idempotent on duplicate refund', async () => {
    const tx = makeTx([]);
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof tx) => Promise<void>) => fn(tx));

    const { refundCredits } = await import('../ledger');
    const result = await refundCredits({
      organizationId: 'org-1',
      creditPurchaseId: 'purchase-1',
      credits: 500,
    });

    expect(result).toEqual({ ok: true });
  });
});

// ─── getCreditBalance ─────────────────────────────────────────────────────────

describe('getCreditBalance', () => {
  it('returns sum of credits_delta from ledger', async () => {
    mockDb.select.mockReturnValueOnce(selectChain([{ total: '1500' }]));

    const { getCreditBalance } = await import('../balance');
    const balance = await getCreditBalance('org-1');
    expect(balance).toBe(1500);
  });

  it('returns 0 when no ledger entries exist', async () => {
    mockDb.select.mockReturnValueOnce(selectChain([{ total: '0' }]));

    const { getCreditBalance } = await import('../balance');
    const balance = await getCreditBalance('org-1');
    expect(balance).toBe(0);
  });

  it('handles null/missing total', async () => {
    mockDb.select.mockReturnValueOnce(selectChain([{}]));

    const { getCreditBalance } = await import('../balance');
    const balance = await getCreditBalance('org-1');
    expect(balance).toBe(0);
  });
});
