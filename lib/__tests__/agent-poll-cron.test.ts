// Tests for the Vercel Cron endpoint: GET /api/internal/poll-generations
// Covers: auth rejection, empty-batch short-circuit, done/still_running/error tallies,
// and idempotency (polling + webhook racing does not duplicate mutations — the CAS
// inside pollGenerationStatus already handles that; here we verify no extra selects
// or transactions are triggered when the batch is already empty).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSelect, mockPollGenerationStatus } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockPollGenerationStatus: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: { select: mockSelect },
}));

vi.mock('@/lib/agent/polling', () => ({
  pollGenerationStatus: mockPollGenerationStatus,
}));

// drizzle-orm helpers used in the route (and, eq, isNotNull) are only called to
// build the where clause; they don't run real SQL in tests so we can stub them.
vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => args,
  eq: (col: unknown, val: unknown) => ({ col, val }),
  isNotNull: (col: unknown) => ({ col }),
}));

vi.mock('@/db/schema/production', () => ({
  aiGenerations: {
    id: 'id',
    production_job_id: 'production_job_id',
    organization_id: 'organization_id',
    status: 'status',
    provider_job_id: 'provider_job_id',
  },
}));

import { type NextRequest } from 'next/server';
import { GET } from '../../app/api/internal/poll-generations/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCronRequest(authHeader?: string): NextRequest {
  return new Request('http://localhost/api/internal/poll-generations', {
    method: 'GET',
    headers: authHeader ? { authorization: authHeader } : {},
  }) as unknown as NextRequest;
}

function makeSelectChain(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit,
  };
}

const runningGens = [
  { id: 'gen1', production_job_id: 'job1', organization_id: 'org1' },
  { id: 'gen2', production_job_id: 'job2', organization_id: 'org1' },
];

// ─── Authentication ────────────────────────────────────────────────────────────

describe('GET /api/internal/poll-generations — authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 'test-cron-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 401 when no Authorization header is present', async () => {
    const res = await GET(makeCronRequest());
    expect(res.status).toBe(401);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header has wrong value', async () => {
    const res = await GET(makeCronRequest('Bearer wrong-secret'));
    expect(res.status).toBe(401);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns 401 when CRON_SECRET env var is not set', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const res = await GET(makeCronRequest('Bearer test-cron-secret'));
    expect(res.status).toBe(401);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('proceeds past auth with correct Bearer token', async () => {
    mockSelect.mockReturnValue(makeSelectChain([])); // empty batch → short-circuit
    const res = await GET(makeCronRequest('Bearer test-cron-secret'));
    expect(res.status).toBe(200);
  });
});

// ─── Empty batch ───────────────────────────────────────────────────────────────

describe('GET /api/internal/poll-generations — empty batch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 'secret');
  });

  afterEach(() => { vi.unstubAllEnvs(); });

  it('returns polled:0 when no RUNNING gens are found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const res = await GET(makeCronRequest('Bearer secret'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ polled: 0, done: 0, still_running: 0, errors: 0 });
    expect(mockPollGenerationStatus).not.toHaveBeenCalled();
  });
});

// ─── Outcome tallying ──────────────────────────────────────────────────────────

