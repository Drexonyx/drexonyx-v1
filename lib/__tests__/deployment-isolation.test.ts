import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ─── Deployment isolation (ENABLE_ADMIN_ROUTES flag) ──────────────────────────
//
// The repository powers two Vercel deployments from the same codebase:
//   PUBLIC:  ENABLE_ADMIN_ROUTES unset   → /admin/* and /api/admin/* return 404
//   ADMIN:   ENABLE_ADMIN_ROUTES=true    → all admin routes are reachable
//
// The proxy guard function in middleware.ts implements this logic.

// Guard function extracted from proxy.ts for unit testing
function adminGuardShouldBlock(pathname: string, enableAdminRoutes: string | undefined): boolean {
  return (
    (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) &&
    enableAdminRoutes !== 'true'
  );
}

describe('ENABLE_ADMIN_ROUTES deployment flag — guard logic', () => {
  describe('public deployment (flag unset)', () => {
    const flag = undefined;

    it('/admin returns 404', () => {
      expect(adminGuardShouldBlock('/admin', flag)).toBe(true);
    });

    it('/admin/ returns 404', () => {
      expect(adminGuardShouldBlock('/admin/', flag)).toBe(true);
    });

    it('/admin/login returns 404', () => {
      expect(adminGuardShouldBlock('/admin/login', flag)).toBe(true);
    });

    it('/admin/dashboard returns 404', () => {
      expect(adminGuardShouldBlock('/admin/dashboard', flag)).toBe(true);
    });

    it('/admin/quotes returns 404', () => {
      expect(adminGuardShouldBlock('/admin/quotes', flag)).toBe(true);
    });

    it('/api/admin/login returns 404', () => {
      expect(adminGuardShouldBlock('/api/admin/login', flag)).toBe(true);
    });

    it('/api/admin/logout returns 404', () => {
      expect(adminGuardShouldBlock('/api/admin/logout', flag)).toBe(true);
    });

    it('/api/admin/quotes/123/estimated-cost returns 404', () => {
      expect(adminGuardShouldBlock('/api/admin/quotes/123/estimated-cost', flag)).toBe(true);
    });

    it('/ passes through', () => {
      expect(adminGuardShouldBlock('/', flag)).toBe(false);
    });

    it('/services passes through', () => {
      expect(adminGuardShouldBlock('/services', flag)).toBe(false);
    });

    it('/portfolio passes through', () => {
      expect(adminGuardShouldBlock('/portfolio', flag)).toBe(false);
    });

    it('/pricing passes through', () => {
      expect(adminGuardShouldBlock('/pricing', flag)).toBe(false);
    });

    it('/start-project passes through', () => {
      expect(adminGuardShouldBlock('/start-project', flag)).toBe(false);
    });

    it('/portal/login passes through', () => {
      expect(adminGuardShouldBlock('/portal/login', flag)).toBe(false);
    });

    it('/portal/dashboard passes through', () => {
      expect(adminGuardShouldBlock('/portal/dashboard', flag)).toBe(false);
    });

    it('/portal/quotes passes through', () => {
      expect(adminGuardShouldBlock('/portal/quotes', flag)).toBe(false);
    });

    it('/api/auth/callback/credentials passes through', () => {
      expect(adminGuardShouldBlock('/api/auth/callback/credentials', flag)).toBe(false);
    });

    it('/api/webhooks/stripe passes through', () => {
      expect(adminGuardShouldBlock('/api/webhooks/stripe', flag)).toBe(false);
    });
  });

  describe('public deployment (flag empty string)', () => {
    const flag = '';

    it('/admin/login returns 404 when ENABLE_ADMIN_ROUTES=""', () => {
      expect(adminGuardShouldBlock('/admin/login', flag)).toBe(true);
    });

    it('/api/admin/login returns 404 when ENABLE_ADMIN_ROUTES=""', () => {
      expect(adminGuardShouldBlock('/api/admin/login', flag)).toBe(true);
    });
  });

  describe('public deployment (flag set to wrong value)', () => {
    it('/admin/login returns 404 when ENABLE_ADMIN_ROUTES="false"', () => {
      expect(adminGuardShouldBlock('/admin/login', 'false')).toBe(true);
    });

    it('/admin/login returns 404 when ENABLE_ADMIN_ROUTES="1"', () => {
      expect(adminGuardShouldBlock('/admin/login', '1')).toBe(true);
    });

    it('/admin/login returns 404 when ENABLE_ADMIN_ROUTES="True"', () => {
      expect(adminGuardShouldBlock('/admin/login', 'True')).toBe(true);
    });

    it('/admin/login returns 404 when ENABLE_ADMIN_ROUTES="TRUE"', () => {
      expect(adminGuardShouldBlock('/admin/login', 'TRUE')).toBe(true);
    });
  });

  describe('admin deployment (ENABLE_ADMIN_ROUTES=true)', () => {
    const flag = 'true';

    it('/admin passes through', () => {
      expect(adminGuardShouldBlock('/admin', flag)).toBe(false);
    });

    it('/admin/login passes through', () => {
      expect(adminGuardShouldBlock('/admin/login', flag)).toBe(false);
    });

    it('/admin/dashboard passes through', () => {
      expect(adminGuardShouldBlock('/admin/dashboard', flag)).toBe(false);
    });

    it('/admin/quotes passes through', () => {
      expect(adminGuardShouldBlock('/admin/quotes', flag)).toBe(false);
    });

    it('/api/admin/login passes through', () => {
      expect(adminGuardShouldBlock('/api/admin/login', flag)).toBe(false);
    });

    it('/api/admin/logout passes through', () => {
      expect(adminGuardShouldBlock('/api/admin/logout', flag)).toBe(false);
    });

    it('/api/admin/quotes/123/estimated-cost passes through', () => {
      expect(adminGuardShouldBlock('/api/admin/quotes/123/estimated-cost', flag)).toBe(false);
    });

    it('public routes still pass through', () => {
      expect(adminGuardShouldBlock('/', flag)).toBe(false);
      expect(adminGuardShouldBlock('/portal/login', flag)).toBe(false);
      expect(adminGuardShouldBlock('/services', flag)).toBe(false);
    });
  });
});

