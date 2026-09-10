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

import { createCampaign } from '../admin/create-campaign';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTx() {
  return {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    }),
  };
}

// ─── createCampaign ──────────────────────────────────────────────────────────

describe('createCampaign', () => {
  const base = {
    name: 'Q4 UGC Launch',
    organizationId: 'org-drex-1',
    actorId: 'actor-1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok:false for CREATIVE_PRODUCTION role', async () => {
    const result = await createCampaign({ ...base, actorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false for QC role', async () => {
    const result = await createCampaign({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false when name is empty', async () => {
    const result = await createCampaign({ ...base, name: '' });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('1') });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false when name is whitespace only', async () => {
    const result = await createCampaign({ ...base, name: '   ' });
    expect(result).toMatchObject({ ok: false });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false when name exceeds 255 characters', async () => {
    const result = await createCampaign({ ...base, name: 'a'.repeat(256) });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('255') });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('creates campaign successfully with OWNER role', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    const result = await createCampaign(base);
    expect(result).toMatchObject({ ok: true, campaignId: 'test-uuid' });
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it('creates campaign successfully with ADMIN_OPERATIONS role', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    const result = await createCampaign({ ...base, actorRole: 'ADMIN_OPERATIONS' });
    expect(result).toMatchObject({ ok: true, campaignId: 'test-uuid' });
  });

  it('inserts campaign with DRAFT status and correct org', async () => {
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

    await createCampaign(base);

    const campaignRow = inserts[0] as Record<string, unknown>;
    expect(campaignRow).toMatchObject({
      id: 'test-uuid',
      organization_id: 'org-drex-1',
      name: 'Q4 UGC Launch',
      status: 'DRAFT',
    });
  });

  it('emits CAMPAIGN_CREATED audit event with correct fields', async () => {
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

    await createCampaign(base);

    const auditRow = inserts[1] as Record<string, unknown>;
    expect(auditRow).toMatchObject({
      organization_id: 'org-drex-1',
      entity_type: 'campaign',
      actor_id: 'actor-1',
      actor_role: 'OWNER',
      action: 'CAMPAIGN_CREATED',
    });
    const payload = auditRow.payload as Record<string, unknown>;
    expect(payload).toMatchObject({ status: 'DRAFT', name: 'Q4 UGC Launch' });
  });

  it('trims name whitespace', async () => {
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

    await createCampaign({ ...base, name: '  Q4 UGC Launch  ' });

    const campaignRow = inserts[0] as Record<string, unknown>;
    expect(campaignRow).toMatchObject({ name: 'Q4 UGC Launch' });
  });

  it('re-throws unexpected database errors', async () => {
    mockTransaction.mockImplementation(() => {
      throw new Error('connection timeout');
    });

    await expect(createCampaign(base)).rejects.toThrow('connection timeout');
  });
});
