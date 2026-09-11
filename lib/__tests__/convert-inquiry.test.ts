import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockUpdate, mockTransaction, mockBcryptHash } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
  mockBcryptHash: vi.fn(),
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

vi.mock('bcryptjs', () => ({
  default: { hash: mockBcryptHash },
}));

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  return {
    ...actual,
    randomBytes: (_n: number) => ({
      toString: () => 'generated-password-test',
    }),
  };
});

import { convertInquiry, slugFromName } from '../admin/convert-inquiry';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSelectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

function makeTx() {
  return {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
  };
}

const base = {
  inquiryId: 'inquiry-uuid-1',
  organizationName: 'Acme Corp',
  organizationSlug: 'acme-corp',
  userEmail: 'client@acme.com',
  userDisplayName: 'Acme Client',
  actorId: 'actor-uuid-1',
  actorOrganizationId: 'prod-org-1',
  actorRole: 'OWNER' as const,
};

const inquiryRow = {
  status: 'NEW',
  campaign_objective: 'Launch UGC ads',
  target_audience: 'Gen Z',
  additional_notes: 'Needs fast delivery',
};

// ─── slugFromName ─────────────────────────────────────────────────────────────

describe('slugFromName', () => {
  it('converts to lowercase with hyphens', () => {
    expect(slugFromName('Acme Corp')).toBe('acme-corp');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugFromName('  Foo  ')).toBe('foo');
  });

  it('collapses multiple special chars into one hyphen', () => {
    expect(slugFromName('Foo & Bar!!')).toBe('foo-bar');
  });

  it('returns "org" for empty result', () => {
    expect(slugFromName('!!!')).toBe('org');
  });

  it('truncates to 100 chars', () => {
    const long = 'a'.repeat(200);
    expect(slugFromName(long).length).toBe(100);
  });
});

// ─── convertInquiry role checks ───────────────────────────────────────────────

