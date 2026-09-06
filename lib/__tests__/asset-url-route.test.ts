// DR 0086: Secure Asset Delivery — route handler tests.
// GET /api/assets/[assetId]/url
// Verifies: auth gating, membership gating, tenant isolation, signed URL delivery,
// R2 credential boundary, and provider CDN URL exclusion.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockAuth,
  mockDbSelect,
  mockGetMembership,
  mockGenerateSignedUrl,
  mockJsonResponse,
} = vi.hoisted(() => {
  const mockAuth = vi.fn();
  const mockDbSelect = vi.fn();
  const mockGetMembership = vi.fn();
  const mockGenerateSignedUrl = vi.fn();

  const responses: Array<{ body: unknown; status: number }> = [];
  const mockJsonResponse = vi.fn((body: unknown, init?: { status?: number }) => {
    const status = init?.status ?? 200;
    responses.push({ body, status });
    return { _isNextResponse: true, body, status };
  });

  return { mockAuth, mockDbSelect, mockGetMembership, mockGenerateSignedUrl, mockJsonResponse, responses };
});

vi.mock('@/auth', () => ({ auth: mockAuth }));

vi.mock('@/db/index', () => ({
  db: {
    select: mockDbSelect,
  },
}));

vi.mock('@/db/schema/production', () => ({
  assets: { id: 'id', organization_id: 'organization_id', file_key: 'file_key', status: 'status' },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => ({ _and: args })),
  eq: vi.fn((a: unknown, b: unknown) => ({ _eq: [a, b] })),
}));

vi.mock('@/lib/auth/authorization', () => ({ getMembership: mockGetMembership }));

vi.mock('@/lib/infrastructure/object-storage', () => ({
  generateSignedUrl: mockGenerateSignedUrl,
}));

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: { json: mockJsonResponse },
}));

import { GET } from '../../app/api/assets/[assetId]/url/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest() {
  return {} as Parameters<typeof GET>[0];
}

function makeParams(assetId: string): Parameters<typeof GET>[1] {
  return { params: Promise.resolve({ assetId }) };
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 'user-001',
      organizationId: 'org-001',
      ...overrides,
    },
  };
}

