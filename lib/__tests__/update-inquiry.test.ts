import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockUpdate, mockInsert, mockTransaction } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
  mockInsert: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: {
    update: mockUpdate,
    insert: mockInsert,
    transaction: mockTransaction,
  },
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-audit-uuid' }));

import { markInquiryReviewed, markInquiryDismissed } from '../admin/update-inquiry';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTx() {
  return {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    }),
  };
}

const base = {
  inquiryId: 'inquiry-uuid-1',
  actorId: 'actor-uuid-1',
  actorRole: 'OWNER' as const,
  actorOrganizationId: 'org-drex-1',
};

// ─── markInquiryReviewed ─────────────────────────────────────────────────────

describe('markInquiryReviewed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok:false for CREATIVE_PRODUCTION role', async () => {
    const result = await markInquiryReviewed({ ...base, actorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false for QC role', async () => {
    const result = await markInquiryReviewed({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false for CLIENT role', async () => {
    const result = await markInquiryReviewed({ ...base, actorRole: 'CLIENT' as never });
    expect(result).toMatchObject({ ok: false });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:true for OWNER role', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });
    const result = await markInquiryReviewed(base);
    expect(result).toEqual({ ok: true });
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it('returns ok:true for ADMIN_OPERATIONS role', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });
    const result = await markInquiryReviewed({ ...base, actorRole: 'ADMIN_OPERATIONS' });
    expect(result).toEqual({ ok: true });
  });

  it('writes REVIEWED status update', async () => {
    const updates: unknown[] = [];
    const tx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((data: unknown) => {
          updates.push(data);
          return {
            where: vi.fn().mockResolvedValue([]),
          };
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      }),
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await markInquiryReviewed(base);

    const update = updates[0] as Record<string, unknown>;
    expect(update).toMatchObject({ status: 'REVIEWED' });
  });

  it('emits INQUIRY_REVIEWED audit event', async () => {
    const inserts: unknown[] = [];
    const tx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      }),
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

    await markInquiryReviewed(base);

    const audit = inserts[0] as Record<string, unknown>;
    expect(audit).toMatchObject({
      organization_id: 'org-drex-1',
      entity_type: 'inquiry',
      entity_id: 'inquiry-uuid-1',
      actor_id: 'actor-uuid-1',
      actor_role: 'OWNER',
      action: 'INQUIRY_REVIEWED',
    });
  });

  it('re-throws unexpected database errors', async () => {
    mockTransaction.mockImplementation(() => {
      throw new Error('db error');
    });
    await expect(markInquiryReviewed(base)).rejects.toThrow('db error');
  });
});

// ─── markInquiryDismissed ─────────────────────────────────────────────────────

describe('markInquiryDismissed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok:false for CREATIVE_PRODUCTION role', async () => {
    const result = await markInquiryDismissed({ ...base, actorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:true for OWNER role', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });
    const result = await markInquiryDismissed(base);
    expect(result).toEqual({ ok: true });
  });

  it('returns ok:true for ADMIN_OPERATIONS role', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });
    const result = await markInquiryDismissed({ ...base, actorRole: 'ADMIN_OPERATIONS' });
    expect(result).toEqual({ ok: true });
  });

  it('writes DISMISSED status update', async () => {
    const updates: unknown[] = [];
    const tx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((data: unknown) => {
          updates.push(data);
          return { where: vi.fn().mockResolvedValue([]) };
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      }),
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await markInquiryDismissed(base);

    const update = updates[0] as Record<string, unknown>;
    expect(update).toMatchObject({ status: 'DISMISSED' });
  });

  it('emits INQUIRY_DISMISSED audit event', async () => {
    const inserts: unknown[] = [];
    const tx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      }),
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

    await markInquiryDismissed(base);

    const audit = inserts[0] as Record<string, unknown>;
    expect(audit).toMatchObject({
      organization_id: 'org-drex-1',
      entity_type: 'inquiry',
      action: 'INQUIRY_DISMISSED',
    });
  });
});
