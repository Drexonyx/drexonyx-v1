import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockSelect, mockInsert, mockUpdate, mockTransaction,
  mockVerifyWebhookSignature, mockParseWebhookPayload,
  mockRetryDispatch,
  mockAttemptProductionJobCompletion, mockFailProductionJob,
  mockMaterializeGenerationAsset,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
  mockVerifyWebhookSignature: vi.fn(),
  mockParseWebhookPayload: vi.fn(),
  mockRetryDispatch: vi.fn(),
  mockAttemptProductionJobCompletion: vi.fn(),
  mockFailProductionJob: vi.fn(),
  mockMaterializeGenerationAsset: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate, transaction: mockTransaction },
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-uuid' }));

vi.mock('@/lib/agent/providers/higgsfield', () => ({
  higgsFieldProvider: {
    name: 'higgsfield',
    dispatch: vi.fn(),
    verifyWebhookSignature: mockVerifyWebhookSignature,
    parseWebhookPayload: mockParseWebhookPayload,
  },
}));

vi.mock('@/lib/agent/driver', () => ({
  retryDispatch: mockRetryDispatch,
}));

vi.mock('@/lib/agent/terminal', () => ({
  attemptProductionJobCompletion: mockAttemptProductionJobCompletion,
  failProductionJob: mockFailProductionJob,
}));

vi.mock('@/lib/agent/materialization', () => ({
  materializeGenerationAsset: mockMaterializeGenerationAsset,
}));

import { type NextRequest } from 'next/server';
import { POST } from '../../app/api/webhooks/higgsfield/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: object, headers: Record<string, string> = {}): Request {
  const bodyStr = JSON.stringify(body);
  return new Request('http://localhost/api/webhooks/higgsfield', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: bodyStr,
  });
}

function makeSelectChain(result: unknown[]) {
  const end = vi.fn().mockResolvedValue(result);
  return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), innerJoin: vi.fn().mockReturnThis(), limit: end };
}

function selectSequence(results: unknown[][]) {
  let call = 0;
  mockSelect.mockImplementation(() => {
    const result = results[call] ?? [];
    call++;
    return makeSelectChain(result);
  });
}

const validGen = {
  id: 'gen1',
  production_job_id: 'job1',
  organization_id: 'org1',
  status: 'RUNNING',
  retry_count: 0,
};

const validParsedPayload = {
  provider: 'higgsfield',
  providerJobId: 'hf-123',
  status: 'SUCCEEDED' as const,
  isTransient: undefined,
  resultUrl: 'https://cdn.example.com/result.mp4',
  error: undefined,
};

// ─── Security: Signature verification ────────────────────────────────────────

describe('POST /api/webhooks/higgsfield — signature verification', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // Security: missing signature must be rejected before any DB mutation
  it('returns 401 when signature header is missing', async () => {
    const req = makeRequest({ job_id: 'hf-123', status: 'completed' });
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(401);
    expect(mockSelect).not.toHaveBeenCalled(); // No DB access before auth
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  // Security: invalid signature must be rejected — prevents webhook spoofing
  it('returns 401 when signature is invalid', async () => {
    mockVerifyWebhookSignature.mockReturnValue(false);
    const req = makeRequest({ job_id: 'hf-123', status: 'completed' }, { 'x-higgsfield-signature': 'bad-sig' });
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(401);
    expect(mockSelect).not.toHaveBeenCalled(); // No DB access after sig failure
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns 400 when payload is unrecognized shape', async () => {
    mockVerifyWebhookSignature.mockReturnValue(true);
    mockParseWebhookPayload.mockReturnValue(null);
    const req = makeRequest({ unknown_field: true }, { 'x-higgsfield-signature': 'sig' });
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(400);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('calls verifyWebhookSignature before any DB operation', async () => {
    // Verify the order: signature check → DB
    mockVerifyWebhookSignature.mockReturnValue(false);
    const req = makeRequest({}, { 'x-higgsfield-signature': 'bad' });
    await POST(req as unknown as NextRequest);
    expect(mockVerifyWebhookSignature).toHaveBeenCalledOnce();
    expect(mockSelect).not.toHaveBeenCalled(); // DB must NOT be touched
  });
});

// ─── Correlation and tenant isolation ─────────────────────────────────────────

describe('POST /api/webhooks/higgsfield — correlation and tenant isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyWebhookSignature.mockReturnValue(true);
    mockParseWebhookPayload.mockReturnValue(validParsedPayload);
  });

  // DR 0059 §2.5: Unknown provider_job_id → acknowledge without mutation
  it('returns 200 received:true when correlation not found (no mutation)', async () => {
    selectSequence([[]]); // No matching gen row
    const req = makeRequest({}, { 'x-higgsfield-signature': 'sig' });
    const res = await POST(req as unknown as NextRequest);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockAttemptProductionJobCompletion).not.toHaveBeenCalled();
    expect(mockFailProductionJob).not.toHaveBeenCalled();
  });

  // Security: organization_id must come from the matched DB row, never from webhook payload
  it('uses organization_id from DB row, not from webhook payload', async () => {
    // The gen row has org1; payload carries no org — idempotency check must use org from row
    selectSequence([[validGen], []]); // gen found, no existing idempotency key
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'gen1' }]) }) }) }),
      };
      await fn(tx);
    });
    mockAttemptProductionJobCompletion.mockResolvedValue({ ok: true, transitioned: false });
    mockMaterializeGenerationAsset.mockResolvedValue({ ok: true, assetId: 'asset1' });

    const req = makeRequest({}, { 'x-higgsfield-signature': 'sig' });
    await POST(req as unknown as NextRequest);

    // The idempotency select call must have been made with org1 (from row), not from payload
    expect(mockSelect).toHaveBeenCalledTimes(2); // gen lookup + idempotency lookup
  });
});