describe('GET /api/internal/poll-generations — outcome tallying', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 'secret');
  });

  afterEach(() => { vi.unstubAllEnvs(); });

  it('tallies done correctly when all gens are terminal', async () => {
    mockSelect.mockReturnValue(makeSelectChain(runningGens));
    mockPollGenerationStatus.mockResolvedValue({ ok: true, done: true });

    const res = await GET(makeCronRequest('Bearer secret'));
    const body = await res.json();
    expect(body.polled).toBe(2);
    expect(body.done).toBe(2);
    expect(body.still_running).toBe(0);
    expect(body.errors).toBe(0);
  });

  it('tallies still_running correctly when all gens are still in-progress', async () => {
    mockSelect.mockReturnValue(makeSelectChain(runningGens));
    mockPollGenerationStatus.mockResolvedValue({ ok: true, done: false });

    const res = await GET(makeCronRequest('Bearer secret'));
    const body = await res.json();
    expect(body.polled).toBe(2);
    expect(body.done).toBe(0);
    expect(body.still_running).toBe(2);
    expect(body.errors).toBe(0);
  });

  it('tallies errors correctly when pollGenerationStatus returns ok:false', async () => {
    mockSelect.mockReturnValue(makeSelectChain(runningGens));
    mockPollGenerationStatus.mockResolvedValue({ ok: false, error: 'Provider error' });

    const res = await GET(makeCronRequest('Bearer secret'));
    const body = await res.json();
    expect(body.polled).toBe(2);
    expect(body.errors).toBe(2);
    expect(body.done).toBe(0);
    expect(body.still_running).toBe(0);
  });

  it('tallies errors correctly when pollGenerationStatus throws', async () => {
    mockSelect.mockReturnValue(makeSelectChain(runningGens));
    mockPollGenerationStatus.mockRejectedValue(new Error('Unexpected crash'));

    const res = await GET(makeCronRequest('Bearer secret'));
    const body = await res.json();
    expect(body.polled).toBe(2);
    expect(body.errors).toBe(2);
  });

  it('tallies mixed outcomes correctly', async () => {
    const threeGens = [
      { id: 'gen1', production_job_id: 'job1', organization_id: 'org1' },
      { id: 'gen2', production_job_id: 'job2', organization_id: 'org1' },
      { id: 'gen3', production_job_id: 'job3', organization_id: 'org1' },
    ];
    mockSelect.mockReturnValue(makeSelectChain(threeGens));
    mockPollGenerationStatus
      .mockResolvedValueOnce({ ok: true, done: true })    // gen1 done
      .mockResolvedValueOnce({ ok: true, done: false })   // gen2 still running
      .mockResolvedValueOnce({ ok: false, error: 'err' }); // gen3 error

    const res = await GET(makeCronRequest('Bearer secret'));
    const body = await res.json();
    expect(body.polled).toBe(3);
    expect(body.done).toBe(1);
    expect(body.still_running).toBe(1);
    expect(body.errors).toBe(1);
  });

  it('calls pollGenerationStatus with correct parameters for each gen', async () => {
    mockSelect.mockReturnValue(makeSelectChain(runningGens));
    mockPollGenerationStatus.mockResolvedValue({ ok: true, done: true });

    await GET(makeCronRequest('Bearer secret'));

    expect(mockPollGenerationStatus).toHaveBeenCalledTimes(2);
    expect(mockPollGenerationStatus).toHaveBeenCalledWith({
      aiGenerationId: 'gen1',
      productionJobId: 'job1',
      organizationId: 'org1',
    });
    expect(mockPollGenerationStatus).toHaveBeenCalledWith({
      aiGenerationId: 'gen2',
      productionJobId: 'job2',
      organizationId: 'org1',
    });
  });
});

// ─── Idempotency: polling + webhook race ──────────────────────────────────────
// The CAS inside pollGenerationStatus prevents duplicate state transitions.
// Here we verify that when a generation is already terminal (already completed
// by the webhook before cron runs), the cron does not trigger an extra
// DB transaction — it just tallies the outcome as "done" or "error" based on
// what pollGenerationStatus returns.

describe('GET /api/internal/poll-generations — polling + webhook race (idempotency)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 'secret');
  });

  afterEach(() => { vi.unstubAllEnvs(); });

  it('handles race gracefully when pollGenerationStatus reports already-terminal (ok:true, done:true)', async () => {
    // Simulates: webhook completed gen1 first; cron picks it up but pollGenerationStatus
    // detects it is already SUCCEEDED and returns done:true without re-transitioning.
    mockSelect.mockReturnValue(makeSelectChain([runningGens[0]]));
    mockPollGenerationStatus.mockResolvedValue({ ok: true, done: true });

    const res = await GET(makeCronRequest('Bearer secret'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.polled).toBe(1);
    expect(body.done).toBe(1);
    expect(body.errors).toBe(0);
    // pollGenerationStatus was called exactly once — no double-dispatch
    expect(mockPollGenerationStatus).toHaveBeenCalledTimes(1);
  });
});
