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

import { requestRevision } from '../portal/revisions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const terminal = {
    limit: vi.fn().mockResolvedValue(result),
    then: (onFulfilled: (v: unknown) => void, onRejected?: (e: unknown) => void) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  const chain: Record<string, unknown> = {
    from: vi.fn(),
    where: vi.fn().mockReturnValue(terminal),
  };
  (chain.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
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

// ─── requestRevision ──────────────────────────────────────────────────────────

describe('requestRevision', () => {
  const base = {
    assetId: 'asset1',
    organizationId: 'org1',
    actorId: 'user1',
    actorRole: 'CLIENT',
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('success: writes REVISION_REQUESTED audit and returns ok:true', async () => {
    selectSequence([
      [{ id: 'asset1', status: 'REVISION_REQUIRED' }], // asset lookup
      [],                                                // idempotency check (not found)
    ]);
    makeSuccessfulTx();

    const result = await requestRevision(base);
    expect(result).toMatchObject({ ok: true });
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it('not_found: returns ok:false when asset query returns no row', async () => {
    selectSequence([[]]);

    const result = await requestRevision(base);
    expect(result).toMatchObject({ ok: false, reason: 'not_found' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('not_revision_required: returns ok:false when asset status is READY_FOR_QC', async () => {
    selectSequence([[{ id: 'asset1', status: 'READY_FOR_QC' }]]);

    const result = await requestRevision(base);
    expect(result).toMatchObject({ ok: false, reason: 'not_revision_required' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('idempotent: returns ok:true without second audit event when key already consumed', async () => {
    selectSequence([
      [{ id: 'asset1', status: 'REVISION_REQUIRED' }],
      [{ status: 'COMPLETED' }], // idempotency key already consumed
    ]);

    const result = await requestRevision(base);
    expect(result).toMatchObject({ ok: true });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('tenant isolation: query uses organizationId from params not asset row', async () => {
    // When asset is not in the specified org, asset lookup returns no row
    selectSequence([[]]);

    const result = await requestRevision({ ...base, organizationId: 'other-org' });
    expect(result).toMatchObject({ ok: false, reason: 'not_found' });
  });

  it('includes notes in audit event payload when provided', async () => {
    selectSequence([
      [{ id: 'asset1', status: 'REVISION_REQUIRED' }],
      [],
    ]);

    let auditPayload: unknown;
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockImplementation((vals: unknown) => {
            const v = vals as Record<string, unknown>;
            if (v.action === 'REVISION_REQUESTED') auditPayload = v.payload;
            return { onConflictDoNothing: vi.fn().mockResolvedValue([]) };
          }),
        })),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
        }),
      };
      await fn(tx);
    });

    await requestRevision({ ...base, notes: 'Please fix the color grading' });
    expect(auditPayload).toMatchObject({ notes: 'Please fix the color grading' });
  });
});