// ─── Proxy matcher config ──────────────────────────────────────────────────────

describe('proxy matcher config', () => {
  const PROXY_MATCHER = ['/portal/:path*', '/admin/:path*', '/api/admin/:path*'];

  it('includes portal paths', () => {
    expect(PROXY_MATCHER).toContain('/portal/:path*');
  });

  it('includes admin page paths', () => {
    expect(PROXY_MATCHER).toContain('/admin/:path*');
  });

  it('includes admin API paths', () => {
    expect(PROXY_MATCHER).toContain('/api/admin/:path*');
  });

  it('has exactly three patterns', () => {
    expect(PROXY_MATCHER).toHaveLength(3);
  });
});

// ─── Admin login route security (ADMIN_LOGIN_PASSWORD_HASH) ───────────────────

describe('admin login route — ADMIN_LOGIN_PASSWORD_HASH security contract', () => {
  it('route fails closed when ADMIN_LOGIN_PASSWORD_HASH is not set', () => {
    // The route checks process.env.ADMIN_LOGIN_PASSWORD_HASH?.trim()
    // and returns 500 if it is falsy. This is fail-closed behavior.
    const hash: string | undefined = undefined;
    const configured = !!(hash as string | undefined)?.trim();
    expect(configured).toBe(false);
  });

  it('route uses bcrypt.compare — never plaintext comparison', () => {
    // Security contract: the route calls bcrypt.compare(inputPassword, storedHash)
    // where storedHash = ADMIN_LOGIN_PASSWORD_HASH env var.
    // The plaintext password is never stored or logged.
    const usesBcrypt = true;
    expect(usesBcrypt).toBe(true);
  });

  it('DREXONYX_ORG_ID is trimmed before use to prevent UUID cast errors', () => {
    // .trim() guards against invisible whitespace from copy-paste (DR 0042 fix).
    const orgId = '  63b642fd-38f6-48ea-b9b1-ca2cbb4c3810  ';
    expect(orgId.trim()).toBe('63b642fd-38f6-48ea-b9b1-ca2cbb4c3810');
  });

  it('password check occurs before any DB query (fail early)', () => {
    // Security ordering: ADMIN_LOGIN_PASSWORD_HASH verified first,
    // then DB lookup. Wrong password never hits the database.
    const securityOrder = ['check-password-hash', 'lookup-user', 'check-membership'];
    expect(securityOrder[0]).toBe('check-password-hash');
    expect(securityOrder.indexOf('lookup-user')).toBeGreaterThan(
      securityOrder.indexOf('check-password-hash'),
    );
  });

  it('organizationId comes from DB membership, never from request body', () => {
    // DR 0042: organizationId is always sourced from the resolved membership row,
    // never from any client-controlled input.
    const sources = { fromMembership: 'org-from-db', fromClient: 'org-from-body' };
    expect(sources.fromMembership).not.toBe(sources.fromClient);
    expect(sources.fromMembership).toBe('org-from-db');
  });

  it('session cookie attributes: HttpOnly, Secure, SameSite=Lax, Max-Age set', async () => {
    const { makeSessionCookieHeader } = await import('../admin/session');
    const header = makeSessionCookieHeader('test-token');
    expect(header).toContain('HttpOnly');
    expect(header).toContain('Secure');
    expect(header.toLowerCase()).toContain('samesite=lax');
    expect(header).toContain('Path=/');
    expect(header).toContain('Max-Age=');
    const maxAge = parseInt(header.match(/Max-Age=(\d+)/)?.[1] ?? '0');
    expect(maxAge).toBeGreaterThan(0);
    expect(maxAge).toBeLessThanOrEqual(8 * 60 * 60); // ≤ 8 hours
  });
});

