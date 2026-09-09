import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthorizationError, TenantIsolationError } from '../auth/errors';

// vi.hoisted runs before the vi.mock factory, making mockLimit available to the factory.
const { mockLimit } = vi.hoisted(() => ({
  mockLimit: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: mockLimit,
        }),
      }),
    }),
  },
}));

import { getMembership, assertMembership, assertRole, hasAnyRole } from '../auth/authorization';

// ─── Error classes ─────────────────────────────────────────────────────────────

describe('AuthorizationError', () => {
  it('has name AuthorizationError', () => {
    const err = new AuthorizationError('not allowed');
    expect(err.name).toBe('AuthorizationError');
  });

  it('has code AUTHORIZATION_ERROR', () => {
    const err = new AuthorizationError('not allowed');
    expect(err.code).toBe('AUTHORIZATION_ERROR');
  });

  it('is an instance of Error', () => {
    expect(new AuthorizationError('x')).toBeInstanceOf(Error);
  });
});

describe('TenantIsolationError', () => {
  it('has name TenantIsolationError', () => {
    const err = new TenantIsolationError('not a member');
    expect(err.name).toBe('TenantIsolationError');
  });

  it('has code TENANT_ISOLATION_ERROR', () => {
    const err = new TenantIsolationError('not a member');
    expect(err.code).toBe('TENANT_ISOLATION_ERROR');
  });

  it('is an instance of Error', () => {
    expect(new TenantIsolationError('x')).toBeInstanceOf(Error);
  });
});

// ─── hasAnyRole ───────────────────────────────────────────────────────────────

describe('hasAnyRole (pure function)', () => {
  it('returns true when role is in the allowed list', () => {
    expect(hasAnyRole('OWNER', ['OWNER', 'ADMIN_OPERATIONS'])).toBe(true);
  });

  it('returns false when role is not in the allowed list', () => {
    expect(hasAnyRole('AGENT', ['OWNER', 'ADMIN_OPERATIONS'])).toBe(false);
  });

  it('returns true for a single-entry allowed list that matches', () => {
    expect(hasAnyRole('QC', ['QC'])).toBe(true);
  });

  it('returns false for an empty allowed list', () => {
    expect(hasAnyRole('OWNER', [])).toBe(false);
  });

  it('CLIENT role is recognized', () => {
    expect(hasAnyRole('CLIENT', ['OWNER', 'ADMIN_OPERATIONS', 'CLIENT'])).toBe(true);
  });

  it('CREATIVE_PRODUCTION role is recognized', () => {
    expect(hasAnyRole('CREATIVE_PRODUCTION', ['CREATIVE_PRODUCTION', 'QC'])).toBe(true);
  });
});

// ─── getMembership ─────────────────────────────────────────────────────────────

describe('getMembership', () => {
  beforeEach(() => {
    mockLimit.mockReset();
  });

  it('returns null when no membership row is found', async () => {
    mockLimit.mockResolvedValue([]);
    expect(await getMembership('user-1', 'org-1')).toBeNull();
  });

  it('returns MembershipContext for an active OWNER membership', async () => {
    mockLimit.mockResolvedValue([
      { userId: 'user-1', organizationId: 'org-1', role: 'OWNER' },
    ]);
    const result = await getMembership('user-1', 'org-1');
    expect(result).toEqual({ userId: 'user-1', organizationId: 'org-1', role: 'OWNER' });
  });

  it('returns MembershipContext for AGENT membership', async () => {
    mockLimit.mockResolvedValue([
      { userId: 'user-2', organizationId: 'org-2', role: 'AGENT' },
    ]);
    const result = await getMembership('user-2', 'org-2');
    expect(result?.role).toBe('AGENT');
  });

  it('returns null if the role value is not an approved role', async () => {
    mockLimit.mockResolvedValue([
      { userId: 'user-1', organizationId: 'org-1', role: 'UNKNOWN_ROLE' },
    ]);
    expect(await getMembership('user-1', 'org-1')).toBeNull();
  });

  it('returns null for an empty string role', async () => {
    mockLimit.mockResolvedValue([
      { userId: 'user-1', organizationId: 'org-1', role: '' },
    ]);
    expect(await getMembership('user-1', 'org-1')).toBeNull();
  });
});

