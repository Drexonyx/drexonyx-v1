import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockDb, mockBcryptHash, mockUuidv7 } = vi.hoisted(() => ({
  mockDb: { transaction: vi.fn() },
  mockBcryptHash: vi.fn(),
  mockUuidv7: vi.fn(),
}));

vi.mock('@/db/index', () => ({ db: mockDb }));
vi.mock('bcryptjs', () => ({ default: { hash: mockBcryptHash } }));
vi.mock('uuidv7', () => ({ uuidv7: mockUuidv7 }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a transaction mock that collects every .insert().values(v) call. */
function setupTransaction() {
  const inserted: unknown[] = [];
  mockDb.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
    const tx = {
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((v: unknown) => {
          inserted.push(v);
          return Promise.resolve(undefined);
        }),
      })),
    };
    await cb(tx);
  });
  return { getInserted: () => inserted };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockBcryptHash.mockResolvedValue('$2b$12$hashed-password');
  let n = 0;
  mockUuidv7.mockImplementation(() => `uuid-${n++}`);
  delete process.env.DREXONYX_ORG_ID;
});

// ─── Input validation ─────────────────────────────────────────────────────────

describe('selfRegisterClient — input validation', () => {
  it('rejects an invalid email', async () => {
    const { selfRegisterClient } = await import('@/lib/auth/self-register');
    const result = await selfRegisterClient({ email: 'notanemail', password: 'password123', displayName: 'Test' });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('email') });
  });

  it('rejects an empty display name', async () => {
    const { selfRegisterClient } = await import('@/lib/auth/self-register');
    const result = await selfRegisterClient({ email: 'test@example.com', password: 'password123', displayName: '' });
    expect(result).toEqual({ ok: false, reason: expect.any(String) });
  });

  it('rejects a password shorter than 8 characters', async () => {
    const { selfRegisterClient } = await import('@/lib/auth/self-register');
    const result = await selfRegisterClient({ email: 'test@example.com', password: 'short', displayName: 'Test User' });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('8') });
  });

  it('rejects a password longer than 128 characters', async () => {
    const { selfRegisterClient } = await import('@/lib/auth/self-register');
    const result = await selfRegisterClient({ email: 'test@example.com', password: 'a'.repeat(129), displayName: 'Test User' });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('128') });
  });
});

// ─── Successful registration ──────────────────────────────────────────────────

describe('selfRegisterClient — successful registration', () => {
  it('hashes the password with bcrypt cost 12 before storing', async () => {
    setupTransaction();
    const { selfRegisterClient } = await import('@/lib/auth/self-register');
    await selfRegisterClient({ email: 'alice@example.com', password: 'password123', displayName: 'Alice' });
    expect(mockBcryptHash).toHaveBeenCalledWith('password123', 12);
  });

  it('returns ok:true with organizationId and userId on success', async () => {
    setupTransaction();
    const { selfRegisterClient } = await import('@/lib/auth/self-register');
    const result = await selfRegisterClient({ email: 'alice@example.com', password: 'password123', displayName: 'Alice' });
    expect(result).toMatchObject({ ok: true, organizationId: expect.any(String), userId: expect.any(String) });
  });

  it('trims and lowercases the email before storage', async () => {
    const { getInserted } = setupTransaction();
    const { selfRegisterClient } = await import('@/lib/auth/self-register');
    await selfRegisterClient({ email: '  Alice@Example.COM  ', password: 'password123', displayName: 'Alice' });
    const rows = getInserted() as Record<string, unknown>[];
    const userRow = rows.find((r) => 'email' in r);
    expect(userRow?.email).toBe('alice@example.com');
  });

  it('creates 2 CLIENT memberships when DREXONYX_ORG_ID is set', async () => {
    process.env.DREXONYX_ORG_ID = 'prod-org-id';
    const { getInserted } = setupTransaction();
    const { selfRegisterClient } = await import('@/lib/auth/self-register');
    await selfRegisterClient({ email: 'bob@example.com', password: 'password123', displayName: 'Bob' });
    const rows = getInserted() as Record<string, unknown>[];
    const memberships = rows.filter((r) => r?.role === 'CLIENT');
    expect(memberships.length).toBe(2);
  });

  it('creates 1 CLIENT membership when DREXONYX_ORG_ID is not set', async () => {
    const { getInserted } = setupTransaction();
    const { selfRegisterClient } = await import('@/lib/auth/self-register');
    await selfRegisterClient({ email: 'carol@example.com', password: 'password123', displayName: 'Carol' });
    const rows = getInserted() as Record<string, unknown>[];
    const memberships = rows.filter((r) => r?.role === 'CLIENT');
    expect(memberships.length).toBe(1);
  });

  it('uses DREXONYX_ORG_ID as the session organizationId when set', async () => {
    process.env.DREXONYX_ORG_ID = 'prod-org-id';
    setupTransaction();
    const { selfRegisterClient } = await import('@/lib/auth/self-register');
    const result = await selfRegisterClient({ email: 'dave@example.com', password: 'password123', displayName: 'Dave' });
    expect(result).toMatchObject({ ok: true, organizationId: 'prod-org-id' });
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('selfRegisterClient — error handling', () => {
  it('returns EMAIL_TAKEN error on users_email_unique constraint violation', async () => {
    mockDb.transaction.mockRejectedValue(
      new Error('duplicate key value violates unique constraint "users_email_unique"')
    );
    const { selfRegisterClient } = await import('@/lib/auth/self-register');
    const result = await selfRegisterClient({ email: 'taken@example.com', password: 'password123', displayName: 'Taken' });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('already exists') });
  });

  it('returns a retry error on slug uniqueness conflict', async () => {
    mockDb.transaction.mockRejectedValue(
      new Error('duplicate key value violates unique constraint "organizations_slug_unique"')
    );
    const { selfRegisterClient } = await import('@/lib/auth/self-register');
    const result = await selfRegisterClient({ email: 'user@example.com', password: 'password123', displayName: 'User' });
    expect(result).toEqual({ ok: false, reason: expect.any(String) });
  });

  it('rethrows unexpected DB errors', async () => {
    mockDb.transaction.mockRejectedValue(new Error('connection refused'));
    const { selfRegisterClient } = await import('@/lib/auth/self-register');
    await expect(
      selfRegisterClient({ email: 'user@example.com', password: 'password123', displayName: 'User' })
    ).rejects.toThrow('connection refused');
  });
});