describe('convertInquiry role enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok:false for CREATIVE_PRODUCTION role', async () => {
    const result = await convertInquiry({ ...base, actorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false for QC role', async () => {
    const result = await convertInquiry({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

// ─── convertInquiry input validation ─────────────────────────────────────────

describe('convertInquiry input validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok:false for empty org name', async () => {
    const result = await convertInquiry({ ...base, organizationName: '' });
    expect(result).toMatchObject({ ok: false });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false for invalid slug characters', async () => {
    const result = await convertInquiry({ ...base, organizationSlug: 'has spaces' });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('Slug') });
  });

  it('returns ok:false for invalid email', async () => {
    const result = await convertInquiry({ ...base, userEmail: 'not-an-email' });
    expect(result).toMatchObject({ ok: false });
  });
});

// ─── convertInquiry idempotency guard ────────────────────────────────────────

describe('convertInquiry idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok:false ALREADY_CONVERTED when inquiry is already CONVERTED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ status: 'CONVERTED', campaign_objective: 'x', target_audience: null, additional_notes: null }]));
    const result = await convertInquiry(base);
    expect(result).toMatchObject({ ok: false, reason: 'ALREADY_CONVERTED' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false when inquiry not found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const result = await convertInquiry(base);
    expect(result).toMatchObject({ ok: false, reason: 'Inquiry not found' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

// ─── convertInquiry happy path ────────────────────────────────────────────────

describe('convertInquiry success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBcryptHash.mockResolvedValue('hashed-password');
  });

  it('returns ok:true with campaignId and organizationId for OWNER', async () => {
    mockSelect.mockReturnValue(makeSelectChain([inquiryRow]));
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    const result = await convertInquiry(base);
    expect(result).toMatchObject({ ok: true, campaignId: 'test-uuid', organizationId: 'test-uuid' });
  });

  it('returns ok:true for ADMIN_OPERATIONS role', async () => {
    mockSelect.mockReturnValue(makeSelectChain([inquiryRow]));
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    const result = await convertInquiry({ ...base, actorRole: 'ADMIN_OPERATIONS' });
    expect(result).toMatchObject({ ok: true });
  });

  it('returns temporaryPassword in result', async () => {
    mockSelect.mockReturnValue(makeSelectChain([inquiryRow]));
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    const result = await convertInquiry(base);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(typeof result.temporaryPassword).toBe('string');
      expect(result.temporaryPassword.length).toBeGreaterThan(0);
    }
  });

  it('marks inquiry CONVERTED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([inquiryRow]));
    const updates: unknown[] = [];
    const tx = {
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((data: unknown) => {
          updates.push(data);
          return { where: vi.fn().mockResolvedValue([]) };
        }),
      }),
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await convertInquiry(base);
    const inquiryUpdate = updates[0] as Record<string, unknown>;
    expect(inquiryUpdate).toMatchObject({ status: 'CONVERTED' });
  });

  it('inserts campaign in production org', async () => {
    mockSelect.mockReturnValue(makeSelectChain([inquiryRow]));
    const inserts: unknown[] = [];
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((data: unknown) => {
          inserts.push(data);
          return Promise.resolve([]);
        }),
      }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await convertInquiry(base);

    // inserts: org, user, clientMembership, productionMembership, campaign, brief, auditEvent1, auditEvent2
    const campaign = inserts[4] as Record<string, unknown>;
    expect(campaign).toMatchObject({
      organization_id: 'prod-org-1',
      status: 'DRAFT',
      objective: 'Launch UGC ads',
    });
  });

  it('creates brief with inquiry content fields', async () => {
    mockSelect.mockReturnValue(makeSelectChain([inquiryRow]));
    const inserts: unknown[] = [];
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((data: unknown) => {
          inserts.push(data);
          return Promise.resolve([]);
        }),
      }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await convertInquiry(base);

    const brief = inserts[5] as Record<string, unknown>;
    expect(brief).toMatchObject({
      status: 'DRAFT',
      brief_text: 'Launch UGC ads',
      target_audience: 'Gen Z',
      additional_notes: 'Needs fast delivery',
    });
  });

  it('emits INQUIRY_CONVERTED audit event', async () => {
    mockSelect.mockReturnValue(makeSelectChain([inquiryRow]));
    const inserts: unknown[] = [];
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((data: unknown) => {
          inserts.push(data);
          return Promise.resolve([]);
        }),
      }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await convertInquiry(base);

    const auditEvent = inserts[6] as Record<string, unknown>;
    expect(auditEvent).toMatchObject({
      organization_id: 'prod-org-1',
      entity_type: 'inquiry',
      entity_id: 'inquiry-uuid-1',
      actor_id: 'actor-uuid-1',
      actor_role: 'OWNER',
      action: 'INQUIRY_CONVERTED',
    });
  });

  it('creates two memberships — client org and production org', async () => {
    mockSelect.mockReturnValue(makeSelectChain([inquiryRow]));
    const inserts: unknown[] = [];
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((data: unknown) => {
          inserts.push(data);
          return Promise.resolve([]);
        }),
      }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await convertInquiry(base);

    const memberships = (inserts as Array<Record<string, unknown>>).filter((r) => r.role === 'CLIENT');
    expect(memberships).toHaveLength(2);
    const orgIds = memberships.map((m) => m.organization_id);
    expect(orgIds).toContain('prod-org-1');
  });
});

// ─── convertInquiry error mapping ────────────────────────────────────────────

describe('convertInquiry error mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBcryptHash.mockResolvedValue('hashed-password');
  });

  it('maps slug uniqueness error to SLUG_TAKEN', async () => {
    mockSelect.mockReturnValue(makeSelectChain([inquiryRow]));
    mockTransaction.mockImplementation(() => {
      throw new Error('organizations_slug_unique constraint violated');
    });

    const result = await convertInquiry(base);
    expect(result).toMatchObject({ ok: false, reason: 'SLUG_TAKEN' });
  });

  it('maps email uniqueness error to EMAIL_TAKEN', async () => {
    mockSelect.mockReturnValue(makeSelectChain([inquiryRow]));
    mockTransaction.mockImplementation(() => {
      throw new Error('users_email_unique constraint violated');
    });

    const result = await convertInquiry(base);
    expect(result).toMatchObject({ ok: false, reason: 'EMAIL_TAKEN' });
  });

  it('re-throws unexpected database errors', async () => {
    mockSelect.mockReturnValue(makeSelectChain([inquiryRow]));
    mockTransaction.mockImplementation(() => {
      throw new Error('connection refused');
    });

    await expect(convertInquiry(base)).rejects.toThrow('connection refused');
  });
});
