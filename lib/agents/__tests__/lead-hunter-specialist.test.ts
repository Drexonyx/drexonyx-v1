import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDelegateSubTask } = vi.hoisted(() => ({
  mockDelegateSubTask: vi.fn(),
}));

vi.mock('@/lib/orchestration/delegation', () => ({
  delegateSubTask: mockDelegateSubTask,
}));

import { delegateLeadHunter } from '../lead-hunter-specialist';

const BASE_PARAMS = {
  parentTaskId: 'parent-task-id',
  organizationId: 'org-1',
  initiatedByUserId: 'user-1',
  initiatorRole: 'ADMIN_OPERATIONS' as const,
};

describe('delegateLeadHunter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects initiatorRole CREATIVE_PRODUCTION', async () => {
    const result = await delegateLeadHunter({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard for unauthorized role
      initiatorRole: 'CREATIVE_PRODUCTION',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/OWNER|ADMIN_OPERATIONS/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects initiatorRole QC', async () => {
    const result = await delegateLeadHunter({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard
      initiatorRole: 'QC',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/OWNER|ADMIN_OPERATIONS/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects initiatorRole CLIENT', async () => {
    const result = await delegateLeadHunter({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard
      initiatorRole: 'CLIENT',
    });
    expect(result.ok).toBe(false);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('accepts OWNER initiatorRole', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    const result = await delegateLeadHunter({
      ...BASE_PARAMS,
      initiatorRole: 'OWNER',
    });
    expect(result.ok).toBe(true);
    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({ initiatorRole: 'OWNER' }),
    );
  });

  it('delegates with HUNT_LEADS intent type', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateLeadHunter(BASE_PARAMS);

    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({ intentType: 'HUNT_LEADS' }),
    );
  });

  it('builds a two-step plan: VERIFY then NOTIFICATION', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateLeadHunter(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps).toHaveLength(2);
    expect(call.plan.steps[0].step_type).toBe('VERIFY');
    expect(call.plan.steps[1].step_type).toBe('NOTIFICATION');
  });

  it('VERIFY step has step_index 0', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateLeadHunter(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].step_index).toBe(0);
  });

  it('NOTIFICATION step has step_index 1', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateLeadHunter(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[1].step_index).toBe(1);
  });

  it('VERIFY step carries reportType LEAD_HUNTER_REPORT in input', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateLeadHunter(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].input).toMatchObject({ reportType: 'LEAD_HUNTER_REPORT' });
  });

  it('passes windowDays to VERIFY step input when provided', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateLeadHunter({ ...BASE_PARAMS, windowDays: 14 });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].input).toMatchObject({ windowDays: 14 });
  });

  it('omits windowDays from VERIFY step input when not provided', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateLeadHunter(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].input).not.toHaveProperty('windowDays');
  });

  it('NOTIFICATION step carries REPORT_READY eventType', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateLeadHunter(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[1].input).toMatchObject({ eventType: 'REPORT_READY' });
  });

  it('inherits organizationId and initiator context', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateLeadHunter(BASE_PARAMS);

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

    const result = await delegateLeadHunter(BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.subTaskId).toBe('delegated-uuid');
  });

  it('propagates delegation failure', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: false, error: 'DB error' });

    const result = await delegateLeadHunter(BASE_PARAMS);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('DB error');
  });

  it('uses empty context when none provided', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateLeadHunter(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.context).toEqual({});
  });

  it('passes through provided context', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    const ctx = { order_id: 'order-42' };
    await delegateLeadHunter({ ...BASE_PARAMS, context: ctx });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.context).toEqual(ctx);
  });

  it('plan has generated_at ISO timestamp', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateLeadHunter(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
