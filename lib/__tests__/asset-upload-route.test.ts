import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockAuth, mockSelect, mockUpdate, mockInsert, mockPutObject, mockUuidv7 } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockInsert: vi.fn(),
  mockPutObject: vi.fn(),
  mockUuidv7: vi.fn(() => 'audit-uuid'),
}));

vi.mock('@/auth', () => ({ auth: mockAuth }));

vi.mock('@/db/index', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  },
}));

vi.mock('@/lib/infrastructure/object-storage', () => ({
  putObject: mockPutObject,
}));

vi.mock('uuidv7', () => ({ uuidv7: mockUuidv7 }));

// drizzle-orm operators — return their argument so WHERE clauses compose.
vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => args,
  eq: (col: unknown, val: unknown) => ({ col, val }),
}));

vi.mock('@/lib/admin/types', () => ({
  isAdminRole: (role: string) => ['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION', 'QC'].includes(role),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSelectChain(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from };
}

function makeUpdateChain() {
  const where = vi.fn().mockResolvedValue([]);
  const set = vi.fn().mockReturnValue({ where });
  return { set };
}

function makeInsertChain() {
  const values = vi.fn().mockResolvedValue([]);
  return { values };
}

function makeSession(role: string, organizationId = 'org1', userId = 'user1') {
  return { user: { id: userId, role, organizationId } };
}

// Build a mock NextRequest whose formData() resolves to controlled data.
// In jsdom, passing FormData as a body to NextRequest does not reliably set
// the multipart Content-Type with a boundary, causing request.formData() to throw.
// Using a mock object avoids that environment limitation while still exercising
// the full route logic (auth, DB, putObject, audit).
function makeRequest(file?: File | null): NextRequest {
  const fd = new FormData();
  if (file !== null) {
    fd.append('file', file ?? new File(['hello'], 'test.jpg', { type: 'image/jpeg' }));
  }
  return {
    formData: vi.fn().mockResolvedValue(fd),
  } as unknown as NextRequest;
}

async function callRoute(req: NextRequest, assetId = 'asset1') {
  const { POST } = await import('@/app/api/assets/[assetId]/upload/route');
  return POST(req, { params: Promise.resolve({ assetId }) });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/assets/[assetId]/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPutObject.mockResolvedValue(undefined);
    mockUpdate.mockReturnValue(makeUpdateChain());
    mockInsert.mockReturnValue(makeInsertChain());
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await callRoute(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 401 for non-admin role', async () => {
    mockAuth.mockResolvedValue(makeSession('CLIENT'));
    const res = await callRoute(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 403 for QC role (upload not allowed)', async () => {
    mockAuth.mockResolvedValue(makeSession('QC'));
    const res = await callRoute(makeRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/authority/i);
  });

  it('returns 200 for OWNER role', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'UPLOADED' }]));
    const res = await callRoute(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.fileKey).toContain('org1/asset1/');
  });

  it('returns 200 for ADMIN_OPERATIONS role', async () => {
    mockAuth.mockResolvedValue(makeSession('ADMIN_OPERATIONS'));
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'UPLOADED' }]));
    const res = await callRoute(makeRequest());
    expect(res.status).toBe(200);
  });

  it('returns 200 for CREATIVE_PRODUCTION role', async () => {
    mockAuth.mockResolvedValue(makeSession('CREATIVE_PRODUCTION'));
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'UPLOADED' }]));
    const res = await callRoute(makeRequest());
    expect(res.status).toBe(200);
  });

  it('returns 404 when asset not found (cross-tenant isolation)', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));
    mockSelect.mockReturnValue(makeSelectChain([]));
    const res = await callRoute(makeRequest());
    expect(res.status).toBe(404);
  });

  it('returns 409 when asset status is not UPLOADED', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'READY_FOR_QC' }]));
    const res = await callRoute(makeRequest());
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain('UPLOADED');
  });

  it('returns 415 for non-image/non-video MIME type', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'UPLOADED' }]));
    const badFile = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
    const res = await callRoute(makeRequest(badFile));
    expect(res.status).toBe(415);
    expect(mockPutObject).not.toHaveBeenCalled();
  });

  it('accepts image/* MIME types', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'UPLOADED' }]));
    const imgFile = new File(['data'], 'photo.png', { type: 'image/png' });
    const res = await callRoute(makeRequest(imgFile));
    expect(res.status).toBe(200);
  });

  it('accepts video/* MIME types', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'UPLOADED' }]));
    const vidFile = new File(['data'], 'clip.mp4', { type: 'video/mp4' });
    const res = await callRoute(makeRequest(vidFile));
    expect(res.status).toBe(200);
  });

  it('returns 413 for oversized file', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'UPLOADED' }]));

    class LargeFile extends File {
      get size() { return 100 * 1024 * 1024 + 1; }
    }
    const bigFile = new LargeFile(['data'], 'big.jpg', { type: 'image/jpeg' });
    const res = await callRoute(makeRequest(bigFile));
    expect(res.status).toBe(413);
    expect(mockPutObject).not.toHaveBeenCalled();
  });

  it('strips path traversal from filename', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'UPLOADED' }]));
    const dangerousFile = new File(['data'], '../../../etc/passwd', { type: 'image/jpeg' });
    const res = await callRoute(makeRequest(dangerousFile));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fileKey).not.toContain('..');
    expect(body.fileKey).not.toContain('/etc/');
  });

  it('returns 400 when file field is missing', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'UPLOADED' }]));
    // Build a request with no file field (null sentinel skips append)
    const res = await callRoute(makeRequest(null));
    expect(res.status).toBe(400);
  });

  it('calls putObject with org-namespaced key', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER', 'org-abc'));
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset-xyz', status: 'UPLOADED' }]));
    const file = new File(['data'], 'asset.jpg', { type: 'image/jpeg' });
    await callRoute(makeRequest(file), 'asset-xyz');
    expect(mockPutObject).toHaveBeenCalledWith(
      expect.objectContaining({ key: expect.stringMatching(/^org-abc\/asset-xyz\//) }),
    );
  });

  it('does NOT update asset status (stays UPLOADED)', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'UPLOADED' }]));
    const updateSetSpy = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    mockUpdate.mockReturnValue({ set: updateSetSpy });

    await callRoute(makeRequest());

    expect(updateSetSpy).toHaveBeenCalledWith(
      expect.not.objectContaining({ status: expect.anything() }),
    );
  });

  it('DB update sets file_key, file_type, and file_size', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'UPLOADED' }]));
    const updateSetSpy = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    mockUpdate.mockReturnValue({ set: updateSetSpy });

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    await callRoute(makeRequest(file));

    expect(updateSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        file_key: expect.any(String),
        file_type: 'image/jpeg',
        file_size: expect.anything(),
        updated_at: expect.any(Date),
      }),
    );
  });

  it('creates audit event with ASSET_FILE_UPLOADED action', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'UPLOADED' }]));
    const insertValuesSpy = vi.fn().mockResolvedValue([]);
    mockInsert.mockReturnValue({ values: insertValuesSpy });

    await callRoute(makeRequest());

    expect(insertValuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ASSET_FILE_UPLOADED' }),
    );
  });

  it('returns 500 and does not update DB if putObject fails', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'asset1', status: 'UPLOADED' }]));
    mockPutObject.mockRejectedValue(new Error('R2 unavailable'));

    const res = await callRoute(makeRequest());
    expect(res.status).toBe(500);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
