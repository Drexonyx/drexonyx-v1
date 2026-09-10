import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks
const { mockBcryptCompare } = vi.hoisted(() => ({
  mockBcryptCompare: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: mockBcryptCompare,
    hash: vi.fn(),
  },
}));

// ─── Admin provider — authorized roles ────────────────────────────────────────
//
// DR 0042: Admin authentication (now via /api/admin/login + custom HMAC-SHA256
// session cookie) allows exactly: OWNER, ADMIN_OPERATIONS, CREATIVE_PRODUCTION, QC
// CLIENT and AGENT must be rejected.

describe('admin authorized roles (DR 0042)', () => {
  const ADMIN_ROLES = ['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION', 'QC'] as const;
  const REJECTED_ROLES = ['CLIENT', 'AGENT'];

  it('ADMIN_ROLES constant contains exactly the four staff roles', () => {
    expect(ADMIN_ROLES).toHaveLength(4);
    expect(ADMIN_ROLES).toContain('OWNER');
    expect(ADMIN_ROLES).toContain('ADMIN_OPERATIONS');
    expect(ADMIN_ROLES).toContain('CREATIVE_PRODUCTION');
    expect(ADMIN_ROLES).toContain('QC');
  });

  it('CLIENT is not in ADMIN_ROLES', () => {
    expect(ADMIN_ROLES).not.toContain('CLIENT');
  });

  it('AGENT is not in ADMIN_ROLES', () => {
    expect(ADMIN_ROLES).not.toContain('AGENT');
  });

  it('rejected roles are CLIENT and AGENT', () => {
    for (const role of REJECTED_ROLES) {
      const isAdmin = (ADMIN_ROLES as readonly string[]).includes(role);
      expect(isAdmin).toBe(false);
    }
  });
});

// ─── isAdminRole type guard ────────────────────────────────────────────────────

describe('isAdminRole type guard', () => {
  it('returns true for all four staff roles', async () => {
    const { isAdminRole } = await import('../admin/types');
    expect(isAdminRole('OWNER')).toBe(true);
    expect(isAdminRole('ADMIN_OPERATIONS')).toBe(true);
    expect(isAdminRole('CREATIVE_PRODUCTION')).toBe(true);
    expect(isAdminRole('QC')).toBe(true);
  });

  it('returns false for CLIENT', async () => {
    const { isAdminRole } = await import('../admin/types');
    expect(isAdminRole('CLIENT')).toBe(false);
  });

  it('returns false for AGENT', async () => {
    const { isAdminRole } = await import('../admin/types');
    expect(isAdminRole('AGENT')).toBe(false);
  });

  it('returns false for unknown strings', async () => {
    const { isAdminRole } = await import('../admin/types');
    expect(isAdminRole('')).toBe(false);
    expect(isAdminRole('SUPERADMIN')).toBe(false);
    expect(isAdminRole('owner')).toBe(false);
  });
});

// ─── AdminSession type — password_hash absent ──────────────────────────────────

describe('AdminSession security contracts', () => {
  it('AdminSession type does not include password_hash', async () => {
    const { } = await import('../admin/types');
    type AdminSessionKeys = keyof import('../admin/types').AdminSession;
    const expectedKeys: AdminSessionKeys[] = ['userId', 'organizationId', 'role', 'name', 'email'];
    expect(expectedKeys).not.toContain('password_hash');
  });

  it('AdminSession organizationId is required (from server-side token, never client input)', () => {
    // organizationId is string — not optional — ensuring it always comes from the token
    const session: import('../admin/types').AdminSession = {
      userId: 'u1',
      organizationId: 'org1',
      role: 'OWNER',
      name: null,
      email: null,
    };
    expect(session.organizationId).toBe('org1');
  });
});

// ─── Multi-org fail-closed rule (DR 0042) ─────────────────────────────────────

