import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockUpdate } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate },
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-uuid' }));

// Mock crypto with deterministic values for testing
vi.mock('crypto', async (importOriginal) => {
  const real = await importOriginal<typeof import('crypto')>();
  return {
    ...real,
    randomBytes: vi.fn(() => Buffer.from('a'.repeat(32), 'utf8')),
    createHash: real.createHash,
    timingSafeEqual: real.timingSafeEqual,
  };
});

import { createHash } from 'node:crypto';
import { issueServiceToken, validateServiceToken, revokeServiceTokensForJob } from '../agent/service-tokens';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const end = vi.fn().mockResolvedValue(result);
  return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: end };
}

function makeInsertChain() {
  return { values: vi.fn().mockResolvedValue([]) };
}

function makeUpdateChain() {
  return { set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) };
}

// ─── issueServiceToken ────────────────────────────────────────────────────────

describe('issueServiceToken', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts token record and returns rawToken + tokenId', async () => {
    mockInsert.mockReturnValue(makeInsertChain());

    const result = await issueServiceToken({ organizationId: 'org1', productionJobId: 'job1' });

    expect(result).toMatchObject({ ok: true, tokenId: 'test-uuid' });
    expect(result.ok && result.rawToken).toBeTruthy();
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it('never stores the raw token — only the hash', async () => {
    const insertedValues: unknown[] = [];
    mockInsert.mockImplementation(() => ({
      values: vi.fn().mockImplementation((v) => { insertedValues.push(v); return Promise.resolve([]); }),
    }));

    const result = await issueServiceToken({ organizationId: 'org1', productionJobId: 'job1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // The raw token must NOT appear in any inserted value
    const insertedJson = JSON.stringify(insertedValues);
    expect(insertedJson).not.toContain(result.rawToken);
    // But token_hash must be present
    expect(insertedJson).toContain('token_hash');
  });
});

// ─── validateServiceToken ─────────────────────────────────────────────────────

describe('validateServiceToken', () => {
  const validToken = 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE'; // base64url of 'a'*32

  function getHashedToken(raw: string): string {
    return createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  const tokenHash = getHashedToken(validToken);

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false when token not found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const result = await validateServiceToken({
      rawToken: 'notavalidtoken',
      expectedOrganizationId: 'org1',
      expectedProductionJobId: 'job1',
    });
    expect(result).toMatchObject({ ok: false, reason: 'Token not found' });
  });

  it('returns ok:false for revoked token (security scenario)', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{
      token_hash: tokenHash,
      organization_id: 'org1',
      production_job_id: 'job1',
      expires_at: new Date(Date.now() + 3_600_000),
      revoked_at: new Date(), // revoked
    }]));

    const result = await validateServiceToken({
      rawToken: validToken,
      expectedOrganizationId: 'org1',
      expectedProductionJobId: 'job1',
    });
    expect(result).toMatchObject({ ok: false, reason: 'Token revoked' });
  });

  it('returns ok:false for expired token (security scenario)', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{
      token_hash: tokenHash,
      organization_id: 'org1',
      production_job_id: 'job1',
      expires_at: new Date(Date.now() - 1000), // expired
      revoked_at: null,
    }]));

    const result = await validateServiceToken({
      rawToken: validToken,
      expectedOrganizationId: 'org1',
      expectedProductionJobId: 'job1',
    });
    expect(result).toMatchObject({ ok: false, reason: 'Token expired' });
  });

  it('returns ok:false for wrong organization_id (cross-tenant security scenario)', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{
      token_hash: tokenHash,
      organization_id: 'org-actual',
      production_job_id: 'job1',
      expires_at: new Date(Date.now() + 3_600_000),
      revoked_at: null,
    }]));

    const result = await validateServiceToken({
      rawToken: validToken,
      expectedOrganizationId: 'org-attacker', // different org
      expectedProductionJobId: 'job1',
    });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('organization_id') });
  });

  it('returns ok:false for wrong production_job_id (privilege escalation scenario)', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{
      token_hash: tokenHash,
      organization_id: 'org1',
      production_job_id: 'job-actual',
      expires_at: new Date(Date.now() + 3_600_000),
      revoked_at: null,
    }]));

    const result = await validateServiceToken({
      rawToken: validToken,
      expectedOrganizationId: 'org1',
      expectedProductionJobId: 'job-other', // different job
    });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('production_job_id') });
  });

  it('returns ok:true for valid, unrevoked, unexpired, scope-matched token', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{
      token_hash: tokenHash,
      organization_id: 'org1',
      production_job_id: 'job1',
      expires_at: new Date(Date.now() + 3_600_000),
      revoked_at: null,
    }]));

    const result = await validateServiceToken({
      rawToken: validToken,
      expectedOrganizationId: 'org1',
      expectedProductionJobId: 'job1',
    });
    expect(result).toMatchObject({ ok: true, organizationId: 'org1', productionJobId: 'job1' });
  });
});

// ─── revokeServiceTokensForJob ────────────────────────────────────────────────

describe('revokeServiceTokensForJob', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates revoked_at for all active tokens of the job', async () => {
    mockUpdate.mockReturnValue(makeUpdateChain());

    const result = await revokeServiceTokensForJob({ productionJobId: 'job1', organizationId: 'org1' });
    expect(result).toMatchObject({ ok: true });
    expect(mockUpdate).toHaveBeenCalledOnce();
  });
});
