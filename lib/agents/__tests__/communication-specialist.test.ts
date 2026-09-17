import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDelegateSubTask } = vi.hoisted(() => ({
  mockDelegateSubTask: vi.fn(),
}));

vi.mock('@/lib/orchestration/delegation', () => ({
  delegateSubTask: mockDelegateSubTask,
}));

import { delegateCommunication } from '../communication-specialist';

const BASE_PARAMS = {
  parentTaskId: 'parent-task-id',
  organizationId: 'org-1',
  initiatedByUserId: 'user-1',
  initiatorRole: 'ADMIN_OPERATIONS' as const,
  eventType: 'JOB_FAILED' as const,
  title: 'Production job failed',
  detail: 'Timeout after 30s',
};

describe('delegateCommunication', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects initiatorRole CREATIVE_PRODUCTION', async () => {
    const result = await delegateCommunication({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard for unauthorized role
      initiatorRole: 'CREATIVE_PRODUCTION',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/OWNER|ADMIN_OPERATIONS/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects initiatorRole QC', async () => {
    const result = await delegateCommunication({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard
      initiatorRole: 'QC',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/OWNER|ADMIN_OPERATIONS/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects initiatorRole CLIENT', async () => {
    const result = await delegateCommunication({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard
      initiatorRole: 'CLIENT',
    });
    expect(result.ok).toBe(false);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('accepts OWNER initiatorRole', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    const result = await delegateCommunication({
      ...BASE_PARAMS,
      initiatorRole: 'OWNER',
    });
    expect(result.ok).toBe(true);
    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({ initiatorRole: 'OWNER' }),
    );
  });

  it('delegates with COORDINATE_INTERNAL_NOTIFICATION intent type', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateCommunication(BASE_PARAMS);

    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({ intentType: 'COORDINATE_INTERNAL_NOTIFICATION' }),
    );
  });

  it('builds a single-step plan with NOTIFICATION step type', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateCommunication(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps).toHaveLength(1);
    expect(call.plan.steps[0].step_type).toBe('NOTIFICATION');
  });

  it('NOTIFICATION step has step_index 0', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateCommunication(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].step_index).toBe(0);
  });

  it('NOTIFICATION step carries eventType in input', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateCommunication(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].input).toMatchObject({ eventType: 'JOB_FAILED' });
  });

  it('NOTIFICATION step carries title and detail in input', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateCommunication(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].input).toMatchObject({
      title: 'Production job failed',
      detail: 'Timeout after 30s',
    });
  });

  it('includes entityId and entityType in input when provided', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateCommunication({
      ...BASE_PARAMS,
      entityId: 'job-uuid-99',
      entityType: 'ProductionJob',
    });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].input).toMatchObject({
      entityId: 'job-uuid-99',
      entityType: 'ProductionJob',
    });
  });

  it('omits entityId and entityType from input when not provided', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateCommunication(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].input).not.toHaveProperty('entityId');
    expect(call.plan.steps[0].input).not.toHaveProperty('entityType');
  });

  it('inherits organizationId and initiator context', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateCommunication(BASE_PARAMS);

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

    const result = await delegateCommunication(BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.subTaskId).toBe('delegated-uuid');
  });

  it('propagates delegation failure', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: false, error: 'DB error' });

    const result = await delegateCommunication(BASE_PARAMS);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('DB error');
  });

  it('uses empty context when none provided', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateCommunication(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.context).toEqual({});
  });

  it('passes through provided context', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    const ctx = { order_id: 'order-42' };
    await delegateCommunication({ ...BASE_PARAMS, context: ctx });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.context).toEqual(ctx);
  });

  it('works for each approved event type', async () => {
    const eventTypes = [
      'JOB_FAILED',
      'QC_COMPLETED',
      'MONITORING_ALERT',
      'ANOMALY_DETECTED',
      'REPORT_READY',
    ] as const;

    for (const eventType of eventTypes) {
      vi.clearAllMocks();
      mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

      await delegateCommunication({ ...BASE_PARAMS, eventType });

      const call = mockDelegateSubTask.mock.calls[0][0];
      expect(call.plan.steps[0].input.eventType).toBe(eventType);
    }
  });
});
