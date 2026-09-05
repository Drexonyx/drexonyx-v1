import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockInsert, mockUpdate, mockAuth, mockValidateServiceToken, mockSkillExecute } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockAuth: vi.fn(),
  mockValidateServiceToken: vi.fn(),
  mockSkillExecute: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: { insert: mockInsert, update: mockUpdate },
}));

vi.mock('@/auth', () => ({ auth: mockAuth }));

vi.mock('@/lib/agent/service-tokens', () => ({
  validateServiceToken: mockValidateServiceToken,
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'output-id-test' }));

vi.mock('@/lib/skills/registry', () => ({
  SKILL_REGISTRY: {
    'brief.analyze': {
      id: 'brief.analyze',
      version: '1.0.0',
      family: 'BRIEF',
      execute: mockSkillExecute,
    },
    'utility.prompt.optimize': {
      id: 'utility.prompt.optimize',
      version: '1.0.0',
      family: 'UTILITY',
      execute: mockSkillExecute,
    },
    'qc.asset.metadata': {
      id: 'qc.asset.metadata',
      version: '1.0.0',
      family: 'QC',
      execute: mockSkillExecute,
    },
  },
}));

import { POST } from '../../app/api/skills/[skillId]/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInsertChain() {
  return { values: vi.fn().mockResolvedValue([]) };
}

function makeUpdateChain() {
  return { set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) };
}

