import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockSelect,
  mockPollJobStatus,
  mockMaterializeGenerationAsset,
  mockAttemptProductionJobCompletion,
  mockFailProductionJob,
  mockRunAutomatedQcAndPipeline,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockPollJobStatus: vi.fn(),
  mockMaterializeGenerationAsset: vi.fn(),
  mockAttemptProductionJobCompletion: vi.fn(),
  mockFailProductionJob: vi.fn(),
  mockRunAutomatedQcAndPipeline: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: { select: mockSelect },
}));

vi.mock('@/lib/agent/providers/higgsfield', () => ({
  higgsFieldProvider: {
    name: 'higgsfield',
    pollJobStatus: mockPollJobStatus,
  },
}));

vi.mock('@/lib/agent/materialization', () => ({
  materializeGenerationAsset: mockMaterializeGenerationAsset,
}));

vi.mock('@/lib/agent/terminal', () => ({
  attemptProductionJobCompletion: mockAttemptProductionJobCompletion,
  failProductionJob: mockFailProductionJob,
}));

vi.mock('@/lib/admin/automated-pipeline', () => ({
  runAutomatedQcAndPipeline: mockRunAutomatedQcAndPipeline,
}));

import { pollGenerationStatus, boundedPollUntilTerminal } from '../agent/polling';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const end = vi.fn().mockResolvedValue(result);
  return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: end };
}

const genRunning = {
  provider: 'higgsfield',
  provider_job_id: 'hf-job-123',
  status: 'RUNNING',
};

const pollParams = {
  aiGenerationId: 'gen1',
  productionJobId: 'job1',
  organizationId: 'org1',
};

// ─── pollGenerationStatus ─────────────────────────────────────────────────────

describe('pollGenerationStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunAutomatedQcAndPipeline.mockResolvedValue({ ok: true });
  });

  it('returns error when AiGeneration not found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const result = await pollGenerationStatus(pollParams);

    expect(result).toEqual({ ok: false, error: expect.stringContaining('AiGeneration not found') });
    expect(mockPollJobStatus).not.toHaveBeenCalled();
  });

  it('returns done:true without polling when status is already terminal', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ ...genRunning, status: 'SUCCEEDED' }]));

    const result = await pollGenerationStatus(pollParams);

    expect(result).toEqual({ ok: true, done: true, status: 'SUCCEEDED' });
    expect(mockPollJobStatus).not.toHaveBeenCalled();
  });

  it('returns error when provider or provider_job_id is missing', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ provider: null, provider_job_id: null, status: 'RUNNING' }]));

    const result = await pollGenerationStatus(pollParams);

    expect(result).toEqual({ ok: false, error: expect.stringContaining('missing provider') });
  });

  it('returns error when provider returns null', async () => {
    mockSelect.mockReturnValue(makeSelectChain([genRunning]));
    mockPollJobStatus.mockResolvedValue(null);

    const result = await pollGenerationStatus(pollParams);

    expect(result).toEqual({ ok: false, error: 'Provider returned no status' });
  });

  it('returns done:false when provider status is still RUNNING', async () => {
    mockSelect.mockReturnValue(makeSelectChain([genRunning]));
    mockPollJobStatus.mockResolvedValue({ status: 'RUNNING' });

    const result = await pollGenerationStatus(pollParams);

    expect(result).toEqual({ ok: true, done: false, status: 'RUNNING' });
    expect(mockMaterializeGenerationAsset).not.toHaveBeenCalled();
    expect(mockAttemptProductionJobCompletion).not.toHaveBeenCalled();
  });

  // DR 0077 §2.2: SUCCEEDED from poll → materialize + attempt completion
  it('materializes asset and attempts completion when poll returns SUCCEEDED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([genRunning]));
    mockPollJobStatus.mockResolvedValue({ status: 'SUCCEEDED', resultUrl: 'https://cdn.example.com/out.mp4' });
    mockMaterializeGenerationAsset.mockResolvedValue({ ok: true, assetId: 'asset1' });
    mockAttemptProductionJobCompletion.mockResolvedValue({ ok: true, transitioned: true });

    const result = await pollGenerationStatus(pollParams);

    expect(result).toEqual({ ok: true, done: true, status: 'SUCCEEDED' });
    expect(mockMaterializeGenerationAsset).toHaveBeenCalledWith({
      aiGenerationId: 'gen1',
      productionJobId: 'job1',
      organizationId: 'org1',
      provider: 'higgsfield',
      resultUrl: 'https://cdn.example.com/out.mp4',
    });
    expect(mockAttemptProductionJobCompletion).toHaveBeenCalledWith({ productionJobId: 'job1', organizationId: 'org1' });
  });

  // DR 0078 §2.5: materialization failure → do NOT call attemptProductionJobCompletion
  it('does not call attemptProductionJobCompletion when materialization fails', async () => {
    mockSelect.mockReturnValue(makeSelectChain([genRunning]));
    mockPollJobStatus.mockResolvedValue({ status: 'SUCCEEDED', resultUrl: undefined });
    mockMaterializeGenerationAsset.mockResolvedValue({ ok: false, error: 'DB error' });

    const result = await pollGenerationStatus(pollParams);

    expect(result).toEqual({ ok: true, done: true, status: 'SUCCEEDED' });
    expect(mockAttemptProductionJobCompletion).not.toHaveBeenCalled();
  });

  // FAILED from poll → fail the production job
  it('calls failProductionJob when poll returns FAILED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([genRunning]));
    mockPollJobStatus.mockResolvedValue({ status: 'FAILED', error: 'server exploded' });
    mockFailProductionJob.mockResolvedValue({ ok: true, transitioned: true });

    const result = await pollGenerationStatus(pollParams);

    expect(result).toEqual({ ok: true, done: true, status: 'FAILED' });
    expect(mockFailProductionJob).toHaveBeenCalledWith({
      productionJobId: 'job1',
      organizationId: 'org1',
      reason: 'server exploded',
    });
    expect(mockMaterializeGenerationAsset).not.toHaveBeenCalled();
  });
});

