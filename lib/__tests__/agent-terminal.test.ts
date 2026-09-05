import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockUpdate, mockTransaction } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate, transaction: mockTransaction },
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-uuid' }));

vi.mock('@/lib/agent/service-tokens', () => ({
  revokeServiceTokensForJob: vi.fn().mockResolvedValue({ ok: true }),
}));

import { attemptProductionJobCompletion, failProductionJob, transitionAssetToReadyForQc } from '../agent/terminal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── attemptProductionJobCompletion ──────────────────────────────────────────

describe('attemptProductionJobCompletion', () => {
  const base = { productionJobId: 'job1', organizationId: 'org1' };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:true, transitioned:true when already COMPLETED (idempotency fast-path)', async () => {
    selectSequence([[{ status: 'COMPLETED' }]]);
    const result = await attemptProductionJobCompletion(base);
    expect(result).toMatchObject({ ok: true, transitioned: true });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:true, transitioned:false when no AiGenerations exist (conditions not met)', async () => {
    // idempotency check returns empty → proceed to transaction
    selectSequence([[]]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]), // no generations
        }),
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }) }),
      };
      await fn(tx);
    });

    const result = await attemptProductionJobCompletion(base);
    expect(result).toMatchObject({ ok: true, transitioned: false });
  });

  it('returns ok:true, transitioned:false when AiGeneration not yet SUCCEEDED', async () => {
    selectSequence([[]]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      let selectCount = 0;
      const tx = {
        select: vi.fn().mockImplementation(() => {
          selectCount++;
          const result = selectCount === 1
            ? [{ id: 'gen1', status: 'RUNNING' }]  // not SUCCEEDED
            : [];
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue(result),
          };
        }),
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }) }),
      };
      await fn(tx);
    });

    const result = await attemptProductionJobCompletion(base);
    expect(result).toMatchObject({ ok: true, transitioned: false });
  });

  it('returns ok:true, transitioned:true when CAS succeeds (all conditions met, no assets)', async () => {
    selectSequence([[]]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      let selectCount = 0;
      const tx = {
        select: vi.fn().mockImplementation(() => {
          selectCount++;
          const result = selectCount === 1
            ? [{ id: 'gen1', status: 'SUCCEEDED' }]  // all succeeded
            : [];                                       // no assets
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue(result),
          };
        }),
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'job1' }]) }) }) }),
      };
      await fn(tx);
    });

    const result = await attemptProductionJobCompletion(base);
    expect(result).toMatchObject({ ok: true, transitioned: true });
  });

  it('returns ok:true on concurrent modification (idempotent)', async () => {
    selectSequence([[]]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      let selectCount = 0;
      const tx = {
        select: vi.fn().mockImplementation(() => {
          selectCount++;
          const result = selectCount === 1 ? [{ id: 'gen1', status: 'SUCCEEDED' }] : [];
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue(result),
          };
        }),
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }) }),
      };
      await fn(tx);
    });

    // Empty returning = concurrent modification, should return ok:true
    const result = await attemptProductionJobCompletion(base);
    expect(result).toMatchObject({ ok: true });
  });

  // Security: unauthorized state transition — cannot complete a non-RUNNING job
  it('CAS prevents completion of non-RUNNING job (unauthorized state transition)', async () => {
    selectSequence([[]]);
    let updateCalled = false;
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      let selectCount = 0;
      const tx = {
        select: vi.fn().mockImplementation(() => {
          selectCount++;
          const result = selectCount === 1 ? [{ id: 'gen1', status: 'SUCCEEDED' }] : [];
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue(result),
          };
        }),
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockImplementation(() => {
          updateCalled = true;
          return {
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }), // job not RUNNING → CAS miss
            }),
          };
        }),
      };
      await fn(tx);
    });

    const result = await attemptProductionJobCompletion(base);
    expect(updateCalled).toBe(true);
    expect(result).toMatchObject({ ok: true });
  });
});

// ─── failProductionJob ────────────────────────────────────────────────────────

describe('failProductionJob', () => {
  const base = { productionJobId: 'job1', organizationId: 'org1', reason: 'Permanent failure' };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:true, transitioned:true when idempotency key already COMPLETED', async () => {
    selectSequence([[{ status: 'COMPLETED' }]]);
    const result = await failProductionJob(base);
    expect(result).toMatchObject({ ok: true, transitioned: true });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('transitions job to FAILED and emits audit event', async () => {
    selectSequence([[]]);
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

    const result = await failProductionJob(base);
    expect(result).toMatchObject({ ok: true, transitioned: true });

    const audit = auditValues.find((v: unknown) =>
      typeof v === 'object' && v !== null && (v as Record<string, unknown>).action === 'PRODUCTION_JOB_FAILED',
    );
    expect(audit).toBeDefined();
    const a = audit as Record<string, unknown>;
    expect(a.actor_id).toBe('job1');   // DR 0064: actor_id = production_job_id
    expect(a.actor_role).toBe('AGENT');
    expect(a.actor_id).not.toBeNull(); // NULL prohibited
  });

  it('returns ok:true on concurrent modification (idempotent)', async () => {
    selectSequence([[]]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }) }),
      };
      await fn(tx);
    });

    const result = await failProductionJob(base);
    expect(result).toMatchObject({ ok: true });
  });
});

// ─── transitionAssetToReadyForQc ─────────────────────────────────────────────

describe('transitionAssetToReadyForQc', () => {
  const base = { assetId: 'asset1', organizationId: 'org1', productionJobId: 'job1' };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:true when idempotency key already COMPLETED', async () => {
    selectSequence([[{ status: 'COMPLETED' }]]);
    const result = await transitionAssetToReadyForQc(base);
    expect(result).toMatchObject({ ok: true });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('transitions asset PROCESSING→READY_FOR_QC with AGENT actor', async () => {
    selectSequence([[]]);
    const auditValues: unknown[] = [];
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockImplementation((v) => { auditValues.push(v); return { onConflictDoNothing: vi.fn().mockResolvedValue([]) }; }),
        })),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'asset1' }]) }) }) }),
      };
      await fn(tx);
    });

    const result = await transitionAssetToReadyForQc(base);
    expect(result).toMatchObject({ ok: true });

    const audit = auditValues.find((v: unknown) =>
      typeof v === 'object' && v !== null && (v as Record<string, unknown>).action === 'ASSET_READY_FOR_QC',
    );
    expect(audit).toBeDefined();
    const a = audit as Record<string, unknown>;
    expect(a.actor_id).toBe('job1');   // DR 0064
    expect(a.actor_role).toBe('AGENT');
  });

  it('returns ok:true on concurrent modification (idempotent)', async () => {
    selectSequence([[]]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }) }),
      };
      await fn(tx);
    });

    const result = await transitionAssetToReadyForQc(base);
    expect(result).toMatchObject({ ok: true });
  });
});
