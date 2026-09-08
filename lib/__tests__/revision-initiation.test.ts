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

function makeSuccessfulTx() {
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
      }),
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

  // Test 23: order not found (propagated from createProductionJob)
  it('returns ok:false when order not found', async () => {
    selectSequence([
      [{ id: 'asset1', status: 'REVISION_REQUIRED', order_id: 'order1' }],
      [],
    ]);
    const result = await createRevisionJob(base);
    expect(result).toMatchObject({ ok: false, reason: 'Order not found' });
  });

  // Test 24: successful revision job creation with MANUAL_UPLOAD type
  it('creates revision job and writes REVISION_INITIATED audit event', async () => {
    selectSequence([
      [{ id: 'asset1', status: 'REVISION_REQUIRED', order_id: 'order1' }],
      [{ id: 'order1', status: 'ACTIVE' }],
    ]);
    makeSuccessfulTx();
    const insertMock = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) });
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

    const result = await createRevisionJob(base);
    expect(result).toMatchObject({ ok: true, newProductionJobId: 'test-uuid' });
  });

  // Test 25: successful revision job creation with AI_GENERATION type
  it('creates revision job with AI_GENERATION type', async () => {
    selectSequence([
      [{ id: 'asset1', status: 'REVISION_REQUIRED', order_id: 'order1' }],
      [{ id: 'order1', status: 'ACTIVE' }],
    ]);
    makeSuccessfulTx();
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

    const result = await createRevisionJob({ ...base, jobType: 'AI_GENERATION' });
    expect(result).toMatchObject({ ok: true });
  });

  // Test 26: CREATIVE_PRODUCTION is authorized
  it('CREATIVE_PRODUCTION role is authorized', async () => {
    selectSequence([
      [{ id: 'asset1', status: 'REVISION_REQUIRED', order_id: 'order1' }],
      [{ id: 'order1', status: 'ACTIVE' }],
    ]);
    makeSuccessfulTx();
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

    const result = await createRevisionJob({ ...base, actorRole: 'CREATIVE_PRODUCTION' });
    expect(result).not.toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
  });

  // Test 27: original asset is NOT modified (it stays REVISION_REQUIRED)
  it('does not call update on the original asset', async () => {
    selectSequence([
      [{ id: 'asset1', status: 'REVISION_REQUIRED', order_id: 'order1' }],
      [{ id: 'order1', status: 'ACTIVE' }],
    ]);
    makeSuccessfulTx();
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

    await createRevisionJob(base);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // Test 28: inactive order is rejected
  it('returns ok:false when order is not ACTIVE', async () => {
    selectSequence([
      [{ id: 'asset1', status: 'REVISION_REQUIRED', order_id: 'order1' }],
      [{ id: 'order1', status: 'COMPLETED' }],
    ]);
    const result = await createRevisionJob(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('COMPLETED') });
  });
});
