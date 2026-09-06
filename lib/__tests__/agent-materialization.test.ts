// DR 0081: materializeGenerationAsset downloads from provider URL then uploads to R2.
// Asset is created ONLY after successful R2 upload.
// DR 0054: file_key = {provider}/{org}/{assetId}/generation; content_url = null after R2.
// DR 0079: AI_GENERATION_ASSET_CREATED emitted after successful storage.
// DR 0064: actor_id = production_job_id, actor_role = 'AGENT'.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockSelect, mockInsert, mockUpdate, mockTransaction,
  mockTransitionAssetToReadyForQc,
  mockPutObject,
  mockFetch,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
  mockTransitionAssetToReadyForQc: vi.fn(),
  mockPutObject: vi.fn(),
  mockFetch: vi.fn(),
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

vi.mock('@/lib/infrastructure/object-storage', () => ({
  putObject: mockPutObject,
}));

vi.stubGlobal('fetch', mockFetch);

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

function makeSuccessfulFetch(contentType = 'video/mp4', body = 'fake-video-bytes') {
  const arrayBuffer = Buffer.from(body).buffer;
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: (h: string) => (h === 'content-type' ? contentType : null) },
    arrayBuffer: vi.fn().mockResolvedValue(arrayBuffer),
  });
}

const params = {
  aiGenerationId: 'gen1',
  productionJobId: 'job1',
  organizationId: 'org1',
  provider: 'higgsfield',
  resultUrl: 'https://cdn.higgsfield.ai/result.mp4',
};

// ─── resultUrl guard ──────────────────────────────────────────────────────────

