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

import { createProductionJob, cancelProductionJob } from '../admin/production-jobs';

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

// ─── createProductionJob ──────────────────────────────────────────────────────

describe('createProductionJob', () => {
  const base = {
    orderId: 'order1',
    organizationId: 'org1',
    jobType: 'MANUAL_UPLOAD' as const,
    actorId: 'actor1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false for AGENT role', async () => {
    const result = await createProductionJob({ ...base, actorRole: 'AGENT' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns ok:false for CLIENT role', async () => {
    const result = await createProductionJob({ ...base, actorRole: 'CLIENT' as never });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:false when order not found', async () => {
    selectSequence([[]]);
    const result = await createProductionJob(base);
    expect(result).toMatchObject({ ok: false, reason: 'Order not found' });
  });

  it('returns ok:false when order not ACTIVE', async () => {
    selectSequence([[{ id: 'order1', status: 'COMPLETED' }]]);
    const result = await createProductionJob(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('COMPLETED') });
  });

  it('returns ok:false when order is ACTIVE but no PAID payment exists', async () => {
    selectSequence([[{ id: 'order1', status: 'ACTIVE' }], []]);
    const result = await createProductionJob(base);
    expect(result).toMatchObject({ ok: false, reason: 'Cannot start production: no confirmed payment on record for this order.' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false when payment exists but is not PAID', async () => {
    selectSequence([[{ id: 'order1', status: 'ACTIVE' }], []]);
    const result = await createProductionJob(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('no confirmed payment') });
  });

  it('creates job and returns ok:true when PAID payment exists', async () => {
    selectSequence([[{ id: 'order1', status: 'ACTIVE' }], [{ id: 'pay1' }]]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
      };
      await fn(tx);
    });

    const result = await createProductionJob(base);
    expect(result).toMatchObject({ ok: true, jobId: 'test-uuid' });
  });

  it('CREATIVE_PRODUCTION role is allowed to create when payment is PAID', async () => {
    selectSequence([[{ id: 'order1', status: 'ACTIVE' }], [{ id: 'pay1' }]]);
    mockTransaction.mockResolvedValue(undefined);
    const result = await createProductionJob({ ...base, actorRole: 'CREATIVE_PRODUCTION' });
    expect(result).not.toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
  });

  it('AI_GENERATION jobType triggers ai_generation creation', async () => {
    selectSequence([[{ id: 'order1', status: 'ACTIVE' }], [{ id: 'pay1' }]]);
    const insertMock = vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: insertMock,
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
      };
      await fn(tx);
    });

    await createProductionJob({ ...base, jobType: 'AI_GENERATION' });
    // insert should be called at least 4 times: idempKey, job, aiGeneration, auditAiGen, auditJob
    expect(insertMock.mock.calls.length).toBeGreaterThanOrEqual(4);
  });
});

// ─── cancelProductionJob ──────────────────────────────────────────────────────

describe('cancelProductionJob', () => {
  const base = {
    jobId: 'job1',
    organizationId: 'org1',
    actorId: 'actor1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false for CREATIVE_PRODUCTION role', async () => {
    const result = await cancelProductionJob({ ...base, actorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns ok:true when idempotency key is COMPLETED', async () => {
    selectSequence([[{ status: 'COMPLETED' }]]);
    const result = await cancelProductionJob(base);
    expect(result).toMatchObject({ ok: true });
  });

  it('returns ok:false when job not found', async () => {
    selectSequence([[], []]);
    const result = await cancelProductionJob(base);
    expect(result).toMatchObject({ ok: false, reason: 'ProductionJob not found' });
  });

  it('returns ok:true when job is already CANCELLED', async () => {
    selectSequence([[], [{ id: 'job1', status: 'CANCELLED' }]]);
    const result = await cancelProductionJob(base);
    expect(result).toMatchObject({ ok: true });
  });

  it('returns ok:false when job is in terminal COMPLETED state', async () => {
    selectSequence([[], [{ id: 'job1', status: 'COMPLETED' }]]);
    const result = await cancelProductionJob(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('terminal') });
  });

  it('returns ok:false when job is in terminal FAILED state', async () => {
    selectSequence([[], [{ id: 'job1', status: 'FAILED' }]]);
    const result = await cancelProductionJob(base);
    expect(result).toMatchObject({ ok: false });
  });

  it('cancels a QUEUED job', async () => {
    selectSequence([[], [{ id: 'job1', status: 'QUEUED' }]]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'job1' }]) }) }) }),
      };
      await fn(tx);
    });

    const result = await cancelProductionJob(base);
    expect(result).toMatchObject({ ok: true });
  });

  it('returns ok:true on concurrent modification (idempotent)', async () => {
    selectSequence([[], [{ id: 'job1', status: 'QUEUED' }]]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }) }),
      };
      await fn(tx);
    });

    const result = await cancelProductionJob(base);
    expect(result).toMatchObject({ ok: true });
  });
});
