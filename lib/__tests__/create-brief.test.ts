import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockInsert, mockTransaction } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: {
    insert: mockInsert,
    transaction: mockTransaction,
  },
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-brief-uuid' }));

import { createBrief } from '../admin/create-brief';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTx() {
  return {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    }),
  };
}

const base = {
  campaignId: 'campaign-uuid-1',
  organizationId: 'org-drex-1',
  actorId: 'actor-uuid-1',
  actorRole: 'OWNER' as const,
};

// ─── createBrief ─────────────────────────────────────────────────────────────

describe('createBrief', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok:false for CREATIVE_PRODUCTION role', async () => {
    const result = await createBrief({ ...base, actorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false for QC role', async () => {
    const result = await createBrief({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false when campaignId is empty', async () => {
    const result = await createBrief({ ...base, campaignId: '' });
    expect(result).toMatchObject({ ok: false });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:true for OWNER role', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });
    const result = await createBrief(base);
    expect(result).toEqual({ ok: true, briefId: 'test-brief-uuid' });
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it('returns ok:true for ADMIN_OPERATIONS role', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });
    const result = await createBrief({ ...base, actorRole: 'ADMIN_OPERATIONS' });
    expect(result).toEqual({ ok: true, briefId: 'test-brief-uuid' });
  });

  it('inserts brief with DRAFT status', async () => {
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

    await createBrief({ ...base, briefText: 'Test brief content' });

    const brief = inserts[0] as Record<string, unknown>;
    expect(brief).toMatchObject({ status: 'DRAFT', campaign_id: 'campaign-uuid-1', organization_id: 'org-drex-1' });
  });

  it('stores nullable content fields', async () => {
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

    await createBrief({
      ...base,
      briefText: 'Brief text',
      deliverables: '3 videos',
      targetAudience: 'Gen Z',
      timelineNotes: '2 weeks',
      additionalNotes: 'Extra notes',
    });

    const brief = inserts[0] as Record<string, unknown>;
    expect(brief).toMatchObject({
      brief_text: 'Brief text',
      deliverables: '3 videos',
      target_audience: 'Gen Z',
      timeline_notes: '2 weeks',
      additional_notes: 'Extra notes',
    });
  });

  it('sets null for omitted content fields', async () => {
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

    await createBrief(base);

    const brief = inserts[0] as Record<string, unknown>;
    expect(brief.brief_text).toBeNull();
    expect(brief.deliverables).toBeNull();
  });

  it('emits BRIEF_CREATED audit event', async () => {
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

    await createBrief(base);

    const audit = inserts[1] as Record<string, unknown>;
    expect(audit).toMatchObject({
      organization_id: 'org-drex-1',
      entity_type: 'brief',
      actor_id: 'actor-uuid-1',
      actor_role: 'OWNER',
      action: 'BRIEF_CREATED',
    });
  });

  it('re-throws unexpected database errors', async () => {
    mockTransaction.mockImplementation(() => {
      throw new Error('db error');
    });
    await expect(createBrief(base)).rejects.toThrow('db error');
  });
});
