import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockSelect, mockInsert, mockUpdate, mockTransaction,
  mockTransitionAssetToReadyForQc,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
  mockTransitionAssetToReadyForQc: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate, transaction: mockTransaction },
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-uuid' }));

vi.mock('@/lib/agent/terminal', () => ({
  transitionAssetToReadyForQc: mockTransitionAssetToReadyForQc,
  attemptProductionJobCompletion: vi.fn(),
  failProductionJob: vi.fn(),
}));

import { materializeGenerationAsset } from '../agent/materialization';

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

function makeTransaction() {
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'test-uuid' }]) }),
        }),
      }),
    };
    await fn(tx);
  });
}

const params = {
  aiGenerationId: 'gen1',
  productionJobId: 'job1',
  organizationId: 'org1',
  provider: 'higgsfield',
  resultUrl: 'https://cdn.example.com/result.mp4',
};

// ─── Idempotency ──────────────────────────────────────────────────────────────

describe('materializeGenerationAsset — idempotency', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // DR 0078 §2.4: primary idempotency — existing link found → return immediately
  it('returns existing assetId when asset_ai_generations link already exists', async () => {
    selectSequence([[{ asset_id: 'existing-asset' }]]);

    const result = await materializeGenerationAsset(params);

    expect(result).toEqual({ ok: true, assetId: 'existing-asset' });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockTransitionAssetToReadyForQc).not.toHaveBeenCalled();
  });

  // DR 0078 §2.4: secondary idempotency via idempotency_keys
  it('returns existing assetId when idempotency key COMPLETED and link exists on retry', async () => {
    selectSequence([
      [],                             // no asset_ai_generations link
      [{ status: 'COMPLETED' }],      // idempotency key COMPLETED
      [{ asset_id: 'retry-asset' }],  // link found on retry lookup
    ]);

    const result = await materializeGenerationAsset(params);

    expect(result).toEqual({ ok: true, assetId: 'retry-asset' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

// ─── ProductionJob lookup ─────────────────────────────────────────────────────

describe('materializeGenerationAsset — ProductionJob lookup', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns error when ProductionJob is not found', async () => {
    selectSequence([
      [],    // no existing link
      [],    // no idempotency key
      [],    // ProductionJob not found
    ]);

    const result = await materializeGenerationAsset(params);

    expect(result).toEqual({ ok: false, error: expect.stringContaining('ProductionJob not found') });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('materializeGenerationAsset — happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransitionAssetToReadyForQc.mockResolvedValue({ ok: true });
    makeTransaction();
  });

  it('creates Asset, link, and audit event in transaction, then transitions to READY_FOR_QC', async () => {
    selectSequence([
      [],                          // no existing link
      [],                          // no idempotency key
      [{ order_id: 'order1' }],    // ProductionJob found
    ]);

    const result = await materializeGenerationAsset(params);

    expect(result).toEqual({ ok: true, assetId: 'test-uuid' });
    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(mockTransitionAssetToReadyForQc).toHaveBeenCalledWith({
      assetId: 'test-uuid',
      organizationId: 'org1',
      productionJobId: 'job1',
    });
  });

  // DR 0054 §2.2: file_key must follow {provider}/{org_id}/{asset_id}/generation convention
  it('inserts Asset with correct file_key and content_url per DR 0054', async () => {
    selectSequence([
      [],
      [],
      [{ order_id: 'order1' }],
    ]);

    let capturedAssetInsert: Record<string, unknown> | null = null;
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockImplementation((vals: unknown) => {
            // Capture the asset insert (second insert after idempotency_keys)
            const v = vals as Record<string, unknown>;
            if (v.file_key) capturedAssetInsert = v;
            return { onConflictDoNothing: vi.fn().mockResolvedValue([]) };
          }),
        })),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
          }),
        }),
      };
      await fn(tx);
    });

    await materializeGenerationAsset(params);

    expect(capturedAssetInsert).not.toBeNull();
    expect(capturedAssetInsert!.file_key).toMatch(/^higgsfield\/org1\/test-uuid\/generation$/);
    // DR 0054 §2.4: content_url is a temporary placeholder
    expect(capturedAssetInsert!.content_url).toBe('https://cdn.example.com/result.mp4');
    expect(capturedAssetInsert!.status).toBe('PROCESSING');
  });

  // DR 0079: AI_GENERATION_ASSET_CREATED audit event must be emitted
  it('emits AI_GENERATION_ASSET_CREATED audit event in transaction', async () => {
    selectSequence([
      [],
      [],
      [{ order_id: 'order1' }],
    ]);

    let capturedAuditInsert: Record<string, unknown> | null = null;
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockImplementation((vals: unknown) => {
            const v = vals as Record<string, unknown>;
            if (v.action === 'AI_GENERATION_ASSET_CREATED') capturedAuditInsert = v;
            return { onConflictDoNothing: vi.fn().mockResolvedValue([]) };
          }),
        })),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
          }),
        }),
      };
      await fn(tx);
    });

    await materializeGenerationAsset(params);

    expect(capturedAuditInsert).not.toBeNull();
    expect(capturedAuditInsert!.action).toBe('AI_GENERATION_ASSET_CREATED');
    expect(capturedAuditInsert!.actor_id).toBe('job1'); // DR 0064
    expect(capturedAuditInsert!.actor_role).toBe('AGENT');
    expect(capturedAuditInsert!.entity_type).toBe('asset');
  });
});

// ─── READY_FOR_QC transition failure ─────────────────────────────────────────

describe('materializeGenerationAsset — READY_FOR_QC failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeTransaction();
  });

  it('returns ok:false if transitionAssetToReadyForQc fails', async () => {
    selectSequence([
      [],
      [],
      [{ order_id: 'order1' }],
    ]);
    mockTransitionAssetToReadyForQc.mockResolvedValue({ ok: false, reason: 'concurrent modification' });

    const result = await materializeGenerationAsset(params);

    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toContain('READY_FOR_QC transition failed');
  });
});

// ─── Transaction failure ──────────────────────────────────────────────────────

describe('materializeGenerationAsset — transaction failure', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false when transaction throws', async () => {
    selectSequence([
      [],
      [],
      [{ order_id: 'order1' }],
    ]);
    mockTransaction.mockRejectedValue(new Error('DB connection lost'));

    const result = await materializeGenerationAsset(params);

    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toContain('Materialization failed');
    expect(mockTransitionAssetToReadyForQc).not.toHaveBeenCalled();
  });
});

// ─── Content URL handling ─────────────────────────────────────────────────────

describe('materializeGenerationAsset — content_url handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransitionAssetToReadyForQc.mockResolvedValue({ ok: true });
  });

  it('stores null content_url when resultUrl is undefined', async () => {
    selectSequence([
      [],
      [],
      [{ order_id: 'order1' }],
    ]);

    let capturedContentUrl: unknown = 'UNSET';
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockImplementation((vals: unknown) => {
            const v = vals as Record<string, unknown>;
            if ('content_url' in v) capturedContentUrl = v.content_url;
            return { onConflictDoNothing: vi.fn().mockResolvedValue([]) };
          }),
        })),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
          }),
        }),
      };
      await fn(tx);
    });

    await materializeGenerationAsset({ ...params, resultUrl: undefined });

    expect(capturedContentUrl).toBeNull();
  });
});
