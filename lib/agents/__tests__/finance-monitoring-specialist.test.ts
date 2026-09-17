import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDelegateSubTask } = vi.hoisted(() => ({
  mockDelegateSubTask: vi.fn(),
}));

vi.mock('@/lib/orchestration/delegation', () => ({
  delegateSubTask: mockDelegateSubTask,
}));

import { delegateFinanceMonitoring } from '../finance-monitoring-specialist';

const BASE_PARAMS = {
  parentTaskId: 'parent-task-id',
  organizationId: 'org-1',
  initiatedByUserId: 'user-1',
  initiatorRole: 'ADMIN_OPERATIONS' as const,
};

describe('delegateFinanceMonitoring', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects initiatorRole CREATIVE_PRODUCTION', async () => {
    const result = await delegateFinanceMonitoring({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard for unauthorized role
      initiatorRole: 'CREATIVE_PRODUCTION',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/OWNER|ADMIN_OPERATIONS/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects initiatorRole QC', async () => {
    const result = await delegateFinanceMonitoring({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard
      initiatorRole: 'QC',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/OWNER|ADMIN_OPERATIONS/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('delegates with COORDINATE_FINANCIAL_MONITORING intent type', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateFinanceMonitoring(BASE_PARAMS);

    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({ intentType: 'COORDINATE_FINANCIAL_MONITORING' }),
    );
  });

  it('builds a two-step plan: FINANCIAL_CHECK → NOTIFICATION', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateFinanceMonitoring(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps).toHaveLength(2);
    expect(call.plan.steps[0].step_type).toBe('FINANCIAL_CHECK');
    expect(call.plan.steps[1].step_type).toBe('NOTIFICATION');
  });

  it('FINANCIAL_CHECK step carries reportType FULL_STATUS', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateFinanceMonitoring(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].input).toMatchObject({ reportType: 'FULL_STATUS' });
  });

  it('NOTIFICATION step carries eventType FINANCIAL_MONITORING_COMPLETED', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateFinanceMonitoring(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[1].input).toMatchObject({
      eventType: 'FINANCIAL_MONITORING_COMPLETED',
    });
  });

  it('FINANCIAL_CHECK step has no skill_id (uses FINANCIAL_CHECK step type, not SKILL)', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateFinanceMonitoring(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    // skill_id must not be set on a FINANCIAL_CHECK step
    expect(call.plan.steps[0].skill_id).toBeUndefined();
  });

  it('step indices are sequential 0–1', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateFinanceMonitoring(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    call.plan.steps.forEach((step: { step_index: number }, i: number) => {
      expect(step.step_index).toBe(i);
    });
  });

  it('accepts OWNER initiatorRole', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    const result = await delegateFinanceMonitoring({
      ...BASE_PARAMS,
      initiatorRole: 'OWNER',
    });

    expect(result.ok).toBe(true);
    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({ initiatorRole: 'OWNER' }),
    );
  });

  it('inherits organizationId and initiator context', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateFinanceMonitoring(BASE_PARAMS);

    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        initiatedByUserId: 'user-1',
        initiatorRole: 'ADMIN_OPERATIONS',
        parentTaskId: 'parent-task-id',
      }),
    );
  });

  it('returns subTaskId on successful delegation', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'delegated-uuid' });

    const result = await delegateFinanceMonitoring(BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.subTaskId).toBe('delegated-uuid');
  });

  it('propagates delegation failure', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: false, error: 'DB error' });

    const result = await delegateFinanceMonitoring(BASE_PARAMS);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('DB error');
  });

  it('uses empty context when none provided', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateFinanceMonitoring(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.context).toEqual({});
  });

  it('passes through provided context', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    const ctx = { order_id: 'order-99' };
    await delegateFinanceMonitoring({ ...BASE_PARAMS, context: ctx });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.context).toEqual(ctx);
  });
});
