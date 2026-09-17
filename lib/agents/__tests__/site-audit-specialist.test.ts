import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDelegateSubTask } = vi.hoisted(() => ({
  mockDelegateSubTask: vi.fn(),
}));

vi.mock('@/lib/orchestration/delegation', () => ({
  delegateSubTask: mockDelegateSubTask,
}));

import { delegateSiteAudit } from '../site-audit-specialist';

const BASE_PARAMS = {
  parentTaskId: 'parent-task-id',
  organizationId: 'org-1',
  initiatedByUserId: 'user-1',
  initiatorRole: 'ADMIN_OPERATIONS' as const,
};

describe('delegateSiteAudit', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Authorization ────────────────────────────────────────────────────────────

  it('rejects initiatorRole CREATIVE_PRODUCTION', async () => {
    const result = await delegateSiteAudit({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard
      initiatorRole: 'CREATIVE_PRODUCTION',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/OWNER|ADMIN_OPERATIONS/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects initiatorRole QC', async () => {
    const result = await delegateSiteAudit({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard
      initiatorRole: 'QC',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/OWNER|ADMIN_OPERATIONS/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects initiatorRole CLIENT', async () => {
    const result = await delegateSiteAudit({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard
      initiatorRole: 'CLIENT',
    });
    expect(result.ok).toBe(false);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('accepts OWNER initiatorRole', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    const result = await delegateSiteAudit({ ...BASE_PARAMS, initiatorRole: 'OWNER' });
    expect(result.ok).toBe(true);
    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({ initiatorRole: 'OWNER' }),
    );
  });

  it('accepts ADMIN_OPERATIONS initiatorRole', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    const result = await delegateSiteAudit(BASE_PARAMS);
    expect(result.ok).toBe(true);
  });

  // ── Intent type ──────────────────────────────────────────────────────────────

  it('delegates with AUDIT_WEBSITE_CONTENT intent type', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateSiteAudit(BASE_PARAMS);
    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({ intentType: 'AUDIT_WEBSITE_CONTENT' }),
    );
  });

  // ── Plan structure ───────────────────────────────────────────────────────────

  it('builds a three-step plan', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateSiteAudit(BASE_PARAMS);
    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps).toHaveLength(3);
  });

  it('step 0 is VERIFY with WEBSITE_CONTENT_AUDIT reportType', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateSiteAudit(BASE_PARAMS);
    const { steps } = mockDelegateSubTask.mock.calls[0][0].plan;
    expect(steps[0].step_type).toBe('VERIFY');
    expect(steps[0].step_index).toBe(0);
    expect(steps[0].input).toMatchObject({ reportType: 'WEBSITE_CONTENT_AUDIT' });
  });

  it('step 1 is HUMAN_GATE for content review — mandatory before any change', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateSiteAudit(BASE_PARAMS);
    const { steps } = mockDelegateSubTask.mock.calls[0][0].plan;
    expect(steps[1].step_type).toBe('HUMAN_GATE');
    expect(steps[1].step_index).toBe(1);
    expect(steps[1].input).toMatchObject({ gate: 'WEBSITE_CONTENT_REVIEW' });
    const requiredRoles = (steps[1].input as Record<string, unknown>).requiredRoles as string[];
    expect(requiredRoles).toContain('OWNER');
    expect(requiredRoles).toContain('ADMIN_OPERATIONS');
  });

  it('step 2 is NOTIFICATION — internal completion alert', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateSiteAudit(BASE_PARAMS);
    const { steps } = mockDelegateSubTask.mock.calls[0][0].plan;
    expect(steps[2].step_type).toBe('NOTIFICATION');
    expect(steps[2].step_index).toBe(2);
    expect(steps[2].input).toMatchObject({ eventType: 'REPORT_READY' });
  });

  it('VERIFY precedes HUMAN_GATE (read-only audit before any review gate)', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateSiteAudit(BASE_PARAMS);
    const { steps } = mockDelegateSubTask.mock.calls[0][0].plan;
    const verifyIdx = steps.findIndex((s: { step_type: string }) => s.step_type === 'VERIFY');
    const gateIdx = steps.findIndex((s: { step_type: string }) => s.step_type === 'HUMAN_GATE');
    expect(verifyIdx).toBeLessThan(gateIdx);
  });

  it('step indices are sequential starting from 0', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateSiteAudit(BASE_PARAMS);
    const { steps } = mockDelegateSubTask.mock.calls[0][0].plan;
    steps.forEach((s: { step_index: number }, idx: number) => {
      expect(s.step_index).toBe(idx);
    });
  });

  // ── Organization and initiator context ──────────────────────────────────────

  it('inherits organizationId and initiator context', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateSiteAudit(BASE_PARAMS);
    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        initiatedByUserId: 'user-1',
        initiatorRole: 'ADMIN_OPERATIONS',
        parentTaskId: 'parent-task-id',
      }),
    );
  });

  it('uses empty object as default context', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateSiteAudit(BASE_PARAMS);
    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.context).toEqual({});
  });

  it('passes through provided context', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    const ctx = { order_id: 'order-42' };
    await delegateSiteAudit({ ...BASE_PARAMS, context: ctx });
    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.context).toEqual(ctx);
  });

  // ── Delegation result pass-through ──────────────────────────────────────────

  it('returns subTaskId on successful delegation', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'delegated-uuid' });
    const result = await delegateSiteAudit(BASE_PARAMS);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.subTaskId).toBe('delegated-uuid');
  });

  it('propagates delegation failure', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: false, error: 'DB error' });
    const result = await delegateSiteAudit(BASE_PARAMS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('DB error');
  });

  it('plan has generated_at ISO timestamp', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateSiteAudit(BASE_PARAMS);
    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('title identifies the audit target', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateSiteAudit(BASE_PARAMS);
    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.title).toMatch(/website|audit/i);
  });
});