// ─── assertMembership ──────────────────────────────────────────────────────────

describe('assertMembership (tenant isolation)', () => {
  beforeEach(() => {
    mockLimit.mockReset();
  });

  it('returns membership when user is an active member', async () => {
    mockLimit.mockResolvedValue([
      { userId: 'user-1', organizationId: 'org-1', role: 'ADMIN_OPERATIONS' },
    ]);
    const result = await assertMembership('user-1', 'org-1');
    expect(result.role).toBe('ADMIN_OPERATIONS');
  });

  it('throws TenantIsolationError when user is not a member', async () => {
    mockLimit.mockResolvedValue([]);
    await expect(assertMembership('user-1', 'org-1')).rejects.toBeInstanceOf(
      TenantIsolationError,
    );
  });

  it('the TenantIsolationError is an Error', async () => {
    mockLimit.mockResolvedValue([]);
    await expect(assertMembership('user-1', 'org-1')).rejects.toBeInstanceOf(Error);
  });

  it('throws TenantIsolationError (not AuthorizationError) for non-member', async () => {
    mockLimit.mockResolvedValue([]);
    await expect(assertMembership('user-1', 'org-1')).rejects.not.toBeInstanceOf(
      AuthorizationError,
    );
  });
});

// ─── assertRole ───────────────────────────────────────────────────────────────

describe('assertRole (RBAC enforcement)', () => {
  beforeEach(() => {
    mockLimit.mockReset();
  });

  it('returns membership when role is in allowedRoles', async () => {
    mockLimit.mockResolvedValue([
      { userId: 'user-1', organizationId: 'org-1', role: 'OWNER' },
    ]);
    const result = await assertRole('user-1', 'org-1', ['OWNER', 'ADMIN_OPERATIONS']);
    expect(result.role).toBe('OWNER');
  });

  it('throws AuthorizationError when role is not in allowedRoles', async () => {
    mockLimit.mockResolvedValue([
      { userId: 'user-1', organizationId: 'org-1', role: 'AGENT' },
    ]);
    await expect(
      assertRole('user-1', 'org-1', ['OWNER', 'ADMIN_OPERATIONS']),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('throws TenantIsolationError when user is not a member', async () => {
    mockLimit.mockResolvedValue([]);
    await expect(assertRole('user-1', 'org-1', ['OWNER'])).rejects.toBeInstanceOf(
      TenantIsolationError,
    );
  });

  it('AGENT role is rejected when only OWNER allowed', async () => {
    mockLimit.mockResolvedValue([
      { userId: 'user-1', organizationId: 'org-1', role: 'AGENT' },
    ]);
    await expect(assertRole('user-1', 'org-1', ['OWNER'])).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it('CLIENT role passes when CLIENT is in allowedRoles', async () => {
    mockLimit.mockResolvedValue([
      { userId: 'user-c', organizationId: 'org-1', role: 'CLIENT' },
    ]);
    const result = await assertRole('user-c', 'org-1', ['CLIENT', 'OWNER']);
    expect(result.role).toBe('CLIENT');
  });

  it('CREATIVE_PRODUCTION passes when CREATIVE_PRODUCTION is allowed', async () => {
    mockLimit.mockResolvedValue([
      { userId: 'user-cp', organizationId: 'org-1', role: 'CREATIVE_PRODUCTION' },
    ]);
    const result = await assertRole('user-cp', 'org-1', ['CREATIVE_PRODUCTION', 'QC']);
    expect(result.role).toBe('CREATIVE_PRODUCTION');
  });

  it('QC role is rejected when only OWNER and ADMIN_OPERATIONS are allowed', async () => {
    mockLimit.mockResolvedValue([
      { userId: 'user-qc', organizationId: 'org-1', role: 'QC' },
    ]);
    await expect(
      assertRole('user-qc', 'org-1', ['OWNER', 'ADMIN_OPERATIONS']),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
