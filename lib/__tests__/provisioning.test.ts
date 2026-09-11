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
    randomBytes: (_n: number) => ({  // eslint-disable-line @typescript-eslint/no-unused-vars
      toString: () => 'generated-password-abc123',
    }),
  };
});

import { provisionClient } from '../admin/provisioning';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const terminal = {
    limit: vi.fn().mockResolvedValue(result),
    then: (onFulfilled: (v: unknown[]) => void, onRejected?: (e: unknown) => void) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    where: vi.fn().mockReturnValue(terminal),
  };
  chain.from.mockReturnValue(chain);
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

// makeTx returns a transaction mock that handles:
//   - tx.insert().values().onConflictDoNothing()  (idempotency key PROCESSING insert)
//   - await tx.insert().values()                  (org/user/membership/audit inserts)
//   - tx.update().set().where()                   (idempotency key COMPLETED update)
function makeTx(insertSpy?: (data: unknown) => void) {
  const valuesResult = {
    onConflictDoNothing: vi.fn().mockResolvedValue([]),
    then: (onFulfilled: (v: unknown) => void, onRejected?: (e: unknown) => void) =>
      Promise.resolve([]).then(onFulfilled, onRejected),
  };
  return {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockImplementation((data: unknown) => {
        insertSpy?.(data);
        return valuesResult;
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
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

  // ─── Authorization ───────────────────────────────────────────────────────────

  it('returns ok:false for ADMIN_OPERATIONS role (DR 0105 §3.1, Owner decision 1)', async () => {
    const result = await provisionClient({ ...base, actorRole: 'ADMIN_OPERATIONS' });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
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

  // ─── Input validation ─────────────────────────────────────────────────────

  it('returns ok:false when organization name is empty', async () => {
    const result = await provisionClient({ ...base, organizationName: '' });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('Organization name') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns ok:false when slug contains spaces', async () => {
    const result = await provisionClient({ ...base, organizationSlug: 'acme corp' });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('slug') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns ok:false when email is invalid', async () => {
    const result = await provisionClient({ ...base, userEmail: 'not-an-email' });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('email') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns ok:false when display name is empty', async () => {
    const result = await provisionClient({ ...base, userDisplayName: '' });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('display name') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  // ─── Idempotency fast-path (DR 0105 §3.6 + Owner decision 3) ─────────────

  it('returns ok:true immediately when idempotency key is COMPLETED', async () => {
    selectSequence([
      [{ status: 'COMPLETED', response_payload: { organizationId: 'org1', userId: 'u1', membershipId: 'm1' } }],
    ]);
    const result = await provisionClient(base);
    expect(result).toMatchObject({
      ok: true,
      organizationId: 'org1',
      userId: 'u1',
      membershipId: 'm1',
      temporaryPassword: '',
    });
    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockBcryptHash).not.toHaveBeenCalled();
  });

  it('returns ok:false (IN_PROGRESS) when idempotency key is PROCESSING', async () => {
    selectSequence([[{ status: 'PROCESSING', response_payload: null }]]);
    const result = await provisionClient(base);
    expect(result).toMatchObject({ ok: false, reason: 'IN_PROGRESS' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  // ─── Happy path ───────────────────────────────────────────────────────────

  it('provisions client successfully with OWNER role', async () => {
    selectSequence([[]]);  // no idempotency key
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
    expect(result.ok && typeof result.temporaryPassword).toBe('string');
    expect(result.ok && result.temporaryPassword).toBeTruthy();
    expect(mockBcryptHash).toHaveBeenCalledWith(expect.any(String), 12);
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it('accepts slug with uppercase (normalizes to lowercase)', async () => {
    selectSequence([[]]);
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });
    const result = await provisionClient({ ...base, organizationSlug: 'Acme-Corp' });
    expect(result).toMatchObject({ ok: true });
  });

  it('normalizes email to lowercase', async () => {
    const insertedEmails: string[] = [];
    selectSequence([[]]);
    const tx = makeTx((data) => {
      const row = data as Record<string, unknown>;
      if ('email' in row) insertedEmails.push(row.email as string);
    });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await provisionClient({ ...base, userEmail: 'CLIENT@ACME.COM' });
    expect(insertedEmails).toContain('client@acme.com');
  });

  it('trims slug whitespace and lowercases', async () => {
    selectSequence([[]]);
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    const result = await provisionClient({ ...base, organizationSlug: '  acme-corp  ' });
    expect(result).toMatchObject({ ok: true });
  });

  // ─── Password security (DR 0105 §3.4) ────────────────────────────────────

  it('password never appears in audit payload (DR 0105 §3.4)', async () => {
    selectSequence([[]]);
    const auditInserts: Record<string, unknown>[] = [];
    const tx = makeTx((data) => {
      const row = data as Record<string, unknown>;
      if ('action' in row) auditInserts.push(row);
    });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await provisionClient(base);

    expect(auditInserts.length).toBeGreaterThanOrEqual(2);
    for (const event of auditInserts) {
      const payload = event.payload as Record<string, unknown> | undefined;
      if (payload) {
        expect(payload).not.toHaveProperty('password_hash');
        expect(payload).not.toHaveProperty('temporaryPassword');
      }
    }
  });

  // ─── Audit events (DR 0105 §3.7) ─────────────────────────────────────────

  it('emits ORGANIZATION_PROVISIONED audit event', async () => {
    selectSequence([[]]);
    const auditInserts: Record<string, unknown>[] = [];
    const tx = makeTx((data) => {
      const row = data as Record<string, unknown>;
      if ('action' in row) auditInserts.push(row);
    });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await provisionClient(base);

    const orgAudit = auditInserts.find((a) => a.action === 'ORGANIZATION_PROVISIONED');
    expect(orgAudit).toBeDefined();
    expect(orgAudit).toMatchObject({
      entity_type: 'organization',
      actor_id: base.actorId,
      actor_role: 'OWNER',
    });
    const payload = orgAudit?.payload as Record<string, unknown>;
    expect(payload).toMatchObject({
      organization_name: base.organizationName,
      organization_slug: base.organizationSlug,
      actor_organization_id: base.actorOrganizationId,
    });
    expect(payload).not.toHaveProperty('password_hash');
    expect(payload).not.toHaveProperty('temporaryPassword');
  });

  it('emits CLIENT_USER_PROVISIONED audit event', async () => {
    selectSequence([[]]);
    const auditInserts: Record<string, unknown>[] = [];
    const tx = makeTx((data) => {
      const row = data as Record<string, unknown>;
      if ('action' in row) auditInserts.push(row);
    });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    await provisionClient(base);

    const userAudit = auditInserts.find((a) => a.action === 'CLIENT_USER_PROVISIONED');
    expect(userAudit).toBeDefined();
    expect(userAudit).toMatchObject({
      entity_type: 'user',
      actor_id: base.actorId,
      actor_role: 'OWNER',
    });
    const payload = userAudit?.payload as Record<string, unknown>;
    expect(payload).toMatchObject({
      user_email: 'client@acme.com',
      role: 'CLIENT',
      actor_organization_id: base.actorOrganizationId,
    });
    expect(payload).not.toHaveProperty('password_hash');
    expect(payload).not.toHaveProperty('temporaryPassword');
  });

  // ─── Duplicate / UNIQUE constraint handling ────────────────────────────────

  it('maps slug UNIQUE constraint violation to SLUG_TAKEN', async () => {
    selectSequence([[]]);
    mockTransaction.mockImplementation(() => {
      throw new Error('duplicate key value violates unique constraint "organizations_slug_unique"');
    });

    const result = await provisionClient(base);
    expect(result).toMatchObject({ ok: false, reason: 'SLUG_TAKEN' });
  });

  it('maps email UNIQUE constraint violation to EMAIL_TAKEN', async () => {
    selectSequence([[]]);
    mockTransaction.mockImplementation(() => {
      throw new Error('duplicate key value violates unique constraint "users_email_unique"');
    });

    const result = await provisionClient(base);
    expect(result).toMatchObject({ ok: false, reason: 'EMAIL_TAKEN' });
  });

  it('maps membership UNIQUE violation to MEMBERSHIP_EXISTS', async () => {
    selectSequence([[]]);
    mockTransaction.mockImplementation(() => {
      throw new Error('duplicate key value violates unique constraint "org_memberships_org_user_unique"');
    });

    const result = await provisionClient(base);
    expect(result).toMatchObject({ ok: false, reason: 'MEMBERSHIP_EXISTS' });
  });

  it('re-throws unexpected errors', async () => {
    selectSequence([[]]);
    mockTransaction.mockImplementation(() => {
      throw new Error('connection timeout');
    });

    await expect(provisionClient(base)).rejects.toThrow('connection timeout');
  });
});
