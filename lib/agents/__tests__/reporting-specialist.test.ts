import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDelegateSubTask } = vi.hoisted(() => ({
  mockDelegateSubTask: vi.fn(),
}));

vi.mock('@/lib/orchestration/delegation', () => ({
  delegateSubTask: mockDelegateSubTask,
}));

import { delegateReporting } from '../reporting-specialist';

const BASE_PARAMS = {
  parentTaskId: 'parent-task-id',
  organizationId: 'org-1',
  initiatedByUserId: 'user-1',
  initiatorRole: 'ADMIN_OPERATIONS' as const,
};

describe('delegateReporting', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects initiatorRole CREATIVE_PRODUCTION', async () => {
    const result = await delegateReporting({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard for unauthorized role
      initiatorRole: 'CREATIVE_PRODUCTION',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/OWNER|ADMIN_OPERATIONS/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects initiatorRole QC', async () => {
    const result = await delegateReporting({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard
      initiatorRole: 'QC',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/OWNER|ADMIN_OPERATIONS/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects initiatorRole CLIENT', async () => {
    const result = await delegateReporting({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard
      initiatorRole: 'CLIENT',
    });
    expect(result.ok).toBe(false);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('delegates with GENERATE_OPERATIONAL_REPORT intent type', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateReporting(BASE_PARAMS);

    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({ intentType: 'GENERATE_OPERATIONAL_REPORT' }),
    );
  });

  it('builds a two-step plan: VERIFY → NOTIFICATION', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateReporting(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps).toHaveLength(2);
    expect(call.plan.steps[0].step_type).toBe('VERIFY');
    expect(call.plan.steps[1].step_type).toBe('NOTIFICATION');
  });

  it('VERIFY step carries reportType OPERATIONAL_REPORT', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateReporting(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].input).toMatchObject({ reportType: 'OPERATIONAL_REPORT' });
  });

  it('NOTIFICATION step carries eventType REPORTING_COMPLETED', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateReporting(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[1].input).toMatchObject({ eventType: 'REPORTING_COMPLETED' });
  });

  it('VERIFY step has no skill_id', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateReporting(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].skill_id).toBeUndefined();
  });

  it('step indices are sequential 0–1', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateReporting(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    call.plan.steps.forEach((step: { step_index: number }, i: number) => {
      expect(step.step_index).toBe(i);
    });
  });

  it('accepts OWNER initiatorRole', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    const result = await delegateReporting({
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

    await delegateReporting(BASE_PARAMS);

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

    const result = await delegateReporting(BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.subTaskId).toBe('delegated-uuid');
  });

  it('propagates delegation failure', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: false, error: 'DB error' });

    const result = await delegateReporting(BASE_PARAMS);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('DB error');
  });

  it('uses empty context when none provided', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateReporting(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.context).toEqual({});
  });

  it('passes through provided context', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    const ctx = { order_id: 'order-99' };
    await delegateReporting({ ...BASE_PARAMS, context: ctx });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.context).toEqual(ctx);
  });
});