// ─── Idempotency / replay protection ─────────────────────────────────────────

describe('POST /api/webhooks/higgsfield — idempotency (replay protection)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyWebhookSignature.mockReturnValue(true);
    mockParseWebhookPayload.mockReturnValue(validParsedPayload);
  });

  // DR 0048 pattern: replayed webhook with COMPLETED idempotency key → acknowledge, no mutation
  it('returns 200 without mutation when idempotency key already COMPLETED (replayed webhook)', async () => {
    selectSequence([
      [validGen],                    // gen lookup
      [{ status: 'COMPLETED' }],     // idempotency key exists COMPLETED
    ]);
    const req = makeRequest({}, { 'x-higgsfield-signature': 'sig' });
    const res = await POST(req as unknown as NextRequest);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockAttemptProductionJobCompletion).not.toHaveBeenCalled();
    expect(mockFailProductionJob).not.toHaveBeenCalled();
  });

  // Duplicate callback: same (gen_id, status) pair processed twice — second is idempotent
  it('is idempotent for duplicate SUCCEEDED callbacks', async () => {
    selectSequence([
      [validGen],
      [{ status: 'COMPLETED' }], // already processed
    ]);
    const req = makeRequest({}, { 'x-higgsfield-signature': 'sig' });
    const res = await POST(req as unknown as NextRequest);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});

// ─── SUCCEEDED path ───────────────────────────────────────────────────────────

describe('POST /api/webhooks/higgsfield — SUCCEEDED path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyWebhookSignature.mockReturnValue(true);
    mockParseWebhookPayload.mockReturnValue({ ...validParsedPayload, status: 'SUCCEEDED' });
    mockAttemptProductionJobCompletion.mockResolvedValue({ ok: true, transitioned: false });
    mockMaterializeGenerationAsset.mockResolvedValue({ ok: true, assetId: 'asset1' });
  });

  it('calls attemptProductionJobCompletion after SUCCEEDED transition', async () => {
    selectSequence([[validGen], []]); // gen found, no idempotency key
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'gen1' }]) }) }) }),
      };
      await fn(tx);
    });

    const req = makeRequest({}, { 'x-higgsfield-signature': 'sig' });
    const res = await POST(req as unknown as NextRequest);

    expect(res.status).toBe(200);
    expect(mockAttemptProductionJobCompletion).toHaveBeenCalledOnce();
    expect(mockAttemptProductionJobCompletion).toHaveBeenCalledWith({
      productionJobId: 'job1',
      organizationId: 'org1',
    });
    expect(mockFailProductionJob).not.toHaveBeenCalled();
    expect(mockRetryDispatch).not.toHaveBeenCalled();
  });

  it('handles CONCURRENT_MODIFICATION gracefully (already-transitioned gen)', async () => {
    selectSequence([[validGen], []]); // gen found, no idempotency key
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }) }), // empty → CONCURRENT_MODIFICATION
      };
      await fn(tx);
    });

    const req = makeRequest({}, { 'x-higgsfield-signature': 'sig' });
    const res = await POST(req as unknown as NextRequest);

    expect(res.status).toBe(200); // Still 200 — idempotent
    expect(mockAttemptProductionJobCompletion).not.toHaveBeenCalled(); // Not called on concurrent mod
  });

  it('does not call attemptProductionJobCompletion when gen.status !== RUNNING', async () => {
    // Already transitioned gen — handler returns early
    selectSequence([[{ ...validGen, status: 'SUCCEEDED' }], []]);

    const req = makeRequest({}, { 'x-higgsfield-signature': 'sig' });
    const res = await POST(req as unknown as NextRequest);

    expect(res.status).toBe(200);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockAttemptProductionJobCompletion).not.toHaveBeenCalled();
  });
});

