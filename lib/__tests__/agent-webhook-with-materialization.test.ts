// DR 0078: Tests that materializeGenerationAsset is called correctly in the SUCCEEDED webhook path,
// and that failures are handled without failing the job or crashing the webhook.
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
  return new Request('http://localhost/api/webhooks/higgsfield', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
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

function makeSuccessfulTransaction() {
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
    const tx = {
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'gen1' }]) }) }) }),
    };
    await fn(tx);
  });
}

const validGen = {
  id: 'gen1',
  production_job_id: 'job1',
  organization_id: 'org1',
  status: 'RUNNING',
  retry_count: 0,
};

const succeededPayload = {
  provider: 'higgsfield',
  providerJobId: 'hf-123',
  status: 'SUCCEEDED' as const,
  resultUrl: 'https://cdn.higgsfield.ai/result.mp4',
  isTransient: undefined,
  error: undefined,
};

// ─── Materialization integration ──────────────────────────────────────────────

describe('Webhook SUCCEEDED path — materialization integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyWebhookSignature.mockReturnValue(true);
    mockParseWebhookPayload.mockReturnValue(succeededPayload);
    mockAttemptProductionJobCompletion.mockResolvedValue({ ok: true, transitioned: false });
  });

  // DR 0078 §2.5: materializeGenerationAsset must be called BEFORE attemptProductionJobCompletion
  it('calls materializeGenerationAsset before attemptProductionJobCompletion', async () => {
    selectSequence([[validGen], []]);
    makeSuccessfulTransaction();
    const callOrder: string[] = [];
    mockMaterializeGenerationAsset.mockImplementation(() => { callOrder.push('materialize'); return Promise.resolve({ ok: true, assetId: 'asset1' }); });
    mockAttemptProductionJobCompletion.mockImplementation(() => { callOrder.push('complete'); return Promise.resolve({ ok: true, transitioned: true }); });

    await POST(makeRequest({}, { 'x-higgsfield-signature': 'sig' }) as unknown as NextRequest);

    expect(callOrder).toEqual(['materialize', 'complete']);
  });

  // DR 0078 §2.1: materialization failure → job stays RUNNING, no completion attempted
  it('does not call attemptProductionJobCompletion when materialization fails', async () => {
    selectSequence([[validGen], []]);
    makeSuccessfulTransaction();
    mockMaterializeGenerationAsset.mockResolvedValue({ ok: false, error: 'DB error during asset insert' });

    const res = await POST(makeRequest({}, { 'x-higgsfield-signature': 'sig' }) as unknown as NextRequest);

    expect(res.status).toBe(200); // DR 0078 §2.2: always 200 to prevent provider retries
    expect(mockAttemptProductionJobCompletion).not.toHaveBeenCalled();
    expect(mockFailProductionJob).not.toHaveBeenCalled();
  });

  // DR 0078 §2.2: webhook must return 200 even on materialization failure
  it('returns 200 received:true even when materialization fails', async () => {
    selectSequence([[validGen], []]);
    makeSuccessfulTransaction();
    mockMaterializeGenerationAsset.mockResolvedValue({ ok: false, error: 'some error' });

    const res = await POST(makeRequest({}, { 'x-higgsfield-signature': 'sig' }) as unknown as NextRequest);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
  });

  // materializeGenerationAsset receives provider from parsed payload, not from DB row
  it('passes provider from parsed payload to materializeGenerationAsset', async () => {
    selectSequence([[validGen], []]);
    makeSuccessfulTransaction();
    mockMaterializeGenerationAsset.mockResolvedValue({ ok: true, assetId: 'asset1' });

    await POST(makeRequest({}, { 'x-higgsfield-signature': 'sig' }) as unknown as NextRequest);

    expect(mockMaterializeGenerationAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'higgsfield',
        aiGenerationId: 'gen1',
        productionJobId: 'job1',
        organizationId: 'org1',
        resultUrl: 'https://cdn.higgsfield.ai/result.mp4',
      }),
    );
  });

  // Full happy path: transaction → materialize → attempt completion
  it('full happy path: returns 200 with all steps called', async () => {
    selectSequence([[validGen], []]);
    makeSuccessfulTransaction();
    mockMaterializeGenerationAsset.mockResolvedValue({ ok: true, assetId: 'asset1' });

    const res = await POST(makeRequest({}, { 'x-higgsfield-signature': 'sig' }) as unknown as NextRequest);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(mockMaterializeGenerationAsset).toHaveBeenCalledOnce();
    expect(mockAttemptProductionJobCompletion).toHaveBeenCalledOnce();
  });
});