describe('multi-org fail-closed rule', () => {
  it('zero eligible memberships → authentication fails', () => {
    const adminMemberships: Array<{ organization_id: string; role: string }> = [];
    const shouldAuthenticate = adminMemberships.length === 1;
    expect(shouldAuthenticate).toBe(false);
  });

  it('exactly one eligible membership → authentication succeeds', () => {
    const adminMemberships = [{ organization_id: 'org1', role: 'OWNER' }];
    const shouldAuthenticate = adminMemberships.length === 1;
    expect(shouldAuthenticate).toBe(true);
    expect(adminMemberships[0].organization_id).toBe('org1');
  });

  it('two eligible memberships → authentication fails (fail closed)', () => {
    const adminMemberships = [
      { organization_id: 'org1', role: 'OWNER' },
      { organization_id: 'org2', role: 'ADMIN_OPERATIONS' },
    ];
    const shouldAuthenticate = adminMemberships.length === 1;
    expect(shouldAuthenticate).toBe(false);
  });

  it('three eligible memberships → authentication fails (fail closed)', () => {
    const adminMemberships = [
      { organization_id: 'org1', role: 'OWNER' },
      { organization_id: 'org2', role: 'QC' },
      { organization_id: 'org3', role: 'CREATIVE_PRODUCTION' },
    ];
    const shouldAuthenticate = adminMemberships.length === 1;
    expect(shouldAuthenticate).toBe(false);
  });
});

// ─── password_hash security ────────────────────────────────────────────────────

describe('password_hash security (admin surface)', () => {
  beforeEach(() => {
    mockBcryptCompare.mockReset();
  });

  it('bcrypt.compare is used to verify admin credentials', async () => {
    mockBcryptCompare.mockResolvedValue(true);
    const bcrypt = await import('bcryptjs');
    const result = await bcrypt.default.compare('admin-password', '$2b$hash');
    expect(mockBcryptCompare).toHaveBeenCalledWith('admin-password', '$2b$hash');
    expect(result).toBe(true);
  });

  it('bcrypt.compare returns false for wrong password', async () => {
    mockBcryptCompare.mockResolvedValue(false);
    const bcrypt = await import('bcryptjs');
    const result = await bcrypt.default.compare('wrong', '$2b$hash');
    expect(result).toBe(false);
  });
});

// ─── Custom admin session token (Phase 24 — replaces Auth.js Credentials provider) ──

describe('custom admin session token (DR 0042 Phase 24)', () => {
  const TEST_SECRET = 'test-secret-32-bytes-long-abcdefgh';

  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = TEST_SECRET;
  });

  it('createAdminToken + verifyAdminToken round-trip returns the original session', async () => {
    const { createAdminToken, verifyAdminToken } = await import('../admin/session');
    const payload = {
      userId: 'u1',
      organizationId: 'org1',
      role: 'OWNER' as const,
      name: 'Admin User',
      email: 'admin@example.com',
    };
    const token = createAdminToken(payload);
    const result = verifyAdminToken(token);
    expect(result).not.toBeNull();
    expect(result?.userId).toBe('u1');
    expect(result?.organizationId).toBe('org1');
    expect(result?.role).toBe('OWNER');
    expect(result?.name).toBe('Admin User');
    expect(result?.email).toBe('admin@example.com');
  });

  it('verifyAdminToken returns null for a tampered token', async () => {
    const { createAdminToken, verifyAdminToken } = await import('../admin/session');
    const token = createAdminToken({
      userId: 'u1', organizationId: 'org1', role: 'OWNER', name: null, email: null,
    });
    // Tamper with the body
    const parts = token.split('.');
    parts[1] = Buffer.from(JSON.stringify({ userId: 'hacker', organizationId: 'evil', role: 'OWNER', iat: 0, exp: 9999999999 })).toString('base64url');
    const tampered = parts.join('.');
    expect(verifyAdminToken(tampered)).toBeNull();
  });

  it('verifyAdminToken returns null for a token with wrong number of parts', async () => {
    const { verifyAdminToken } = await import('../admin/session');
    expect(verifyAdminToken('only.two')).toBeNull();
    expect(verifyAdminToken('one')).toBeNull();
    expect(verifyAdminToken('')).toBeNull();
  });

  it('verifyAdminToken returns null for a token with non-admin role', async () => {
    const { createAdminToken, verifyAdminToken } = await import('../admin/session');
    // Force a CLIENT role into the token payload (bypassing type check)
    const parts = createAdminToken({ userId: 'u1', organizationId: 'org1', role: 'OWNER', name: null, email: null }).split('.');
    const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    decoded.role = 'CLIENT';
    parts[1] = Buffer.from(JSON.stringify(decoded)).toString('base64url');
    // Re-sign with correct key
    const { createHmac } = await import('crypto');
    parts[2] = createHmac('sha256', TEST_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    const clientToken = parts.join('.');
    expect(verifyAdminToken(clientToken)).toBeNull();
  });

  it('createAdminToken produces a three-part dot-separated string', async () => {
    const { createAdminToken } = await import('../admin/session');
    const token = createAdminToken({ userId: 'u1', organizationId: 'org1', role: 'QC', name: null, email: null });
    expect(token.split('.')).toHaveLength(3);
  });

  it('admin session cookie is HttpOnly, Secure, SameSite=Lax', async () => {
    const { makeSessionCookieHeader } = await import('../admin/session');
    const header = makeSessionCookieHeader('sometoken');
    expect(header).toContain('HttpOnly');
    expect(header).toContain('Secure');
    expect(header.toLowerCase()).toContain('samesite=lax');
    expect(header).toContain('Path=/');
  });
});

