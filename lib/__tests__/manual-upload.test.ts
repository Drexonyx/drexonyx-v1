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

import { markManualAssetReadyForQc, completeManualUploadJob } from '../admin/manual-upload';

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

function makeSuccessfulTx() {
  return mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'asset1' }]) }),
        }),
      }),
    };
    await fn(tx);
  });
}

// ─── markManualAssetReadyForQc ────────────────────────────────────────────────

describe('markManualAssetReadyForQc', () => {
  const base = {
    assetId: 'asset1',
    organizationId: 'org1',
    actorId: 'actor1',
    actorRole: 'CREATIVE_PRODUCTION' as const,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  // Test 1: role gate — QC is excluded
  it('returns ok:false for QC role', async () => {
    const result = await markManualAssetReadyForQc({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  // Test 2: role gate — AGENT is excluded
  it('returns ok:false for AGENT role', async () => {
    const result = await markManualAssetReadyForQc({ ...base, actorRole: 'AGENT' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
  });

  // Test 3: asset not found
  it('returns ok:false when asset not found', async () => {
    selectSequence([[]]);
    const result = await markManualAssetReadyForQc(base);
    expect(result).toMatchObject({ ok: false, reason: 'Asset not found' });
  });

  // Test 4: wrong status (not UPLOADED)
  it('returns ok:false when asset is not UPLOADED', async () => {
    selectSequence([[{ id: 'asset1', status: 'READY_FOR_QC', order_id: 'order1' }]]);
    const result = await markManualAssetReadyForQc(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('UPLOADED') });
  });

  // Test 5: no MANUAL_UPLOAD job for the order
  it('returns ok:false when no MANUAL_UPLOAD job found for the order', async () => {
    selectSequence([
      [{ id: 'asset1', status: 'UPLOADED', order_id: 'order1' }],
      [],
    ]);
    const result = await markManualAssetReadyForQc(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('MANUAL_UPLOAD') });
  });

  // Test 6: idempotency — already completed
  it('returns ok:true recorded:false when already completed (idempotent)', async () => {
    selectSequence([
      [{ id: 'asset1', status: 'UPLOADED', order_id: 'order1' }],
      [{ id: 'job1' }],
      [{ status: 'COMPLETED' }],
    ]);
    const result = await markManualAssetReadyForQc(base);
    expect(result).toMatchObject({ ok: true, recorded: false, reason: 'already_recorded' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  // Test 7: successful transition — UPLOADED → READY_FOR_QC
  it('transitions asset UPLOADED → READY_FOR_QC and returns ok:true recorded:true', async () => {
    selectSequence([
      [{ id: 'asset1', status: 'UPLOADED', order_id: 'order1' }],
      [{ id: 'job1' }],
      [],
    ]);
    makeSuccessfulTx();
    const result = await markManualAssetReadyForQc(base);
    expect(result).toMatchObject({ ok: true, recorded: true });
    expect(mockTransaction).toHaveBeenCalled();
  });

  // Test 8: OWNER role is authorized
  it('OWNER role is authorized', async () => {
    selectSequence([
      [{ id: 'asset1', status: 'UPLOADED', order_id: 'order1' }],
      [{ id: 'job1' }],
      [],
    ]);
    makeSuccessfulTx();
    const result = await markManualAssetReadyForQc({ ...base, actorRole: 'OWNER' });
    expect(result).not.toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
  });

  // Test 9: concurrent modification returns ok:false
  it('returns ok:false on concurrent modification (CAS miss)', async () => {
    selectSequence([
      [{ id: 'asset1', status: 'UPLOADED', order_id: 'order1' }],
      [{ id: 'job1' }],
      [],
    ]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
          }),
        }),
      };
      await fn(tx);
    });
    const result = await markManualAssetReadyForQc(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('concurrent') });
  });
});

// ─── completeManualUploadJob ──────────────────────────────────────────────────

describe('completeManualUploadJob', () => {
  const base = {
    productionJobId: 'job1',
    organizationId: 'org1',
    actorId: 'actor1',
    actorRole: 'CREATIVE_PRODUCTION' as const,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  // Test 10 (within this describe): role gate
  it('returns ok:false for QC role', async () => {
    const result = await completeManualUploadJob({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
  });

  // Test 11: job not found
  it('returns ok:false when job not found', async () => {
    selectSequence([[], []]);
    const result = await completeManualUploadJob(base);
    expect(result).toMatchObject({ ok: false, reason: 'ProductionJob not found' });
  });

  // Test 12: job is not MANUAL_UPLOAD type
  it('returns ok:false when job is not MANUAL_UPLOAD type', async () => {
    selectSequence([
      [],
      [{ id: 'job1', status: 'QUEUED', order_id: 'order1', job_type: 'AI_GENERATION' }],
    ]);
    const result = await completeManualUploadJob(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('MANUAL_UPLOAD') });
  });

  // Test 13: job already COMPLETED (idempotent)
  it('returns ok:true when job is already COMPLETED', async () => {
    selectSequence([
      [],
      [{ id: 'job1', status: 'COMPLETED', order_id: 'order1', job_type: 'MANUAL_UPLOAD' }],
    ]);
    const result = await completeManualUploadJob(base);
    expect(result).toMatchObject({ ok: true });
  });

  // Test 14: job in wrong status (RUNNING)
  it('returns ok:false when job status is not QUEUED', async () => {
    selectSequence([
      [],
      [{ id: 'job1', status: 'RUNNING', order_id: 'order1', job_type: 'MANUAL_UPLOAD' }],
    ]);
    const result = await completeManualUploadJob(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('QUEUED') });
  });

  // Test 15: no asset at READY_FOR_QC or beyond
  it('returns ok:false when no asset has reached READY_FOR_QC', async () => {
    selectSequence([
      [],
      [{ id: 'job1', status: 'QUEUED', order_id: 'order1', job_type: 'MANUAL_UPLOAD' }],
      [],
    ]);
    const result = await completeManualUploadJob(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('READY_FOR_QC') });
  });

  // Test 16: successful completion
  it('transitions job QUEUED → COMPLETED and returns ok:true', async () => {
    selectSequence([
      [],
      [{ id: 'job1', status: 'QUEUED', order_id: 'order1', job_type: 'MANUAL_UPLOAD' }],
      [{ id: 'asset1' }],
    ]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'job1' }]) }),
          }),
        }),
      };
      await fn(tx);
    });
    const result = await completeManualUploadJob(base);
    expect(result).toMatchObject({ ok: true });
  });

  // Test 17: idempotency key already COMPLETED
  it('returns ok:true when idempotency key already COMPLETED', async () => {
    selectSequence([[{ status: 'COMPLETED' }]]);
    const result = await completeManualUploadJob(base);
    expect(result).toMatchObject({ ok: true });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