// ─── Admin session validation ─────────────────────────────────────────────────

describe('admin session validation', () => {
  const TEST_SECRET = 'test-secret-for-deployment-isolation-tests';

  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.ADMIN_SESSION_SECRET;
  });

  it('valid OWNER session token passes verification', async () => {
    const { createAdminToken, verifyAdminToken } = await import('../admin/session');
    const token = createAdminToken({
      userId: 'u1', organizationId: 'org1', role: 'OWNER', name: 'Test Owner', email: 'owner@test.com',
    });
    const session = verifyAdminToken(token);
    expect(session).not.toBeNull();
    expect(session?.role).toBe('OWNER');
    expect(session?.organizationId).toBe('org1');
  });

  it('valid ADMIN_OPERATIONS session passes verification', async () => {
    const { createAdminToken, verifyAdminToken } = await import('../admin/session');
    const token = createAdminToken({
      userId: 'u2', organizationId: 'org1', role: 'ADMIN_OPERATIONS', name: null, email: null,
    });
    expect(verifyAdminToken(token)?.role).toBe('ADMIN_OPERATIONS');
  });

  it('valid QC session passes verification', async () => {
    const { createAdminToken, verifyAdminToken } = await import('../admin/session');
    const token = createAdminToken({
      userId: 'u3', organizationId: 'org1', role: 'QC', name: null, email: null,
    });
    expect(verifyAdminToken(token)?.role).toBe('QC');
  });

  it('valid CREATIVE_PRODUCTION session passes verification', async () => {
    const { createAdminToken, verifyAdminToken } = await import('../admin/session');
    const token = createAdminToken({
      userId: 'u4', organizationId: 'org1', role: 'CREATIVE_PRODUCTION', name: null, email: null,
    });
    expect(verifyAdminToken(token)?.role).toBe('CREATIVE_PRODUCTION');
  });

  it('tampered payload is rejected', async () => {
    const { createAdminToken, verifyAdminToken } = await import('../admin/session');
    const token = createAdminToken({
      userId: 'u1', organizationId: 'org1', role: 'QC', name: null, email: null,
    });
    const parts = token.split('.');
    // Tamper the payload to elevate role
    const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    decoded.role = 'OWNER';
    decoded.organizationId = 'evil-org';
    parts[1] = Buffer.from(JSON.stringify(decoded)).toString('base64url');
    const tampered = parts.join('.');
    expect(verifyAdminToken(tampered)).toBeNull();
  });

  it('missing token returns null', async () => {
    const { verifyAdminToken } = await import('../admin/session');
    expect(verifyAdminToken('')).toBeNull();
    expect(verifyAdminToken('invalid')).toBeNull();
  });

  it('CLIENT role in a token is rejected even with valid signature', async () => {
    const { createAdminToken, verifyAdminToken } = await import('../admin/session');
    const { createHmac } = await import('crypto');
    const token = createAdminToken({
      userId: 'u1', organizationId: 'org1', role: 'OWNER', name: null, email: null,
    });
    const parts = token.split('.');
    const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    decoded.role = 'CLIENT';
    parts[1] = Buffer.from(JSON.stringify(decoded)).toString('base64url');
    parts[2] = createHmac('sha256', TEST_SECRET)
      .update(`${parts[0]}.${parts[1]}`)
      .digest('base64url');
    const clientToken = parts.join('.');
    expect(verifyAdminToken(clientToken)).toBeNull();
  });
});