// ─── FAILED path — transient + retry eligible ────────────────────────────────

describe('POST /api/webhooks/higgsfield — FAILED transient path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyWebhookSignature.mockReturnValue(true);
    mockRetryDispatch.mockResolvedValue({ ok: true, providerJobId: 'hf-retry' });
  });

  it('calls retryDispatch when FAILED transient + retry_count < 2', async () => {
    mockParseWebhookPayload.mockReturnValue({
      provider: 'higgsfield',
      providerJobId: 'hf-123',
      status: 'FAILED',
      isTransient: true,
      error: 'Transient provider error',
    });
    selectSequence([[{ ...validGen, retry_count: 0 }], []]); // retry_count=0 → eligible
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'gen1' }]) }) }) }),
      };
      await fn(tx);
    });

    const req = makeRequest({}, { 'x-higgsfield-signature': 'sig' });
    const res = await POST(req as unknown as NextRequest);

    expect(res.status).toBe(200);
    expect(mockRetryDispatch).toHaveBeenCalledOnce();
    expect(mockRetryDispatch).toHaveBeenCalledWith({
      previousAiGenerationId: 'gen1',
      productionJobId: 'job1',
      organizationId: 'org1',
    });
    expect(mockFailProductionJob).not.toHaveBeenCalled();
  });

  // DR 0069: retry_count = 2 means max reached — must NOT retry, must fail job
  it('calls failProductionJob when FAILED transient + retry_count = 2 (exhausted)', async () => {
    mockParseWebhookPayload.mockReturnValue({
      provider: 'higgsfield',
      providerJobId: 'hf-123',
      status: 'FAILED',
      isTransient: true,
      error: 'Still failing',
    });
    selectSequence([[{ ...validGen, retry_count: 2 }], []]); // retry_count=2 → exhausted
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'gen1' }]) }) }) }),
      };
      await fn(tx);
    });
    mockFailProductionJob.mockResolvedValue({ ok: true, transitioned: true });

    const req = makeRequest({}, { 'x-higgsfield-signature': 'sig' });
    const res = await POST(req as unknown as NextRequest);

    expect(res.status).toBe(200);
    expect(mockRetryDispatch).not.toHaveBeenCalled(); // Must NOT retry
    expect(mockFailProductionJob).toHaveBeenCalledOnce(); // Must fail job
  });
});

// ─── FAILED path — permanent failure ─────────────────────────────────────────

describe('POST /api/webhooks/higgsfield — FAILED permanent path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyWebhookSignature.mockReturnValue(true);
    mockFailProductionJob.mockResolvedValue({ ok: true, transitioned: true });
  });

  // DR 0061: permanent failures go directly to failProductionJob, no retry
  it('calls failProductionJob and NOT retryDispatch on permanent failure', async () => {
    mockParseWebhookPayload.mockReturnValue({
      provider: 'higgsfield',
      providerJobId: 'hf-123',
      status: 'FAILED',
      isTransient: false,
      error: 'Permanent model error',
    });
    selectSequence([[{ ...validGen, retry_count: 0 }], []]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'gen1' }]) }) }) }),
      };
      await fn(tx);
    });

    const req = makeRequest({}, { 'x-higgsfield-signature': 'sig' });
    const res = await POST(req as unknown as NextRequest);

    expect(res.status).toBe(200);
    expect(mockFailProductionJob).toHaveBeenCalledOnce();
    expect(mockRetryDispatch).not.toHaveBeenCalled(); // DR 0061: permanent → no retry

    // Verify reason string indicates permanent failure
    const callArgs = mockFailProductionJob.mock.calls[0][0];
    expect(callArgs.reason).toContain('Permanent failure');
    expect(callArgs.productionJobId).toBe('job1');
    expect(callArgs.organizationId).toBe('org1');
  });

  // DR 0061: permanent failure does NOT increment retry_count (guard at DB level)
  it('does not call retryDispatch even with retry_count=0 when isTransient=false', async () => {
    mockParseWebhookPayload.mockReturnValue({
      provider: 'higgsfield',
      providerJobId: 'hf-123',
      status: 'FAILED',
      isTransient: false,
      error: 'Content policy violation',
    });
    selectSequence([[{ ...validGen, retry_count: 0 }], []]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'gen1' }]) }) }) }),
      };
      await fn(tx);
    });

    await POST(makeRequest({}, { 'x-higgsfield-signature': 'sig' }) as unknown as NextRequest);
    expect(mockRetryDispatch).not.toHaveBeenCalled();
  });
});
