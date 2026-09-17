import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDelegateSubTask } = vi.hoisted(() => ({
  mockDelegateSubTask: vi.fn(),
}));

vi.mock('@/lib/orchestration/delegation', () => ({
  delegateSubTask: mockDelegateSubTask,
}));

import { delegateQcReview } from '../qc-review-specialist';

const BASE_PARAMS = {
  parentTaskId: 'parent-task-id',
  organizationId: 'org-1',
  initiatedByUserId: 'user-1',
  initiatorRole: 'QC' as const,
  assetId: 'asset-uuid-1',
  assetName: 'hero-banner.mp4',
  assetType: 'VIDEO',
};

describe('delegateQcReview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects initiatorRole CREATIVE_PRODUCTION', async () => {
    const result = await delegateQcReview({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard for unauthorized role
      initiatorRole: 'CREATIVE_PRODUCTION',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/OWNER|ADMIN_OPERATIONS|QC/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects empty assetId', async () => {
    const result = await delegateQcReview({ ...BASE_PARAMS, assetId: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/assetId/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects empty assetName', async () => {
    const result = await delegateQcReview({ ...BASE_PARAMS, assetName: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/assetName/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects empty assetType', async () => {
    const result = await delegateQcReview({ ...BASE_PARAMS, assetType: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/assetType/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('delegates with COORDINATE_QC_REVIEW intent type', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateQcReview(BASE_PARAMS);

    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({ intentType: 'COORDINATE_QC_REVIEW' }),
    );
  });

  it('builds a five-step plan: 3 SKILL → QC_GATE → NOTIFICATION', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateQcReview(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps).toHaveLength(5);
    expect(call.plan.steps[0].step_type).toBe('SKILL');
    expect(call.plan.steps[1].step_type).toBe('SKILL');
    expect(call.plan.steps[2].step_type).toBe('SKILL');
    expect(call.plan.steps[3].step_type).toBe('QC_GATE');
    expect(call.plan.steps[4].step_type).toBe('NOTIFICATION');
  });

  it('runs all three QC skills: qc.asset.metadata, qc.script.review, qc.brand.alignment', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateQcReview(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].skill_id).toBe('qc.asset.metadata');
    expect(call.plan.steps[1].skill_id).toBe('qc.script.review');
    expect(call.plan.steps[2].skill_id).toBe('qc.brand.alignment');
  });

  it('QC_GATE step carries assetId and required roles (DR 0090 §2.2)', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateQcReview(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    const gate = call.plan.steps[3];
    expect(gate.step_type).toBe('QC_GATE');
    expect(gate.input).toMatchObject({
      assetId: 'asset-uuid-1',
      requiredRoles: expect.arrayContaining(['OWNER', 'ADMIN_OPERATIONS', 'QC']),
    });
  });

  it('skill steps carry assetId, assetName, assetType in input', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateQcReview(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    for (const stepIdx of [0, 1, 2]) {
      expect(call.plan.steps[stepIdx].input).toMatchObject({
        assetId: 'asset-uuid-1',
        assetName: 'hero-banner.mp4',
        assetType: 'VIDEO',
      });
    }
  });

  it('inherits organizationId and initiator context', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateQcReview({ ...BASE_PARAMS, initiatorRole: 'ADMIN_OPERATIONS' });

    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        initiatedByUserId: 'user-1',
        initiatorRole: 'ADMIN_OPERATIONS',
        parentTaskId: 'parent-task-id',
      }),
    );
  });

  it('accepts OWNER initiatorRole', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    const result = await delegateQcReview({ ...BASE_PARAMS, initiatorRole: 'OWNER' });

    expect(result.ok).toBe(true);
    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({ initiatorRole: 'OWNER' }),
    );
  });

  it('returns subTaskId on successful delegation', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'delegated-uuid' });

    const result = await delegateQcReview(BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.subTaskId).toBe('delegated-uuid');
  });

  it('propagates delegation failure', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: false, error: 'DB error' });

    const result = await delegateQcReview(BASE_PARAMS);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('DB error');
  });

  it('step indices are sequential 0–4', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateQcReview(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    call.plan.steps.forEach((step: { step_index: number }, i: number) => {
      expect(step.step_index).toBe(i);
    });
  });
});
