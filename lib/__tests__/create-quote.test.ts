import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockTransaction } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    transaction: mockTransaction,
  },
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-uuid' }));

import { createQuote } from '../admin/create-quote';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCampaignSelectChain(rows: { id: string }[]) {
  return mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  });
}

function makeTx() {
  return {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    }),
  };
}

// ─── createQuote ─────────────────────────────────────────────────────────────

describe('createQuote', () => {
  const base = {
    campaignId: 'campaign-1',
    totalAmount: '5000.00',
    organizationId: 'org-drex-1',
    actorId: 'actor-1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok:false for CREATIVE_PRODUCTION role', async () => {
    const result = await createQuote({ ...base, actorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false for QC role', async () => {
    const result = await createQuote({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns ok:false when totalAmount is zero', async () => {
    const result = await createQuote({ ...base, totalAmount: '0' });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('positive') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns ok:false when totalAmount is negative', async () => {
    const result = await createQuote({ ...base, totalAmount: '-100' });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:false when totalAmount is not a number', async () => {
    const result = await createQuote({ ...base, totalAmount: 'abc' });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:false when estimatedCost is zero', async () => {
    const result = await createQuote({ ...base, estimatedCost: '0' });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('positive') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns ok:false when estimatedCost is negative', async () => {
    const result = await createQuote({ ...base, estimatedCost: '-500' });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:false when campaign not found', async () => {
    makeCampaignSelectChain([]);

    const result = await createQuote(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('Campaign not found') });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('creates quote successfully with OWNER role', async () => {
    makeCampaignSelectChain([{ id: 'campaign-1' }]);
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    const result = await createQuote(base);
    expect(result).toMatchObject({ ok: true, quoteId: 'test-uuid' });
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it('creates quote successfully with ADMIN_OPERATIONS role', async () => {
    makeCampaignSelectChain([{ id: 'campaign-1' }]);
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    const result = await createQuote({ ...base, actorRole: 'ADMIN_OPERATIONS' });
    expect(result).toMatchObject({ ok: true, quoteId: 'test-uuid' });
  });

  it('creates quote without estimatedCost (null)', async () => {
    makeCampaignSelectChain([{ id: 'campaign-1' }]);
    const inserts: unknown[] = [];
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((data: unknown) => {
          inserts.push(data);
          return Promise.resolve([]);
        }),
      }),
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await createQuote(base);

    const quoteRow = inserts[0] as Record<string, unknown>;
    expect(quoteRow).toMatchObject({
      id: 'test-uuid',
      campaign_id: 'campaign-1',
      organization_id: 'org-drex-1',
      status: 'DRAFT',
      total_amount: '5000.00',
      estimated_cost: null,
      currency: 'USD',
    });
  });

  it('creates quote with estimatedCost when provided', async () => {
    makeCampaignSelectChain([{ id: 'campaign-1' }]);
    const inserts: unknown[] = [];
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((data: unknown) => {
          inserts.push(data);
          return Promise.resolve([]);
        }),
      }),
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await createQuote({ ...base, estimatedCost: '2000.00' });

    const quoteRow = inserts[0] as Record<string, unknown>;
    expect(quoteRow).toMatchObject({ estimated_cost: '2000.00' });
  });

  it('treats empty string estimatedCost as null', async () => {
    makeCampaignSelectChain([{ id: 'campaign-1' }]);
    const inserts: unknown[] = [];
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((data: unknown) => {
          inserts.push(data);
          return Promise.resolve([]);
        }),
      }),
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await createQuote({ ...base, estimatedCost: '   ' });

    const quoteRow = inserts[0] as Record<string, unknown>;
    expect(quoteRow).toMatchObject({ estimated_cost: null });
  });

  it('emits QUOTE_CREATED audit event with correct fields', async () => {
    makeCampaignSelectChain([{ id: 'campaign-1' }]);
    const inserts: unknown[] = [];
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((data: unknown) => {
          inserts.push(data);
          return Promise.resolve([]);
        }),
      }),
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await createQuote(base);

    const auditRow = inserts[1] as Record<string, unknown>;
    expect(auditRow).toMatchObject({
      organization_id: 'org-drex-1',
      entity_type: 'quote',
      actor_id: 'actor-1',
      actor_role: 'OWNER',
      action: 'QUOTE_CREATED',
    });
    const payload = auditRow.payload as Record<string, unknown>;
    expect(payload).toMatchObject({
      campaign_id: 'campaign-1',
      total_amount: '5000.00',
      status: 'DRAFT',
    });
  });

  it('re-throws unexpected database errors', async () => {
    makeCampaignSelectChain([{ id: 'campaign-1' }]);
    mockTransaction.mockImplementation(() => {
      throw new Error('connection timeout');
    });

    await expect(createQuote(base)).rejects.toThrow('connection timeout');
  });
});
