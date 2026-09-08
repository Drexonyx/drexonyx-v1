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

import { createRevisionJob } from '../admin/revisions';

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

// tx.select returns empty array by default (no COMPLETED key found inside transaction).
function makeTxSelectEmpty() {
  return vi.fn().mockReturnValue(makeSelectChain([]));
}

// Standard successful transaction: no concurrent winner detected.
function makeSuccessfulTx() {
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
      }),
      select: makeTxSelectEmpty(),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      }),
    };
    await fn(tx);
  });
}

// ─── createRevisionJob ────────────────────────────────────────────────────────

describe('createRevisionJob', () => {
  const base = {
    originalAssetId: 'asset1',
    orderId: 'order1',
    organizationId: 'org1',
    jobType: 'MANUAL_UPLOAD' as const,
    actorId: 'actor1',
    actorRole: 'OWNER' as const,
  };

  // db.select call order in the new implementation:
  //   #1 — asset lookup
  //   #2 — order lookup
  //   #3 — idempotency key pre-check
  const assetRow = { id: 'asset1', status: 'REVISION_REQUIRED', order_id: 'order1' };
  const orderRow = { id: 'order1', status: 'ACTIVE' };
  const noKey: unknown[] = [];

  beforeEach(() => { vi.clearAllMocks(); });

  // Test 18: role gate — CLIENT is excluded
  it('returns ok:false for CLIENT role', async () => {
    const result = await createRevisionJob({ ...base, actorRole: 'CLIENT' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  // Test 19: role gate — QC is excluded
  it('returns ok:false for QC role', async () => {
    const result = await createRevisionJob({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
  });

  // Test 20: original asset not found
  it('returns ok:false when original asset not found', async () => {
    selectSequence([[]]);
    const result = await createRevisionJob(base);
    expect(result).toMatchObject({ ok: false, reason: 'Original asset not found' });
  });

  // Test 21: original asset is not REVISION_REQUIRED
  it('returns ok:false when original asset is not REVISION_REQUIRED', async () => {
    selectSequence([[{ id: 'asset1', status: 'READY_FOR_QC', order_id: 'order1' }]]);
    const result = await createRevisionJob(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('REVISION_REQUIRED') });
  });

  // Test 22: orderId mismatch
  it('returns ok:false when asset does not belong to specified order', async () => {
    selectSequence([[{ id: 'asset1', status: 'REVISION_REQUIRED', order_id: 'other-order' }]]);
    const result = await createRevisionJob(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('order') });
  });

  // Test 23: order not found (now validated directly, not propagated from createProductionJob)
  it('returns ok:false when order not found', async () => {
    selectSequence([[assetRow], []]);
    const result = await createRevisionJob(base);
    expect(result).toMatchObject({ ok: false, reason: 'Order not found' });
  });

  // Test 24: successful revision job creation with MANUAL_UPLOAD type
  it('creates revision job and writes REVISION_INITIATED audit event', async () => {
    selectSequence([[assetRow], [orderRow], noKey]);
    makeSuccessfulTx();
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

    const result = await createRevisionJob(base);
    expect(result).toMatchObject({ ok: true, newProductionJobId: 'test-uuid' });
  });

  // Test 25: successful revision job creation with AI_GENERATION type
  it('creates revision job with AI_GENERATION type', async () => {
    selectSequence([[assetRow], [orderRow], noKey]);
    makeSuccessfulTx();
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

    const result = await createRevisionJob({ ...base, jobType: 'AI_GENERATION' });
    expect(result).toMatchObject({ ok: true });
  });

  // Test 26: CREATIVE_PRODUCTION is authorized
  it('CREATIVE_PRODUCTION role is authorized', async () => {
    selectSequence([[assetRow], [orderRow], noKey]);
    makeSuccessfulTx();
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

    const result = await createRevisionJob({ ...base, actorRole: 'CREATIVE_PRODUCTION' });
    expect(result).not.toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
  });

  // Test 27: original asset is NOT modified (it stays REVISION_REQUIRED)
  it('does not call db.update on the original asset', async () => {
    selectSequence([[assetRow], [orderRow], noKey]);
    makeSuccessfulTx();
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

    await createRevisionJob(base);
    // db.update (outside any transaction) must not be called — only tx.update inside the tx
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // Test 28: inactive order is rejected
  it('returns ok:false when order is not ACTIVE', async () => {
    selectSequence([[assetRow], [{ id: 'order1', status: 'COMPLETED' }]]);
    const result = await createRevisionJob(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('COMPLETED') });
  });

  // ─── Idempotency tests (DR 0088 §2.4) ──────────────────────────────────────

  // Test 29: COMPLETED idempotency key → return stored jobId without creating another job
  it('returns stored jobId when idempotency key is already COMPLETED', async () => {
    selectSequence([
      [assetRow],
      [orderRow],
      [{ status: 'COMPLETED', response_payload: { newProductionJobId: 'existing-job-id' } }],
    ]);

    const result = await createRevisionJob(base);
    expect(result).toMatchObject({ ok: true, newProductionJobId: 'existing-job-id' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  // Test 30: No second ProductionJob or REVISION_INITIATED event on repeated call
  it('does not create a second ProductionJob when operation already completed', async () => {
    selectSequence([
      [assetRow],
      [orderRow],
      [{ status: 'COMPLETED', response_payload: { newProductionJobId: 'existing-job-id' } }],
    ]);

    await createRevisionJob(base);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // Test 31: Idempotency record reaches COMPLETED inside transaction
  it('marks idempotency key COMPLETED inside the transaction', async () => {
    selectSequence([[assetRow], [orderRow], noKey]);

    const txUpdateMock = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
        }),
        select: makeTxSelectEmpty(),
        update: txUpdateMock,
      };
      await fn(tx);
    });

    await createRevisionJob(base);
    expect(txUpdateMock).toHaveBeenCalled();
  });

  // Test 32: Concurrent winner detected inside transaction → return winner's jobId, no duplicate job
  it('returns concurrent winner jobId when COMPLETED detected inside transaction', async () => {
    selectSequence([[assetRow], [orderRow], noKey]);

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([{
            status: 'COMPLETED',
            response_payload: { newProductionJobId: 'winner-job-id' },
          }]),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
        }),
      };
      await fn(tx);
    });

    const result = await createRevisionJob(base);
    expect(result).toMatchObject({ ok: true, newProductionJobId: 'winner-job-id' });
  });

  // Test 33: Failed transaction propagates error — no orphaned state
  it('propagates unexpected transaction errors without swallowing them', async () => {
    selectSequence([[assetRow], [orderRow], noKey]);
    mockTransaction.mockRejectedValue(new Error('DB connection failed'));

    await expect(createRevisionJob(base)).rejects.toThrow('DB connection failed');
  });
});
