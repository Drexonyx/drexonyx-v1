import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockInsert, mockTransaction, mockBcryptHash } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockTransaction: vi.fn(),
  mockBcryptHash: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: {
    insert: mockInsert,
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
      toString: () => 'generated-password-abc123',
    }),
  };
});

import { provisionClient } from '../admin/provisioning';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTx() {
  return {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    }),
  };
}

// ─── provisionClient ──────────────────────────────────────────────────────────

describe('provisionClient', () => {
  const base = {
    organizationName: 'Acme Corp',
    organizationSlug: 'acme-corp',
    userEmail: 'client@acme.com',
    userDisplayName: 'Acme Client',
    actorId: 'actor1',
    actorOrganizationId: 'admin-org1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockBcryptHash.mockResolvedValue('hashed-password');
  });

  it('returns ok:false for CREATIVE_PRODUCTION role', async () => {
    const result = await provisionClient({ ...base, actorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false for CLIENT role', async () => {
    const result = await provisionClient({ ...base, actorRole: 'CLIENT' as never });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:false for QC role', async () => {
    const result = await provisionClient({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:false when organization name is empty', async () => {
    const result = await provisionClient({ ...base, organizationName: '' });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('Organization name') });
  });

  it('accepts slug with uppercase (normalizes to lowercase)', async () => {
    // The service lowercases the slug before pattern validation — 'Acme-Corp' → 'acme-corp'
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });
    const result = await provisionClient({ ...base, organizationSlug: 'Acme-Corp' });
    expect(result).toMatchObject({ ok: true });
  });

  it('returns ok:false when slug contains spaces', async () => {
    const result = await provisionClient({ ...base, organizationSlug: 'acme corp' });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('slug') });
  });

  it('returns ok:false when email is invalid', async () => {
    const result = await provisionClient({ ...base, userEmail: 'not-an-email' });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('email') });
  });

  it('returns ok:false when display name is empty', async () => {
    const result = await provisionClient({ ...base, userDisplayName: '' });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('display name') });
  });

  it('provisions client successfully with OWNER role', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    const result = await provisionClient(base);
    expect(result).toMatchObject({
      ok: true,
      organizationId: 'test-uuid',
      userId: 'test-uuid',
      membershipId: 'test-uuid',
    });
    // Password must be a non-empty string generated server-side
    expect(result.ok && result.temporaryPassword).toBeTruthy();
    expect(result.ok && typeof result.temporaryPassword).toBe('string');
    // bcrypt must have been called at cost 12
    expect(mockBcryptHash).toHaveBeenCalledWith(expect.any(String), 12);
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it('provisions client successfully with ADMIN_OPERATIONS role', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    const result = await provisionClient({ ...base, actorRole: 'ADMIN_OPERATIONS' });
    expect(result).toMatchObject({ ok: true });
  });

  it('password never appears in audit payload (DR 0105 §3.4)', async () => {
    const tx = {
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((data: unknown) => {
          // Ensure password_hash and temporaryPassword are never in audit payloads
          if (typeof data === 'object' && data !== null && 'action' in data) {
            const record = data as Record<string, unknown>;
            const payload = record.payload as Record<string, unknown> | undefined;
            if (payload) {
              expect(payload).not.toHaveProperty('password_hash');
              expect(payload).not.toHaveProperty('temporaryPassword');
            }
          }
          return Promise.resolve([]);
        }),
      })),
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await provisionClient(base);
  });

  it('maps slug UNIQUE constraint violation to SLUG_TAKEN', async () => {
    mockTransaction.mockImplementation(() => {
      throw new Error('duplicate key value violates unique constraint "organizations_slug_unique"');
    });

    const result = await provisionClient(base);
    expect(result).toMatchObject({ ok: false, reason: 'SLUG_TAKEN' });
  });

  it('maps email UNIQUE constraint violation to EMAIL_TAKEN', async () => {
    mockTransaction.mockImplementation(() => {
      throw new Error('duplicate key value violates unique constraint "users_email_unique"');
    });

    const result = await provisionClient(base);
    expect(result).toMatchObject({ ok: false, reason: 'EMAIL_TAKEN' });
  });

  it('re-throws unexpected errors', async () => {
    mockTransaction.mockImplementation(() => {
      throw new Error('connection timeout');
    });

    await expect(provisionClient(base)).rejects.toThrow('connection timeout');
  });

  it('normalizes email to lowercase', async () => {
    const tx = {
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((data: unknown) => {
          if (typeof data === 'object' && data !== null && 'email' in data) {
            const record = data as { email: string };
            expect(record.email).toBe('client@acme.com');
          }
          return Promise.resolve([]);
        }),
      })),
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await provisionClient({ ...base, userEmail: 'CLIENT@ACME.COM' });
  });

  it('trims slug whitespace and lowercases', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    const result = await provisionClient({ ...base, organizationSlug: '  acme-corp  ' });
    expect(result).toMatchObject({ ok: true });
  });
});
