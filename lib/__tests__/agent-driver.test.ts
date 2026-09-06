import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockUpdate, mockTransaction, mockIssueServiceToken, mockDispatch } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
  mockIssueServiceToken: vi.fn(),
  mockDispatch: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate, transaction: mockTransaction },
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-uuid' }));

vi.mock('@/lib/agent/service-tokens', () => ({
  issueServiceToken: mockIssueServiceToken,
  revokeServiceTokensForJob: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('@/lib/agent/providers/higgsfield', () => ({
  higgsFieldProvider: { name: 'higgsfield', dispatch: mockDispatch, verifyWebhookSignature: vi.fn(), parseWebhookPayload: vi.fn() },
}));

import { runGenerationDriver, retryDispatch } from '../agent/driver';

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

// ─── runGenerationDriver ──────────────────────────────────────────────────────

describe('runGenerationDriver', () => {
  const base = { productionJobId: 'job1', organizationId: 'org1' };

  const validJob = { id: 'job1', status: 'QUEUED', job_type: 'AI_GENERATION', organization_id: 'org1' };
  const validGen = {
    id: 'gen1', provider: 'higgsfield', model: 'text2image/soul', prompt: 'test',
    params: {}, status: 'REQUESTED', retry_count: 0,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false when job not found', async () => {
    selectSequence([[]]);
    const result = await runGenerationDriver(base);
    expect(result).toMatchObject({ ok: false, reason: 'ProductionJob not found' });
  });

  it('returns ok:false for MANUAL_UPLOAD job type', async () => {
    selectSequence([[{ ...validJob, job_type: 'MANUAL_UPLOAD' }]]);
    const result = await runGenerationDriver(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('AI_GENERATION') });
  });

  it('returns ok:false when job is not QUEUED', async () => {
    selectSequence([[{ ...validJob, status: 'RUNNING' }]]);
    const result = await runGenerationDriver(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('QUEUED') });
  });

  it('returns ok:false when no REQUESTED AiGeneration exists', async () => {
    selectSequence([[validJob], []]);
    const result = await runGenerationDriver(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('REQUESTED') });
  });

  it('returns ok:false when token issuance fails', async () => {
    selectSequence([[validJob], [validGen]]);
    mockIssueServiceToken.mockResolvedValue({ ok: false, reason: 'DB error' });
    const result = await runGenerationDriver(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('Token issuance failed') });
  });

  it('returns ok:false on concurrent modification (CAS miss)', async () => {
    selectSequence([[validJob], [validGen]]);
    mockIssueServiceToken.mockResolvedValue({ ok: true, rawToken: 'tok', tokenId: 'tid', expiresAt: new Date() });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }) }),
      };
      await fn(tx);
    });
    const result = await runGenerationDriver(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('claimed by another') });
  });

  it('dispatches and returns providerJobId on success', async () => {
    selectSequence([[validJob], [validGen]]);
    mockIssueServiceToken.mockResolvedValue({ ok: true, rawToken: 'tok', tokenId: 'tid', expiresAt: new Date() });
    mockDispatch.mockResolvedValue({ ok: true, providerJobId: 'hf-123' });

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'job1' }]) }) }) }),
      };
      await fn(tx);
    });

    // After transaction: update aiGenerations with provider_job_id
    mockUpdate.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) });

    const result = await runGenerationDriver(base);
    expect(result).toMatchObject({ ok: true, providerJobId: 'hf-123' });
  });

  it('records dispatch failure when provider returns error', async () => {
    selectSequence([[validJob], [validGen]]);
    mockIssueServiceToken.mockResolvedValue({ ok: true, rawToken: 'tok', tokenId: 'tid', expiresAt: new Date() });
    mockDispatch.mockResolvedValue({ ok: false, error: 'Provider unavailable', isTransient: true });

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'gen1' }]) }) }) }),
      };
      await fn(tx);
    });

    // After transaction: update calls for provider_job_id and failure
    mockUpdate.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) });
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

    const result = await runGenerationDriver(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('Dispatch failed') });
  });

  // Security: actor_id (production_job_id) must never be NULL in audit events
  it('uses productionJobId as actor_id in audit events (DR 0064)', async () => {
    selectSequence([[validJob], [validGen]]);
    mockIssueServiceToken.mockResolvedValue({ ok: true, rawToken: 'tok', tokenId: 'tid', expiresAt: new Date() });
    mockDispatch.mockResolvedValue({ ok: true, providerJobId: 'hf-123' });

    const auditValues: unknown[] = [];
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockImplementation((v) => { auditValues.push(v); return { onConflictDoNothing: vi.fn().mockResolvedValue([]) }; }),
        })),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'job1' }]) }) }) }),
      };
      await fn(tx);
    });
    mockUpdate.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) });

    await runGenerationDriver(base);

    // All audit events must have actor_id = productionJobId and actor_role = 'AGENT'
    const auditEvents = auditValues.filter((v: unknown) => typeof v === 'object' && v !== null && 'actor_role' in (v as object));
    for (const evt of auditEvents) {
      const e = evt as Record<string, unknown>;
      expect(e.actor_id).toBe('job1');     // actor_id = production_job_id
      expect(e.actor_id).not.toBeNull();   // NULL prohibited
      expect(e.actor_role).toBe('AGENT');
    }
  });
});

// ─── retryDispatch ────────────────────────────────────────────────────────────

describe('retryDispatch', () => {
  const base = {
    previousAiGenerationId: 'gen-prev',
    productionJobId: 'job1',
    organizationId: 'org1',
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false when previous AiGeneration not found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const result = await retryDispatch(base);
    expect(result).toMatchObject({ ok: false, reason: 'Previous AiGeneration not found' });
  });

  it('returns ok:false when retry_count = 2 (max reached, DR 0069 guard)', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{
      id: 'gen-prev', provider: 'higgsfield', model: 'model', prompt: 'p', params: {}, retry_count: 2,
    }]));
    const result = await retryDispatch(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('Maximum retry count') });
  });

  it('creates new AiGeneration with retry_count + 1 when retry eligible', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{
      id: 'gen-prev', provider: 'higgsfield', model: 'text2image/soul', prompt: 'p', params: {}, retry_count: 1,
    }]));
    mockDispatch.mockResolvedValue({ ok: true, providerJobId: 'hf-retry-456' });

    const insertedValues: unknown[] = [];
    mockInsert.mockImplementation(() => ({
      values: vi.fn().mockImplementation((v) => { insertedValues.push(v); return Promise.resolve([]); }),
    }));
    mockUpdate.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) });

    const result = await retryDispatch(base);
    expect(result).toMatchObject({ ok: true, providerJobId: 'hf-retry-456' });

    // Verify new AiGeneration has retry_count = 2 (prev was 1)
    const newGen = insertedValues.find((v: unknown) =>
      typeof v === 'object' && v !== null && (v as Record<string, unknown>).retry_count === 2,
    );
    expect(newGen).toBeDefined();
  });

  it('does not allow retry_count > 2 (max enforcement)', async () => {
    // With retry_count = 2, retryDispatch must be blocked
    mockSelect.mockReturnValue(makeSelectChain([{
      id: 'gen-prev', provider: 'higgsfield', model: 'model', prompt: 'p', params: {}, retry_count: 2,
    }]));

    const result = await retryDispatch(base);
    // No insert should happen
    expect(mockInsert).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
  });
});