describe('materializeGenerationAsset — resultUrl guard', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // DR 0081: A provider URL is required for download and R2 upload
  it('returns error when resultUrl is missing', async () => {
    const result = await materializeGenerationAsset({ ...params, resultUrl: undefined });

    expect(result).toEqual({ ok: false, error: expect.stringContaining('No provider output URL') });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPutObject).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

// ─── Idempotency ──────────────────────────────────────────────────────────────

describe('materializeGenerationAsset — idempotency', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // DR 0078 §2.4: primary idempotency — existing link found → return immediately
  it('returns existing assetId when asset_ai_generations link already exists', async () => {
    selectSequence([[{ asset_id: 'existing-asset' }]]);

    const result = await materializeGenerationAsset(params);

    expect(result).toEqual({ ok: true, assetId: 'existing-asset' });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPutObject).not.toHaveBeenCalled();
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
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPutObject).not.toHaveBeenCalled();
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
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPutObject).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

// ─── Download failure ─────────────────────────────────────────────────────────

describe('materializeGenerationAsset — download failure', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // DR 0081 §2.4: Asset is NOT created if download fails
  it('returns error when fetch throws (network failure)', async () => {
    selectSequence([[], [], [{ order_id: 'order1' }]]);
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await materializeGenerationAsset(params);

    expect(result).toEqual({ ok: false, error: expect.stringContaining('Failed to download') });
    expect(mockPutObject).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns error when provider returns non-200 response', async () => {
    selectSequence([[], [], [{ order_id: 'order1' }]]);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      headers: { get: () => null },
      arrayBuffer: vi.fn(),
    });

    const result = await materializeGenerationAsset(params);

    expect(result).toEqual({ ok: false, error: expect.stringContaining('Failed to download') });
    expect(mockPutObject).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

// ─── R2 upload failure ────────────────────────────────────────────────────────

describe('materializeGenerationAsset — R2 upload failure', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // DR 0081: Asset is NOT created if R2 upload fails
  it('returns error when putObject throws', async () => {
    selectSequence([[], [], [{ order_id: 'order1' }]]);
    makeSuccessfulFetch();
    mockPutObject.mockRejectedValue(new Error('R2: NoSuchBucket'));

    const result = await materializeGenerationAsset(params);

    expect(result).toEqual({ ok: false, error: expect.stringContaining('R2 upload failed') });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  // DR 0078: no AI_GENERATION_ASSET_CREATED event on upload failure
  it('does not emit audit event when R2 upload fails', async () => {
    selectSequence([[], [], [{ order_id: 'order1' }]]);
    makeSuccessfulFetch();
    mockPutObject.mockRejectedValue(new Error('upload error'));

    await materializeGenerationAsset(params);

    expect(mockInsert).not.toHaveBeenCalled();
  });
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('materializeGenerationAsset — happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransitionAssetToReadyForQc.mockResolvedValue({ ok: true });
    makeSuccessfulFetch();
    mockPutObject.mockResolvedValue(undefined);
    makeTransaction();
  });

  it('downloads provider output, uploads to R2, creates Asset and transitions to READY_FOR_QC', async () => {
    selectSequence([[], [], [{ order_id: 'order1' }]]);

    const result = await materializeGenerationAsset(params);

    expect(result).toEqual({ ok: true, assetId: 'test-uuid' });
    expect(mockFetch).toHaveBeenCalledWith('https://cdn.higgsfield.ai/result.mp4');
    expect(mockPutObject).toHaveBeenCalledOnce();
    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(mockTransitionAssetToReadyForQc).toHaveBeenCalledWith({
      assetId: 'test-uuid',
      organizationId: 'org1',
      productionJobId: 'job1',
    });
  });

  // DR 0054 §2.2: file_key must follow {provider}/{org_id}/{asset_id}/generation
  it('uploads to R2 with canonical file_key and calls putObject with correct params', async () => {
    selectSequence([[], [], [{ order_id: 'order1' }]]);

    await materializeGenerationAsset(params);

    expect(mockPutObject).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'higgsfield/org1/test-uuid/generation',
        contentType: 'video/mp4',
      }),
    );
    // DR 0081: Higgsfield CDN URL must NOT be passed to putObject as the key
    const putCall = mockPutObject.mock.calls[0][0] as { key: string };
    expect(putCall.key).not.toContain('cdn.higgsfield.ai');
    expect(putCall.key).not.toContain('http');
  });

  // DR 0054 §2.2: file_key in Asset row must follow convention
  it('inserts Asset with canonical file_key, status PROCESSING, and content_url null', async () => {
    selectSequence([[], [], [{ order_id: 'order1' }]]);

    let capturedAssetInsert: Record<string, unknown> | null = null;
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockImplementation((vals: unknown) => {
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
    expect(capturedAssetInsert!.file_key).toBe('higgsfield/org1/test-uuid/generation');
    expect(capturedAssetInsert!.status).toBe('PROCESSING');
    // DR 0054 §2.4, DR 0081 §2.5: content_url is null — file_key is the canonical reference
    // DR 0081: Higgsfield CDN URL must NOT be stored as content_url
    expect(capturedAssetInsert!.content_url).toBeNull();
  });

  // DR 0079: AI_GENERATION_ASSET_CREATED audit event must be emitted
  it('emits AI_GENERATION_ASSET_CREATED audit event in transaction', async () => {
    selectSequence([[], [], [{ order_id: 'order1' }]]);

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
    makeSuccessfulFetch();
    mockPutObject.mockResolvedValue(undefined);
    makeTransaction();
  });

  it('returns ok:false if transitionAssetToReadyForQc fails', async () => {
    selectSequence([[], [], [{ order_id: 'order1' }]]);
    mockTransitionAssetToReadyForQc.mockResolvedValue({ ok: false, reason: 'concurrent modification' });

    const result = await materializeGenerationAsset(params);

    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toContain('READY_FOR_QC transition failed');
  });
});

// ─── Transaction failure ──────────────────────────────────────────────────────

describe('materializeGenerationAsset — transaction failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeSuccessfulFetch();
    mockPutObject.mockResolvedValue(undefined);
  });

  it('returns ok:false when transaction throws', async () => {
    selectSequence([[], [], [{ order_id: 'order1' }]]);
    mockTransaction.mockRejectedValue(new Error('DB connection lost'));

    const result = await materializeGenerationAsset(params);

    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toContain('Materialization failed');
    expect(mockTransitionAssetToReadyForQc).not.toHaveBeenCalled();
  });
});

// ─── R2 upload call ordering ──────────────────────────────────────────────────

describe('materializeGenerationAsset — call ordering', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // DR 0081: R2 upload must precede DB transaction; audit event must be in transaction
  it('calls fetch → putObject → transaction → transitionAssetToReadyForQc in order', async () => {
    selectSequence([[], [], [{ order_id: 'order1' }]]);
    mockTransitionAssetToReadyForQc.mockResolvedValue({ ok: true });
    makeSuccessfulFetch();
    mockPutObject.mockResolvedValue(undefined);

    const callOrder: string[] = [];
    mockFetch.mockImplementation(async () => {
      callOrder.push('fetch');
      const arrayBuffer = Buffer.from('bytes').buffer;
      return {
        ok: true, status: 200,
        headers: { get: (h: string) => h === 'content-type' ? 'video/mp4' : null },
        arrayBuffer: async () => arrayBuffer,
      };
    });
    mockPutObject.mockImplementation(async () => { callOrder.push('putObject'); });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      callOrder.push('transaction');
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }) }),
      };
      await fn(tx);
    });
    mockTransitionAssetToReadyForQc.mockImplementation(async () => { callOrder.push('transition'); return { ok: true }; });

    await materializeGenerationAsset(params);

    expect(callOrder).toEqual(['fetch', 'putObject', 'transaction', 'transition']);
  });
});