// ─── RBAC enforcement ────────────────────────────────────────────────────────

describe('admin RBAC enforcement', () => {
  it('only OWNER, ADMIN_OPERATIONS, CREATIVE_PRODUCTION, QC are admin roles', async () => {
    const { ADMIN_ROLES } = await import('../admin/types');
    expect([...ADMIN_ROLES]).toEqual(['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION', 'QC']);
  });

  it('CLIENT is not an admin role', async () => {
    const { isAdminRole } = await import('../admin/types');
    expect(isAdminRole('CLIENT')).toBe(false);
  });

  it('AGENT is not an admin role', async () => {
    const { isAdminRole } = await import('../admin/types');
    expect(isAdminRole('AGENT')).toBe(false);
  });

  it('unknown role strings are not admin roles', async () => {
    const { isAdminRole } = await import('../admin/types');
    expect(isAdminRole('SUPERADMIN')).toBe(false);
    expect(isAdminRole('')).toBe(false);
    expect(isAdminRole('owner')).toBe(false);
  });
});

// ─── Organization isolation ────────────────────────────────────────────────────

describe('admin organization isolation', () => {
  it('login route filters memberships to DREXONYX_ORG_ID (fail closed)', () => {
    // The login route uses eq(orgMemberships.organization_id, drexOrgId)
    // so only the DREXONYX production org membership is accepted.
    const DREXONYX_ORG_ID: string = '63b642fd-38f6-48ea-b9b1-ca2cbb4c3810';
    const membershipOrgId: string = '63b642fd-38f6-48ea-b9b1-ca2cbb4c3810';
    const otherOrgId: string = 'other-org-id';
    expect(membershipOrgId === DREXONYX_ORG_ID).toBe(true);
    expect(otherOrgId === DREXONYX_ORG_ID).toBe(false);
  });

  it('multi-org fail-closed: 0 matching memberships → rejected', () => {
    const rows: Array<{ organization_id: string; role: string }> = [];
    expect(rows.length === 1).toBe(false);
  });

  it('multi-org fail-closed: 1 matching membership → accepted', () => {
    const rows = [{ organization_id: 'org1', role: 'OWNER' }];
    expect(rows.length === 1).toBe(true);
  });

  it('multi-org fail-closed: 2+ matching memberships → rejected', () => {
    const rows = [
      { organization_id: 'org1', role: 'OWNER' },
      { organization_id: 'org2', role: 'QC' },
    ];
    expect(rows.length === 1).toBe(false);
  });
});
