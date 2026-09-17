import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDelegateSubTask } = vi.hoisted(() => ({
  mockDelegateSubTask: vi.fn(),
}));

vi.mock('@/lib/orchestration/delegation', () => ({
  delegateSubTask: mockDelegateSubTask,
}));

import { delegateQcMetadata } from '../qc-metadata-specialist';

const BASE_PARAMS = {
  parentTaskId: 'parent-task-id',
  organizationId: 'org-1',
  initiatedByUserId: 'user-1',
  initiatorRole: 'OWNER' as const,
  assetName: 'hero-banner.jpg',
  assetType: 'IMAGE',
};

describe('delegateQcMetadata', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when assetName is empty', async () => {
    const result = await delegateQcMetadata({ ...BASE_PARAMS, assetName: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/assetName/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('returns error when assetType is empty', async () => {
    const result = await delegateQcMetadata({ ...BASE_PARAMS, assetType: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/assetType/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('delegates with INSPECT_ASSET_METADATA intent type', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateQcMetadata(BASE_PARAMS);

    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({ intentType: 'INSPECT_ASSET_METADATA' }),
    );
  });

  it('builds a single-step SKILL plan with qc.asset.metadata and step input', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateQcMetadata({ ...BASE_PARAMS, metadata: { alt_text: 'banner' } });

    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: expect.objectContaining({
          steps: [
            {
              step_index: 0,
              step_type: 'SKILL',
              skill_id: 'qc.asset.metadata',
              input: { assetName: 'hero-banner.jpg', assetType: 'IMAGE', metadata: { alt_text: 'banner' } },
            },
          ],
        }),
      }),
    );
  });

  it('omits metadata key from step input when not supplied', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateQcMetadata(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].input).toEqual({ assetName: 'hero-banner.jpg', assetType: 'IMAGE' });
    expect(call.plan.steps[0].input).not.toHaveProperty('metadata');
  });

  it('inherits organizationId and initiator context', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateQcMetadata({ ...BASE_PARAMS, initiatorRole: 'QC' });

    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        initiatedByUserId: 'user-1',
        initiatorRole: 'QC',
        parentTaskId: 'parent-task-id',
      }),
    );
  });

  it('returns subTaskId on successful delegation', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'delegated-uuid' });

    const result = await delegateQcMetadata(BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.subTaskId).toBe('delegated-uuid');
  });

  it('propagates delegation failure', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: false, error: 'DB error' });

    const result = await delegateQcMetadata(BASE_PARAMS);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('DB error');
  });
});
