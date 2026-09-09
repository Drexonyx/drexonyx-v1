import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockInsert, mockUpdate, mockAuth, mockSkillExecute, capturedInserts, capturedUpdates } = vi.hoisted(() => {
  const capturedInserts: unknown[] = [];
  const capturedUpdates: Array<{ set: unknown }> = [];

  return {
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
    mockAuth: vi.fn(),
    mockSkillExecute: vi.fn(),
    capturedInserts,
    capturedUpdates,
  };
});

vi.mock('@/db/index', () => ({
  db: { insert: mockInsert, update: mockUpdate },
}));

vi.mock('@/auth', () => ({ auth: mockAuth }));

vi.mock('@/lib/agent/service-tokens', () => ({
  validateServiceToken: vi.fn().mockResolvedValue({ ok: false, reason: 'unused' }),
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'lifecycle-test-id' }));

vi.mock('@/lib/skills/registry', () => ({
  SKILL_REGISTRY: {
    'brief.analyze': {
      id: 'brief.analyze',
      version: '1.0.0',
      family: 'BRIEF',
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

function makeRequest(skillId: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/skills/${skillId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeParams(skillId: string) {
  return { params: Promise.resolve({ skillId }) };
}

// ─── Lifecycle tests ──────────────────────────────────────────────────────────

describe('skill output lifecycle — PENDING → RUNNING → SUCCEEDED', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedInserts.length = 0;
    capturedUpdates.length = 0;

    mockAuth.mockResolvedValue({ user: { userId: 'u1', organizationId: 'org1', role: 'OWNER' } });

    mockInsert.mockImplementation(() => ({
      values: vi.fn().mockImplementation((v) => {
        capturedInserts.push(v);
        return Promise.resolve([]);
      }),
    }));

    mockUpdate.mockImplementation(() => ({
      set: vi.fn().mockImplementation((s) => {
        capturedUpdates.push({ set: s });
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    }));
  });

  it('creates a PENDING record on invocation', async () => {
    mockSkillExecute.mockResolvedValue({ ok: true, output: {} });
    const req = makeRequest('brief.analyze', { entityType: 'BRIEF', entityId: 'eid', input: {} });
    await POST(req, makeParams('brief.analyze'));

    expect(capturedInserts.length).toBeGreaterThanOrEqual(1);
    const firstInsert = capturedInserts[0] as Record<string, unknown>;
    expect(firstInsert.status).toBe('PENDING');
  });

  it('transitions to RUNNING before execute() is called', async () => {
    let runningSeenBeforeExecute = false;
    mockSkillExecute.mockImplementation(() => {
      // At this point updates should include RUNNING
      const runningUpdate = capturedUpdates.find(
        (u) => (u.set as Record<string, unknown>).status === 'RUNNING',
      );
      runningSeenBeforeExecute = !!runningUpdate;
      return Promise.resolve({ ok: true, output: {} });
    });

    const req = makeRequest('brief.analyze', { entityType: 'BRIEF', entityId: 'eid', input: {} });
    await POST(req, makeParams('brief.analyze'));

    expect(runningSeenBeforeExecute).toBe(true);
  });

  it('transitions to SUCCEEDED with output on success', async () => {
    const outputData = { summary: 'done', keyRequirements: [] };
    mockSkillExecute.mockResolvedValue({ ok: true, output: outputData });

    const req = makeRequest('brief.analyze', { entityType: 'BRIEF', entityId: 'eid', input: {} });
    await POST(req, makeParams('brief.analyze'));

    const succeededUpdate = capturedUpdates.find(
      (u) => (u.set as Record<string, unknown>).status === 'SUCCEEDED',
    );
    expect(succeededUpdate).toBeDefined();
    expect((succeededUpdate!.set as Record<string, unknown>).output).toEqual(outputData);
  });

  it('transitions to FAILED with error on failure', async () => {
    mockSkillExecute.mockResolvedValue({ ok: false, error: 'AI failed', isTransient: false });

    const req = makeRequest('brief.analyze', { entityType: 'BRIEF', entityId: 'eid', input: {} });
    await POST(req, makeParams('brief.analyze'));

    const failedUpdate = capturedUpdates.find(
      (u) => (u.set as Record<string, unknown>).status === 'FAILED',
    );
    expect(failedUpdate).toBeDefined();
    expect((failedUpdate!.set as Record<string, unknown>).error).toBe('AI failed');
  });

  it('records skill_id, skill_version, actor metadata in PENDING record', async () => {
    mockSkillExecute.mockResolvedValue({ ok: true, output: {} });
    const req = makeRequest('brief.analyze', { entityType: 'BRIEF', entityId: 'eid', input: {} });
    await POST(req, makeParams('brief.analyze'));

    const insert = capturedInserts[0] as Record<string, unknown>;
    expect(insert.skill_id).toBe('brief.analyze');
    expect(insert.skill_version).toBe('1.0.0');
    expect(insert.actor_type).toBe('USER');
    expect(insert.actor_role).toBe('OWNER');
    expect(insert.organization_id).toBe('org1');
  });
});

// DR 0089/0090: skill invocation writes ONLY to skill_outputs — never to qc_reviews.
// Human createQcReview is the sole authoritative path for qc_reviews.
describe('skill output lifecycle — QC skill writes only to skill_outputs (DR 0089/0090)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedInserts.length = 0;

    mockAuth.mockResolvedValue({ user: { userId: 'u1', organizationId: 'org1', role: 'OWNER' } });

    mockInsert.mockImplementation(() => ({
      values: vi.fn().mockImplementation((v) => {
        capturedInserts.push(v);
        return Promise.resolve([]);
      }),
    }));

    mockUpdate.mockImplementation(() => ({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    }));
  });

  it('QC skill on ASSET entity writes only skill_outputs — does NOT write to qc_reviews', async () => {
    mockSkillExecute.mockResolvedValue({
      ok: true,
      output: { verdict: 'PASS', issues: [], completeness: 95, recommendations: [] },
    });

    const req = makeRequest('qc.asset.metadata', { entityType: 'ASSET', entityId: 'asset-id', input: { assetName: 'x', assetType: 'VIDEO' } });
    await POST(req, makeParams('qc.asset.metadata'));

    // Exactly one insert: skill_outputs PENDING record only — no qc_reviews insert
    expect(capturedInserts.length).toBe(1);
    const skillOutputInsert = capturedInserts[0] as Record<string, unknown>;
    expect(skillOutputInsert.skill_id).toBe('qc.asset.metadata');
    expect(skillOutputInsert.status).toBe('PENDING');
  });

  it('does NOT write to qc_reviews when entityType is not ASSET', async () => {
    mockSkillExecute.mockResolvedValue({
      ok: true,
      output: { verdict: 'PASS', issues: [], completeness: 90, recommendations: [] },
    });

    const req = makeRequest('qc.asset.metadata', { entityType: 'BRIEF', entityId: 'brief-id', input: { assetName: 'x', assetType: 'VIDEO' } });
    await POST(req, makeParams('qc.asset.metadata'));

    // Only one insert: skill_outputs (PENDING), no qc_reviews
    expect(capturedInserts.length).toBe(1);
  });
});