function makeRequest(skillId: string, body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost/api/skills/${skillId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function makeParams(skillId: string) {
  return { params: Promise.resolve({ skillId }) };
}

// ─── Human path ───────────────────────────────────────────────────────────────

describe('POST /api/skills/[skillId] — human path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue(makeInsertChain());
    mockUpdate.mockReturnValue(makeUpdateChain());
  });

  it('returns 401 when no session and no bearer token', async () => {
    mockAuth.mockResolvedValue(null);
    const req = makeRequest('brief.analyze', { entityType: 'BRIEF', entityId: 'eid', input: {} });
    const res = await POST(req, makeParams('brief.analyze'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for CLIENT role (DR 0075)', async () => {
    mockAuth.mockResolvedValue({ user: { userId: 'u1', organizationId: 'org1', role: 'CLIENT' } });
    const req = makeRequest('brief.analyze', { entityType: 'BRIEF', entityId: 'eid', input: {} });
    const res = await POST(req, makeParams('brief.analyze'));
    expect(res.status).toBe(403);
  });

  it('returns 403 when human role not authorized for skill', async () => {
    mockAuth.mockResolvedValue({ user: { userId: 'u1', organizationId: 'org1', role: 'QC' } });
    // QC is not in HUMAN_SKILL_AUTHORITY for brief.analyze
    const req = makeRequest('brief.analyze', { entityType: 'BRIEF', entityId: 'eid', input: {} });
    const res = await POST(req, makeParams('brief.analyze'));
    expect(res.status).toBe(403);
  });

  it('returns 403 for unknown skill (not in RBAC authority, checked before registry)', async () => {
    mockAuth.mockResolvedValue({ user: { userId: 'u1', organizationId: 'org1', role: 'OWNER' } });
    const req = makeRequest('nonexistent.skill', { entityType: 'BRIEF', entityId: 'eid', input: {} });
    const res = await POST(req, makeParams('nonexistent.skill'));
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid JSON body', async () => {
    mockAuth.mockResolvedValue({ user: { userId: 'u1', organizationId: 'org1', role: 'OWNER' } });
    const req = new NextRequest('http://localhost/api/skills/brief.analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await POST(req, makeParams('brief.analyze'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when required body fields are missing', async () => {
    mockAuth.mockResolvedValue({ user: { userId: 'u1', organizationId: 'org1', role: 'OWNER' } });
    const req = makeRequest('brief.analyze', { entityType: 'BRIEF' }); // missing entityId and input
    const res = await POST(req, makeParams('brief.analyze'));
    expect(res.status).toBe(400);
  });

  it('returns 200 with SUCCEEDED on success', async () => {
    mockAuth.mockResolvedValue({ user: { userId: 'u1', organizationId: 'org1', role: 'OWNER' } });
    mockSkillExecute.mockResolvedValue({ ok: true, output: { summary: 'test' } });

    const req = makeRequest('brief.analyze', { entityType: 'BRIEF', entityId: 'eid', input: { briefText: 'hello' } });
    const res = await POST(req, makeParams('brief.analyze'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('SUCCEEDED');
    expect(body.outputId).toBe('output-id-test');
    expect(body.output).toEqual({ summary: 'test' });
  });

  it('returns 422 with FAILED on non-transient skill error', async () => {
    mockAuth.mockResolvedValue({ user: { userId: 'u1', organizationId: 'org1', role: 'OWNER' } });
    mockSkillExecute.mockResolvedValue({ ok: false, error: 'parse failed', isTransient: false });

    const req = makeRequest('brief.analyze', { entityType: 'BRIEF', entityId: 'eid', input: {} });
    const res = await POST(req, makeParams('brief.analyze'));
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.status).toBe('FAILED');
  });

  it('returns 503 with FAILED on transient skill error', async () => {
    mockAuth.mockResolvedValue({ user: { userId: 'u1', organizationId: 'org1', role: 'OWNER' } });
    mockSkillExecute.mockResolvedValue({ ok: false, error: 'overloaded', isTransient: true });

    const req = makeRequest('brief.analyze', { entityType: 'BRIEF', entityId: 'eid', input: {} });
    const res = await POST(req, makeParams('brief.analyze'));

    expect(res.status).toBe(503);
  });

  it('organizationId always comes from JWT session, not body (tenant isolation)', async () => {
    mockAuth.mockResolvedValue({ user: { userId: 'u1', organizationId: 'org-session', role: 'OWNER' } });
    mockSkillExecute.mockResolvedValue({ ok: true, output: {} });

    const req = makeRequest('brief.analyze', {
      organizationId: 'org-attacker',
      entityType: 'BRIEF',
      entityId: 'eid',
      input: {},
    });
    await POST(req, makeParams('brief.analyze'));

    // The skill execute was called with context from session, not body
    expect(mockSkillExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ organizationId: 'org-session' }),
    );
  });
});

// ─── Agent path ───────────────────────────────────────────────────────────────

describe('POST /api/skills/[skillId] — agent path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue(makeInsertChain());
    mockUpdate.mockReturnValue(makeUpdateChain());
  });

  it('returns 401 when bearer token is invalid', async () => {
    mockValidateServiceToken.mockResolvedValue({ ok: false, reason: 'Token not found' });
    const req = makeRequest(
      'utility.prompt.optimize',
      { organizationId: 'org1', productionJobId: 'job1', entityType: 'ASSET', entityId: 'eid', input: {} },
      { authorization: 'Bearer badtoken' },
    );
    const res = await POST(req, makeParams('utility.prompt.optimize'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for agent requesting a non-allowlisted skill (DR 0075)', async () => {
    mockValidateServiceToken.mockResolvedValue({ ok: true, organizationId: 'org1', productionJobId: 'job1' });
    const req = makeRequest(
      'brief.analyze',
      { organizationId: 'org1', productionJobId: 'job1', entityType: 'BRIEF', entityId: 'eid', input: {} },
      { authorization: 'Bearer validtoken' },
    );
    const res = await POST(req, makeParams('brief.analyze'));
    expect(res.status).toBe(403);
  });

  it('returns 200 with SUCCEEDED for agent calling allowlisted skill', async () => {
    mockValidateServiceToken.mockResolvedValue({ ok: true, organizationId: 'org1', productionJobId: 'job1' });
    mockSkillExecute.mockResolvedValue({ ok: true, output: { optimizedPrompt: 'better', changes: [], rationale: 'ok' } });

    const req = makeRequest(
      'utility.prompt.optimize',
      { organizationId: 'org1', productionJobId: 'job1', entityType: 'ASSET', entityId: 'eid', input: { originalPrompt: 'x' } },
      { authorization: 'Bearer validtoken' },
    );
    const res = await POST(req, makeParams('utility.prompt.optimize'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('SUCCEEDED');
  });

  it('requires organizationId in agent body (not from session)', async () => {
    mockValidateServiceToken.mockResolvedValue({ ok: false, reason: 'scoped' });
    const req = makeRequest(
      'utility.prompt.optimize',
      { productionJobId: 'job1', entityType: 'ASSET', entityId: 'eid', input: {} }, // no organizationId
      { authorization: 'Bearer token' },
    );
    const res = await POST(req, makeParams('utility.prompt.optimize'));
    expect(res.status).toBe(400);
  });

  it('passes organizationId and productionJobId to validateServiceToken for scope enforcement', async () => {
    mockValidateServiceToken.mockResolvedValue({ ok: true, organizationId: 'org1', productionJobId: 'job1' });
    mockSkillExecute.mockResolvedValue({ ok: true, output: {} });

    const req = makeRequest(
      'utility.prompt.optimize',
      { organizationId: 'org1', productionJobId: 'job1', entityType: 'ASSET', entityId: 'eid', input: {} },
      { authorization: 'Bearer mytoken' },
    );
    await POST(req, makeParams('utility.prompt.optimize'));

    expect(mockValidateServiceToken).toHaveBeenCalledWith({
      rawToken: 'mytoken',
      expectedOrganizationId: 'org1',
      expectedProductionJobId: 'job1',
    });
  });
});
