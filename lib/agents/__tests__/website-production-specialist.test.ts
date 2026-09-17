import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDelegateSubTask } = vi.hoisted(() => ({
  mockDelegateSubTask: vi.fn(),
}));

vi.mock('@/lib/orchestration/delegation', () => ({
  delegateSubTask: mockDelegateSubTask,
}));

import { delegateWebsiteProduction } from '../website-production-specialist';

const BASE_PARAMS = {
  parentTaskId: 'parent-task-id',
  organizationId: 'org-1',
  initiatedByUserId: 'user-1',
  initiatorRole: 'ADMIN_OPERATIONS' as const,
  campaignId: 'campaign-uuid-1',
  orderId: 'order-uuid-1',
  briefId: 'brief-uuid-1',
};

describe('delegateWebsiteProduction', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Authorization ────────────────────────────────────────────────────────────

  it('rejects initiatorRole CREATIVE_PRODUCTION', async () => {
    const result = await delegateWebsiteProduction({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard
      initiatorRole: 'CREATIVE_PRODUCTION',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/OWNER|ADMIN_OPERATIONS/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects initiatorRole QC', async () => {
    const result = await delegateWebsiteProduction({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard
      initiatorRole: 'QC',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/OWNER|ADMIN_OPERATIONS/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects initiatorRole CLIENT', async () => {
    const result = await delegateWebsiteProduction({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard
      initiatorRole: 'CLIENT',
    });
    expect(result.ok).toBe(false);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('accepts OWNER initiatorRole', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    const result = await delegateWebsiteProduction({ ...BASE_PARAMS, initiatorRole: 'OWNER' });
    expect(result.ok).toBe(true);
    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({ initiatorRole: 'OWNER' }),
    );
  });

  // ── Input validation ─────────────────────────────────────────────────────────

  it('rejects empty campaignId', async () => {
    const result = await delegateWebsiteProduction({ ...BASE_PARAMS, campaignId: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/campaignId/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects empty orderId', async () => {
    const result = await delegateWebsiteProduction({ ...BASE_PARAMS, orderId: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/orderId/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects empty briefId', async () => {
    const result = await delegateWebsiteProduction({ ...BASE_PARAMS, briefId: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/briefId/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  // ── Intent type ──────────────────────────────────────────────────────────────

  it('delegates with COORDINATE_WEBSITE_PRODUCTION intent type', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateWebsiteProduction(BASE_PARAMS);
    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({ intentType: 'COORDINATE_WEBSITE_PRODUCTION' }),
    );
  });

  // ── Plan structure ───────────────────────────────────────────────────────────

  it('builds a seven-step plan', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateWebsiteProduction(BASE_PARAMS);
    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps).toHaveLength(7);
  });

  it('step 0 is VERIFY with WEBSITE_PRODUCTION_BRIEF_VALIDATION reportType', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateWebsiteProduction(BASE_PARAMS);
    const { steps } = mockDelegateSubTask.mock.calls[0][0].plan;
    expect(steps[0].step_type).toBe('VERIFY');
    expect(steps[0].step_index).toBe(0);
    expect(steps[0].input).toMatchObject({ reportType: 'WEBSITE_PRODUCTION_BRIEF_VALIDATION' });
  });

  it('step 1 is FINANCIAL_CHECK — budget guard before production', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateWebsiteProduction(BASE_PARAMS);
    const { steps } = mockDelegateSubTask.mock.calls[0][0].plan;
    expect(steps[1].step_type).toBe('FINANCIAL_CHECK');
    expect(steps[1].step_index).toBe(1);
    expect(steps[1].input).toMatchObject({ orderId: BASE_PARAMS.orderId });
  });

  it('step 2 is HUMAN_GATE for production authorization', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateWebsiteProduction(BASE_PARAMS);
    const { steps } = mockDelegateSubTask.mock.calls[0][0].plan;
    expect(steps[2].step_type).toBe('HUMAN_GATE');
    expect(steps[2].step_index).toBe(2);
    expect(steps[2].input).toMatchObject({ gate: 'WEBSITE_PRODUCTION_AUTHORIZATION' });
    expect((steps[2].input as Record<string, unknown>).requiredRoles).toContain('OWNER');
    expect((steps[2].input as Record<string, unknown>).requiredRoles).toContain('ADMIN_OPERATIONS');
  });

  it('step 3 is PRODUCTION_JOB with MANUAL_UPLOAD jobType', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateWebsiteProduction(BASE_PARAMS);
    const { steps } = mockDelegateSubTask.mock.calls[0][0].plan;
    expect(steps[3].step_type).toBe('PRODUCTION_JOB');
    expect(steps[3].step_index).toBe(3);
    expect(steps[3].input).toMatchObject({ jobType: 'MANUAL_UPLOAD' });
  });

  it('step 4 is QC_GATE — mandatory, cannot be bypassed (DR 0090)', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateWebsiteProduction(BASE_PARAMS);
    const { steps } = mockDelegateSubTask.mock.calls[0][0].plan;
    expect(steps[4].step_type).toBe('QC_GATE');
    expect(steps[4].step_index).toBe(4);
    const requiredRoles = (steps[4].input as Record<string, unknown>).requiredRoles as string[];
    expect(requiredRoles).toContain('OWNER');
    expect(requiredRoles).toContain('ADMIN_OPERATIONS');
    expect(requiredRoles).toContain('QC');
  });

  it('step 5 is HUMAN_GATE for delivery approval before publish', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateWebsiteProduction(BASE_PARAMS);
    const { steps } = mockDelegateSubTask.mock.calls[0][0].plan;
    expect(steps[5].step_type).toBe('HUMAN_GATE');
    expect(steps[5].step_index).toBe(5);
    expect(steps[5].input).toMatchObject({ gate: 'WEBSITE_DELIVERY_APPROVAL' });
    expect((steps[5].input as Record<string, unknown>).requiredRoles).toContain('OWNER');
    expect((steps[5].input as Record<string, unknown>).requiredRoles).toContain('ADMIN_OPERATIONS');
  });

  it('step 6 is NOTIFICATION — completion alert', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateWebsiteProduction(BASE_PARAMS);
    const { steps } = mockDelegateSubTask.mock.calls[0][0].plan;
    expect(steps[6].step_type).toBe('NOTIFICATION');
    expect(steps[6].step_index).toBe(6);
    expect(steps[6].input).toMatchObject({ eventType: 'REPORT_READY' });
  });

  // ── FINANCIAL_CHECK is before PRODUCTION_JOB (financial safety) ──────────────

  it('FINANCIAL_CHECK (step 1) precedes PRODUCTION_JOB (step 3)', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateWebsiteProduction(BASE_PARAMS);
    const { steps } = mockDelegateSubTask.mock.calls[0][0].plan;
    const financialIdx = steps.findIndex((s: { step_type: string }) => s.step_type === 'FINANCIAL_CHECK');
    const productionIdx = steps.findIndex((s: { step_type: string }) => s.step_type === 'PRODUCTION_JOB');
    expect(financialIdx).toBeLessThan(productionIdx);
  });

  // ── QC_GATE before delivery HUMAN_GATE ──────────────────────────────────────

  it('QC_GATE (step 4) precedes delivery HUMAN_GATE (step 5)', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateWebsiteProduction(BASE_PARAMS);
    const { steps } = mockDelegateSubTask.mock.calls[0][0].plan;
    const qcIdx = steps.findIndex((s: { step_type: string }) => s.step_type === 'QC_GATE');
    const deliveryGateIdx = steps.findIndex(
      (s: { step_type: string; step_index: number }) => s.step_type === 'HUMAN_GATE' && s.step_index === 5,
    );
    expect(qcIdx).toBeLessThan(deliveryGateIdx);
  });

  // ── Plan carries all three IDs ───────────────────────────────────────────────

  it('VERIFY step carries campaignId, orderId, briefId', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateWebsiteProduction(BASE_PARAMS);
    const { steps } = mockDelegateSubTask.mock.calls[0][0].plan;
    expect(steps[0].input).toMatchObject({
      campaignId: BASE_PARAMS.campaignId,
      orderId: BASE_PARAMS.orderId,
      briefId: BASE_PARAMS.briefId,
    });
  });

  // ── Organization and initiator context ──────────────────────────────────────

  it('inherits organizationId and initiator context', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateWebsiteProduction(BASE_PARAMS);
    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        initiatedByUserId: 'user-1',
        initiatorRole: 'ADMIN_OPERATIONS',
        parentTaskId: 'parent-task-id',
      }),
    );
  });

  it('default context includes campaign_id, order_id, brief_id', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateWebsiteProduction(BASE_PARAMS);
    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.context).toEqual({
      campaign_id: BASE_PARAMS.campaignId,
      order_id: BASE_PARAMS.orderId,
      brief_id: BASE_PARAMS.briefId,
    });
  });

  it('passes through provided context', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    const ctx = { order_id: 'order-42', brief_id: 'brief-42' };
    await delegateWebsiteProduction({ ...BASE_PARAMS, context: ctx });
    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.context).toEqual(ctx);
  });

  // ── Delegation result pass-through ──────────────────────────────────────────

  it('returns subTaskId on successful delegation', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'delegated-uuid' });
    const result = await delegateWebsiteProduction(BASE_PARAMS);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.subTaskId).toBe('delegated-uuid');
  });

  it('propagates delegation failure', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: false, error: 'DB error' });
    const result = await delegateWebsiteProduction(BASE_PARAMS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('DB error');
  });

  it('plan has generated_at ISO timestamp', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateWebsiteProduction(BASE_PARAMS);
    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