function makeDbChain(rows: unknown[]) {
  const limitFn = vi.fn().mockResolvedValue(rows);
  const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
  const fromFn = vi.fn().mockReturnValue({ where: whereFn });
  mockDbSelect.mockReturnValue({ from: fromFn });
  return { fromFn, whereFn, limitFn };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DR 0086 — GET /api/assets/[assetId]/url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Authentication ───────────────────────────────────────────────────────

  it('returns 401 when there is no session', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(makeRequest(), makeParams('asset-001')) as { status: number };
    expect(res.status).toBe(401);
  });

  it('returns 401 when session has no user.id', async () => {
    mockAuth.mockResolvedValue({ user: {} });

    const res = await GET(makeRequest(), makeParams('asset-001')) as { status: number };
    expect(res.status).toBe(401);
  });

  // ─── Organization context ─────────────────────────────────────────────────

  it('returns 403 when session has no organizationId', async () => {
    mockAuth.mockResolvedValue(makeSession({ organizationId: undefined }));

    const res = await GET(makeRequest(), makeParams('asset-001')) as { status: number };
    expect(res.status).toBe(403);
  });

  // ─── Membership gate ──────────────────────────────────────────────────────

  it('returns 403 when user is not a member of the org', async () => {
    mockAuth.mockResolvedValue(makeSession());
    mockGetMembership.mockResolvedValue(null);
    makeDbChain([]);

    const res = await GET(makeRequest(), makeParams('asset-001')) as { status: number };
    expect(res.status).toBe(403);
  });

  it('calls getMembership with userId and organizationId from session', async () => {
    mockAuth.mockResolvedValue(makeSession());
    mockGetMembership.mockResolvedValue(null);

    await GET(makeRequest(), makeParams('asset-001'));

    expect(mockGetMembership).toHaveBeenCalledWith('user-001', 'org-001');
  });

  // ─── Asset lookup — tenant isolation ─────────────────────────────────────

  it('returns 404 when asset does not belong to the org', async () => {
    mockAuth.mockResolvedValue(makeSession());
    mockGetMembership.mockResolvedValue({ role: 'MEMBER' });
    makeDbChain([]);

    const res = await GET(makeRequest(), makeParams('asset-unknown')) as { status: number };
    expect(res.status).toBe(404);
  });

  it('returns 404 when asset has no file_key', async () => {
    mockAuth.mockResolvedValue(makeSession());
    mockGetMembership.mockResolvedValue({ role: 'MEMBER' });
    makeDbChain([{ id: 'asset-001', file_key: null, status: 'READY' }]);

    const res = await GET(makeRequest(), makeParams('asset-001')) as { status: number };
    expect(res.status).toBe(404);
  });

  // ─── Signed URL delivery ──────────────────────────────────────────────────

  it('returns 200 with url and expiresAt when asset is found and signed URL is generated', async () => {
    mockAuth.mockResolvedValue(makeSession());
    mockGetMembership.mockResolvedValue({ role: 'MEMBER' });
    makeDbChain([{ id: 'asset-001', file_key: 'higgsfield/org-001/asset-001/generation', status: 'READY' }]);
    mockGenerateSignedUrl.mockResolvedValue('https://signed.r2.example.com/asset?X-Amz-Signature=abc');

    const res = await GET(makeRequest(), makeParams('asset-001')) as unknown as { status: number; body: Record<string, unknown> };
    expect(res.status).toBe(200);

    const body = res.body;
    expect(typeof body.url).toBe('string');
    expect(typeof body.expiresAt).toBe('string');
  });

  it('passes the asset file_key to generateSignedUrl (object-specific)', async () => {
    const fileKey = 'higgsfield/org-001/asset-002/generation';
    mockAuth.mockResolvedValue(makeSession());
    mockGetMembership.mockResolvedValue({ role: 'MEMBER' });
    makeDbChain([{ id: 'asset-002', file_key: fileKey, status: 'READY' }]);
    mockGenerateSignedUrl.mockResolvedValue('https://signed-url');

    await GET(makeRequest(), makeParams('asset-002'));

    expect(mockGenerateSignedUrl).toHaveBeenCalledWith(fileKey, 3600);
  });

  it('returns the presigned URL in the body (not a Higgsfield CDN URL)', async () => {
    const presigned = 'https://drexonyx-assets.r2.cloudflarestorage.com/key?X-Amz-Signature=xyz';
    mockAuth.mockResolvedValue(makeSession());
    mockGetMembership.mockResolvedValue({ role: 'MEMBER' });
    makeDbChain([{ id: 'asset-001', file_key: 'key', status: 'READY' }]);
    mockGenerateSignedUrl.mockResolvedValue(presigned);

    const res = await GET(makeRequest(), makeParams('asset-001')) as unknown as { body: Record<string, unknown> };
    expect(res.body.url).toBe(presigned);
    expect((res.body.url as string)).not.toMatch(/higgsfield\.ai/);
  });

  it('expiresAt is an ISO string roughly 3600 seconds in the future', async () => {
    const before = Date.now();
    mockAuth.mockResolvedValue(makeSession());
    mockGetMembership.mockResolvedValue({ role: 'MEMBER' });
    makeDbChain([{ id: 'asset-001', file_key: 'key', status: 'READY' }]);
    mockGenerateSignedUrl.mockResolvedValue('https://signed-url');

    const res = await GET(makeRequest(), makeParams('asset-001')) as unknown as { body: Record<string, unknown> };
    const after = Date.now();

    const expiresAt = new Date(res.body.expiresAt as string).getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + 3600 * 1000 - 100);
    expect(expiresAt).toBeLessThanOrEqual(after + 3600 * 1000 + 100);
  });

  it('generateSignedUrl is called server-side — object-storage mock invoked, no direct credential usage', async () => {
    mockAuth.mockResolvedValue(makeSession());
    mockGetMembership.mockResolvedValue({ role: 'MEMBER' });
    makeDbChain([{ id: 'asset-001', file_key: 'key', status: 'READY' }]);
    mockGenerateSignedUrl.mockResolvedValue('https://signed-url');

    await GET(makeRequest(), makeParams('asset-001'));

    // Route delegates to object-storage module; it does not call AWS SDK directly.
    expect(mockGenerateSignedUrl).toHaveBeenCalledOnce();
  });

  // ─── Error handling ───────────────────────────────────────────────────────

  it('returns 500 when generateSignedUrl throws', async () => {
    mockAuth.mockResolvedValue(makeSession());
    mockGetMembership.mockResolvedValue({ role: 'MEMBER' });
    makeDbChain([{ id: 'asset-001', file_key: 'key', status: 'READY' }]);
    mockGenerateSignedUrl.mockRejectedValue(new Error('R2 unreachable'));

    const res = await GET(makeRequest(), makeParams('asset-001')) as { status: number };
    expect(res.status).toBe(500);
  });

  it('500 error body includes the error message', async () => {
    mockAuth.mockResolvedValue(makeSession());
    mockGetMembership.mockResolvedValue({ role: 'MEMBER' });
    makeDbChain([{ id: 'asset-001', file_key: 'key', status: 'READY' }]);
    mockGenerateSignedUrl.mockRejectedValue(new Error('R2 unreachable'));

    const res = await GET(makeRequest(), makeParams('asset-001')) as unknown as { status: number; body: Record<string, unknown> };
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error as string).toContain('R2 unreachable');
  });
});
