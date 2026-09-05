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

vi.mock('uuidv7', () => ({ uuidv7: () => 'review-uuid' }));

import { createQcReview } from '../admin/qc';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const end = vi.fn().mockResolvedValue(result);
  return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: end };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('createQcReview', () => {
  const base = {
    assetId: 'asset1',
    organizationId: 'org1',
    verdict: 'PASS' as const,
    actorId: 'actor1',
    actorRole: 'QC' as const,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false for CREATIVE_PRODUCTION role', async () => {
    const result = await createQcReview({ ...base, actorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns ok:false for CLIENT role', async () => {
    const result = await createQcReview({ ...base, actorRole: 'CLIENT' as never });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:false when asset not found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const result = await createQcReview(base);
    expect(result).toMatchObject({ ok: false, reason: 'Asset not found' });
  });

  it('returns ok:false when asset not READY_FOR_QC', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'UPLOADED' }]));
    const result = await createQcReview(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('READY_FOR_QC') });
  });

  it('returns ok:false when asset is CLIENT_PREVIEW (already passed QC)', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'CLIENT_PREVIEW' }]));
    const result = await createQcReview(base);
    expect(result).toMatchObject({ ok: false });
  });

  it('PASS verdict transitions asset to CLIENT_PREVIEW', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'READY_FOR_QC' }]));
    const insertMock = vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) });
    const updateMock = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'asset1' }]) }) }) });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ insert: insertMock, update: updateMock });
    });

    const result = await createQcReview(base);
    expect(result).toMatchObject({ ok: true, reviewId: 'review-uuid' });
    // Verify update was called (transitions asset status)
    expect(updateMock).toHaveBeenCalled();
  });

  it('FAIL verdict is allowed and returns ok:true', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'READY_FOR_QC' }]));
    const insertMock = vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) });
    const updateMock = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'asset1' }]) }) }) });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ insert: insertMock, update: updateMock });
    });

    const result = await createQcReview({ ...base, verdict: 'FAIL' });
    expect(result).toMatchObject({ ok: true });
  });

  it('OWNER and ADMIN_OPERATIONS are also authorized', async () => {
    for (const role of ['OWNER', 'ADMIN_OPERATIONS'] as const) {
      vi.clearAllMocks();
      mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'READY_FOR_QC' }]));
      mockTransaction.mockResolvedValue(undefined);
      const result = await createQcReview({ ...base, actorRole: role });
      expect(result).not.toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    }
  });

  it('returns ok:false on concurrent modification', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'READY_FOR_QC' }]));
    const insertMock = vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) });
    const updateMock = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }) });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ insert: insertMock, update: updateMock });
    });

    const result = await createQcReview(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('READY_FOR_QC') });
  });
});
