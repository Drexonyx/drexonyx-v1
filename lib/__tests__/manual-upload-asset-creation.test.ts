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

import { createManualUploadAsset } from '../admin/manual-upload';

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

// Simulates a successful transaction: idempotency insert + re-read (empty = no winner) + asset insert + audit insert + idempotency update.
function makeSuccessfulTx() {
  return mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
      }),
      select: vi.fn().mockReturnValue(makeSelectChain([])), // idempotency re-read inside tx → no winner
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };
    await fn(tx);
  });
}

// Simulates the concurrent winner path: idempotency re-read returns COMPLETED with a stored assetId.
function makeConcurrentWinnerTx(winnerAssetId: string) {
  return mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
      }),
      select: vi.fn().mockReturnValue(
        makeSelectChain([{ status: 'COMPLETED', response_payload: { assetId: winnerAssetId } }]),
      ),
      update: vi.fn(),
    };
    await fn(tx);
  });
}

// ─── createManualUploadAsset ──────────────────────────────────────────────────

describe('createManualUploadAsset', () => {
  const base = {
    productionJobId: 'job1',
    organizationId: 'org1',
    actorId: 'actor1',
    actorRole: 'CREATIVE_PRODUCTION' as const,
  };

  const queuedManualJob = {
    id: 'job1',
    status: 'QUEUED',
    job_type: 'MANUAL_UPLOAD',
    order_id: 'order1',
  };

  beforeEach(() => { vi.clearAllMocks(); });

  // Role gate tests

  it('returns ok:false for QC role', async () => {
    const result = await createManualUploadAsset({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns ok:false for AGENT role', async () => {
    const result = await createManualUploadAsset({ ...base, actorRole: 'AGENT' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  // Job validation tests

  it('returns ok:false when ProductionJob not found', async () => {
    selectSequence([[]]);
    const result = await createManualUploadAsset(base);
    expect(result).toMatchObject({ ok: false, reason: 'ProductionJob not found' });
  });

  it('returns ok:false when job is not MANUAL_UPLOAD type', async () => {
    selectSequence([[{ ...queuedManualJob, job_type: 'AI_GENERATION' }]]);
    const result = await createManualUploadAsset(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('not a MANUAL_UPLOAD') });
  });

  it('returns ok:false when job is not QUEUED', async () => {
    selectSequence([[{ ...queuedManualJob, status: 'COMPLETED' }]]);
    const result = await createManualUploadAsset(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('QUEUED') });
  });

  // Idempotency tests

  it('returns ok:true with stored assetId when idempotency key already COMPLETED', async () => {
    selectSequence([
      [queuedManualJob],
      [{ status: 'COMPLETED', response_payload: { assetId: 'existing-asset' } }],
    ]);
    const result = await createManualUploadAsset(base);
    expect(result).toMatchObject({ ok: true, assetId: 'existing-asset' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  // Successful creation

  it('creates asset at UPLOADED status and returns ok:true', async () => {
    selectSequence([
      [queuedManualJob],
      [], // idempotency key not found
    ]);
    makeSuccessfulTx();
    const result = await createManualUploadAsset(base);
    expect(result).toMatchObject({ ok: true, assetId: 'test-uuid' });
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('passes optional name through to asset insert', async () => {
    selectSequence([
      [queuedManualJob],
      [],
    ]);
    const allInsertedValues: unknown[] = [];
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockImplementation((vals: unknown) => {
            allInsertedValues.push(vals);
            return { onConflictDoNothing: vi.fn().mockResolvedValue([]) };
          }),
        })),
        select: vi.fn().mockReturnValue(makeSelectChain([])),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
        }),
      };
      await fn(tx);
    });
    await createManualUploadAsset({ ...base, name: 'hero-video' });
    const serialized = JSON.stringify(allInsertedValues);
    expect(serialized).toContain('hero-video');
  });

  // Authorized roles

  it('OWNER role is authorized', async () => {
    selectSequence([[queuedManualJob], []]);
    makeSuccessfulTx();
    const result = await createManualUploadAsset({ ...base, actorRole: 'OWNER' });
    expect(result).toMatchObject({ ok: true });
  });

  it('ADMIN_OPERATIONS role is authorized', async () => {
    selectSequence([[queuedManualJob], []]);
    makeSuccessfulTx();
    const result = await createManualUploadAsset({ ...base, actorRole: 'ADMIN_OPERATIONS' });
    expect(result).toMatchObject({ ok: true });
  });

  it('CREATIVE_PRODUCTION role is authorized', async () => {
    selectSequence([[queuedManualJob], []]);
    makeSuccessfulTx();
    const result = await createManualUploadAsset({ ...base, actorRole: 'CREATIVE_PRODUCTION' });
    expect(result).toMatchObject({ ok: true });
  });

  // Concurrent winner

  it('returns winner assetId when concurrent writer completed the idempotency key first', async () => {
    selectSequence([
      [queuedManualJob],
      [], // pre-tx idempotency check: not found
    ]);
    makeConcurrentWinnerTx('winner-asset-id');
    const result = await createManualUploadAsset(base);
    expect(result).toMatchObject({ ok: true, assetId: 'winner-asset-id' });
  });

  // Transaction error propagation

  it('propagates unexpected transaction errors', async () => {
    selectSequence([[queuedManualJob], []]);
    mockTransaction.mockRejectedValue(new Error('DB_CONNECTION_LOST'));
    await expect(createManualUploadAsset(base)).rejects.toThrow('DB_CONNECTION_LOST');
  });
});