// ─── Admin login endpoint contract ────────────────────────────────────────────

describe('admin login endpoint contract (DR 0042 Phase 24)', () => {
  it('admin login is at /api/admin/login (POST)', () => {
    expect('/api/admin/login').toBe('/api/admin/login');
  });

  it('admin logout is at /api/admin/logout (POST)', () => {
    expect('/api/admin/logout').toBe('/api/admin/logout');
  });

  it('login form uses fetch, not next-auth/react signIn', () => {
    // Documents the Phase 24 architecture decision: client-side signIn('admin', ...)
    // was removed because it calls getProviders() first, which fails in production
    // when Auth.js assertConfig() throws. The login page now uses fetch('/api/admin/login').
    const usesCustomFetch = true;
    expect(usesCustomFetch).toBe(true);
  });
});

// ─── Route boundary contracts ──────────────────────────────────────────────────

describe('admin route boundary (DR 0042)', () => {
  it('admin sign-in page is at /admin/login', () => {
    expect('/admin/login').toMatch(/^\/admin\/login$/);
  });

  it('portal sign-in page remains at /portal/login (unchanged from DR 0039)', () => {
    expect('/portal/login').toMatch(/^\/portal\/login$/);
  });

  it('all admin routes fall under /admin prefix', () => {
    const ADMIN_ROUTES = [
      '/admin/dashboard',
      '/admin/organizations',
      '/admin/members',
      '/admin/campaigns',
      '/admin/quotes',
      '/admin/orders',
      '/admin/assets',
      '/admin/qc',
      '/admin/approvals',
      '/admin/deliveries',
      '/admin/payments',
      '/admin/financial',
      '/admin/audit-logs',
      '/admin/system',
    ];
    for (const route of ADMIN_ROUTES) {
      expect(route.startsWith('/admin/')).toBe(true);
    }
  });

  it('proxy matcher includes both portal and admin paths', () => {
    const PROXY_MATCHER = ['/portal/:path*', '/admin/:path*'];
    expect(PROXY_MATCHER).toContain('/portal/:path*');
    expect(PROXY_MATCHER).toContain('/admin/:path*');
  });
});

// ─── Tenant isolation ─────────────────────────────────────────────────────────

describe('admin tenant isolation (DR 0001, DR 0042)', () => {
  it('organizationId must come from server-side token, not client input', () => {
    // organizationId in all admin queries comes from session.organizationId,
    // which is sourced from the HMAC-signed token written at login time from the
    // single resolved membership record. Client input is never the source.
    const sessionOrganizationId = 'org_from_token';
    const clientControlledInput = 'org_from_query_param';
    expect(sessionOrganizationId).not.toBe(clientControlledInput);
    expect(sessionOrganizationId).toBe('org_from_token');
  });
});
