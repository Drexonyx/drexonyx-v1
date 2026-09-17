import { describe, it, expect, vi, beforeEach } from 'vitest';

// Tests task-scoped token lifecycle: create, verify, revoke.

const { mockSelect, mockInsert, mockUpdate } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('@/db/index', () => ({ db: { select: mockSelect, insert: mockInsert, update: mockUpdate } }));
vi.mock('uuidv7', () => ({ uuidv7: () => 'token-uuid' }));

// Provide AUTH_SECRET for HMAC operations
vi.stubEnv('AUTH_SECRET', 'test-secret-for-tokens');

import { createTaskToken, verifyTaskToken, revokeTaskToken } from '../tokens';

function sel(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
}
function upd() {
  return { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
}
function ins() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}

describe('task token — create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a token id and raw token on success', async () => {
    mockInsert.mockReturnValue(ins());
    const result = await createTaskToken({ taskId: 'task-1', organizationId: 'org-1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tokenId).toBe('token-uuid');
    expect(typeof result.rawToken).toBe('string');
    expect(result.rawToken.length).toBeGreaterThan(0);
    expect(result.expiresAt).toBeInstanceOf(Date);
  });
});

describe('task token — verify', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects when token not found', async () => {
    mockSelect.mockReturnValue(sel([]));
    const result = await verifyTaskToken({ tokenId: 'x', rawToken: 'y', organizationId: 'org-1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not found or expired/);
  });

  it('rejects revoked tokens', async () => {
    mockSelect.mockReturnValue(
      sel([{
        id: 'token-uuid',
        agent_task_id: 'task-1',
        organization_id: 'org-1',
        token_hash: 'any',
        expires_at: new Date(Date.now() + 3600000),
        revoked_at: new Date(),
      }]),
    );
    const result = await verifyTaskToken({ tokenId: 'token-uuid', rawToken: 'raw', organizationId: 'org-1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/revoked/);
  });

  it('rejects invalid raw token (wrong hash)', async () => {
    const { createHmac } = await import('crypto');
    const correctHash = createHmac('sha256', 'test-secret-for-tokens').update('correct-raw').digest('hex');

    mockSelect.mockReturnValue(
      sel([{
        id: 'token-uuid',
        agent_task_id: 'task-1',
        organization_id: 'org-1',
        token_hash: correctHash,
        expires_at: new Date(Date.now() + 3600000),
        revoked_at: null,
      }]),
    );
    const result = await verifyTaskToken({ tokenId: 'token-uuid', rawToken: 'wrong-raw', organizationId: 'org-1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Invalid token/);
  });

  it('accepts a valid token with matching hash', async () => {
    const { createHmac } = await import('crypto');
    const rawToken = 'valid-raw-token-value';
    const correctHash = createHmac('sha256', 'test-secret-for-tokens').update(rawToken).digest('hex');

    mockSelect.mockReturnValue(
      sel([{
        id: 'token-uuid',
        agent_task_id: 'task-1',
        organization_id: 'org-1',
        token_hash: correctHash,
        expires_at: new Date(Date.now() + 3600000),
        revoked_at: null,
      }]),
    );
    const result = await verifyTaskToken({ tokenId: 'token-uuid', rawToken, organizationId: 'org-1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.taskId).toBe('task-1');
  });
});

describe('task token — revoke', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls db.update to set revoked_at', async () => {
    mockUpdate.mockReturnValue(upd());
    await revokeTaskToken({ tokenId: 'token-uuid', organizationId: 'org-1' });
    expect(mockUpdate).toHaveBeenCalledOnce();
  });
});