// ─── boundedPollUntilTerminal ─────────────────────────────────────────────────

describe('boundedPollUntilTerminal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunAutomatedQcAndPipeline.mockResolvedValue({ ok: true });
  });

  it('returns immediately when first poll is done', async () => {
    mockSelect.mockReturnValue(makeSelectChain([genRunning]));
    mockPollJobStatus.mockResolvedValue({ status: 'SUCCEEDED', resultUrl: 'https://cdn.example.com/out.mp4' });
    mockMaterializeGenerationAsset.mockResolvedValue({ ok: true, assetId: 'asset1' });
    mockAttemptProductionJobCompletion.mockResolvedValue({ ok: true, transitioned: true });

    const result = await boundedPollUntilTerminal({ ...pollParams, maxAttempts: 3, intervalMs: 0 });

    expect(result).toEqual({ ok: true, done: true, status: 'SUCCEEDED' });
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it('returns exhausted error after maxAttempts non-terminal polls', async () => {
    mockSelect.mockReturnValue(makeSelectChain([genRunning]));
    mockPollJobStatus.mockResolvedValue({ status: 'RUNNING' });

    const result = await boundedPollUntilTerminal({ ...pollParams, maxAttempts: 2, intervalMs: 0 });

    expect(result).toEqual({ ok: false, error: expect.stringContaining('Polling exhausted after 2 attempts') });
    expect(mockSelect).toHaveBeenCalledTimes(2);
  });

  it('stops early on first terminal state even if maxAttempts not reached', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      const end = vi.fn().mockResolvedValue([genRunning]);
      return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: end };
    });
    mockPollJobStatus.mockImplementation(() => {
      call++;
      return Promise.resolve(call < 2 ? { status: 'RUNNING' } : { status: 'FAILED', error: 'timed out' });
    });
    mockFailProductionJob.mockResolvedValue({ ok: true, transitioned: true });

    const result = await boundedPollUntilTerminal({ ...pollParams, maxAttempts: 5, intervalMs: 0 });

    expect(result).toEqual({ ok: true, done: true, status: 'FAILED' });
    expect(mockPollJobStatus).toHaveBeenCalledTimes(2);
  });
});
