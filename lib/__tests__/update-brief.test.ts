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

import {
  updateBriefContent,
  submitBrief,
  approveBrief,
  requestBriefRevision,
  returnBriefToDraft,
} from '../admin/update-brief';

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
  briefId: 'brief-uuid-1',
  organizationId: 'org-drex-1',
  actorId: 'actor-uuid-1',
  actorRole: 'OWNER' as const,
};

// ─── updateBriefContent ───────────────────────────────────────────────────────

describe('updateBriefContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok:false for CREATIVE_PRODUCTION role', async () => {
    const result = await updateBriefContent({ ...base, actorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false for QC role', async () => {
    const result = await updateBriefContent({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:true for OWNER role', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });
    const result = await updateBriefContent(base);
    expect(result).toEqual({ ok: true });
  });

  it('returns ok:true for ADMIN_OPERATIONS role', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });
    const result = await updateBriefContent({ ...base, actorRole: 'ADMIN_OPERATIONS' });
    expect(result).toEqual({ ok: true });
  });

  it('writes content fields', async () => {
    const updates: unknown[] = [];
    const tx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((data: unknown) => {
          updates.push(data);
          return { where: vi.fn().mockResolvedValue([]) };
        }),
      }),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await updateBriefContent({ ...base, briefText: 'Updated text', deliverables: 'New deliverables' });

    const update = updates[0] as Record<string, unknown>;
    expect(update).toMatchObject({ brief_text: 'Updated text', deliverables: 'New deliverables' });
  });

  it('emits BRIEF_CONTENT_UPDATED audit event', async () => {
    const inserts: unknown[] = [];
    const tx = {
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
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

    await updateBriefContent(base);

    const audit = inserts[0] as Record<string, unknown>;
    expect(audit).toMatchObject({
      organization_id: 'org-drex-1',
      entity_type: 'brief',
      entity_id: 'brief-uuid-1',
      actor_id: 'actor-uuid-1',
      action: 'BRIEF_CONTENT_UPDATED',
    });
  });
});

// ─── submitBrief ──────────────────────────────────────────────────────────────

describe('submitBrief', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok:false for CREATIVE_PRODUCTION role', async () => {
    const result = await submitBrief({ ...base, actorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:true for OWNER role and writes SUBMITTED status', async () => {
    const updates: unknown[] = [];
    const tx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((data: unknown) => {
          updates.push(data);
          return { where: vi.fn().mockResolvedValue([]) };
        }),
      }),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    const result = await submitBrief(base);
    expect(result).toEqual({ ok: true });
    const update = updates[0] as Record<string, unknown>;
    expect(update).toMatchObject({ status: 'SUBMITTED' });
  });

  it('emits BRIEF_SUBMITTED audit event', async () => {
    const inserts: unknown[] = [];
    const tx = {
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
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

    await submitBrief(base);
    const audit = inserts[0] as Record<string, unknown>;
    expect(audit).toMatchObject({ action: 'BRIEF_SUBMITTED', entity_type: 'brief' });
  });
});

// ─── approveBrief ─────────────────────────────────────────────────────────────

describe('approveBrief', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok:false for QC role', async () => {
    const result = await approveBrief({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:true for ADMIN_OPERATIONS and writes APPROVED status', async () => {
    const updates: unknown[] = [];
    const tx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((data: unknown) => {
          updates.push(data);
          return { where: vi.fn().mockResolvedValue([]) };
        }),
      }),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    const result = await approveBrief({ ...base, actorRole: 'ADMIN_OPERATIONS' });
    expect(result).toEqual({ ok: true });
    expect((updates[0] as Record<string, unknown>)).toMatchObject({ status: 'APPROVED' });
  });
});

// ─── requestBriefRevision ─────────────────────────────────────────────────────

describe('requestBriefRevision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok:false for CREATIVE_PRODUCTION role', async () => {
    const result = await requestBriefRevision({ ...base, actorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false });
  });

  it('writes REVISION_REQUIRED status and emits audit event', async () => {
    const updates: unknown[] = [];
    const inserts: unknown[] = [];
    const tx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((data: unknown) => {
          updates.push(data);
          return { where: vi.fn().mockResolvedValue([]) };
        }),
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

    const result = await requestBriefRevision(base);
    expect(result).toEqual({ ok: true });
    expect((updates[0] as Record<string, unknown>)).toMatchObject({ status: 'REVISION_REQUIRED' });
    expect((inserts[0] as Record<string, unknown>)).toMatchObject({ action: 'BRIEF_REVISION_REQUESTED' });
  });
});

// ─── returnBriefToDraft ───────────────────────────────────────────────────────

describe('returnBriefToDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok:false for QC role', async () => {
    const result = await returnBriefToDraft({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false });
  });

  it('writes DRAFT status and emits audit event', async () => {
    const updates: unknown[] = [];
    const inserts: unknown[] = [];
    const tx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((data: unknown) => {
          updates.push(data);
          return { where: vi.fn().mockResolvedValue([]) };
        }),
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

    const result = await returnBriefToDraft(base);
    expect(result).toEqual({ ok: true });
    expect((updates[0] as Record<string, unknown>)).toMatchObject({ status: 'DRAFT' });
    expect((inserts[0] as Record<string, unknown>)).toMatchObject({ action: 'BRIEF_RETURNED_TO_DRAFT' });
  });
});
