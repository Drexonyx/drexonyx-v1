import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDelegateSubTask } = vi.hoisted(() => ({
  mockDelegateSubTask: vi.fn(),
}));

vi.mock('@/lib/orchestration/delegation', () => ({
  delegateSubTask: mockDelegateSubTask,
}));

import { delegateProductionRun } from '../production-run-specialist';

const BASE_PARAMS = {
  parentTaskId: 'parent-task-id',
  organizationId: 'org-1',
  initiatedByUserId: 'user-1',
  initiatorRole: 'OWNER' as const,
  orderId: 'order-uuid-1',
  briefId: 'brief-uuid-1',
  briefPrompt: 'Generate a 30-second ad for the summer campaign.',
};

describe('delegateProductionRun', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects initiatorRole CREATIVE_PRODUCTION', async () => {
    const result = await delegateProductionRun({
      ...BASE_PARAMS,
      // @ts-expect-error — testing runtime guard for unauthorized role
      initiatorRole: 'CREATIVE_PRODUCTION',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/OWNER|ADMIN_OPERATIONS/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects empty orderId', async () => {
    const result = await delegateProductionRun({ ...BASE_PARAMS, orderId: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/orderId/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects empty briefId', async () => {
    const result = await delegateProductionRun({ ...BASE_PARAMS, briefId: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/briefId/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects empty briefPrompt', async () => {
    const result = await delegateProductionRun({ ...BASE_PARAMS, briefPrompt: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/briefPrompt/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('delegates with COORDINATE_PRODUCTION_RUN intent type', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateProductionRun(BASE_PARAMS);

    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({ intentType: 'COORDINATE_PRODUCTION_RUN' }),
    );
  });

  it('builds a four-step plan: SKILL → HUMAN_GATE → PRODUCTION_JOB → NOTIFICATION', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateProductionRun(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps).toHaveLength(4);
    expect(call.plan.steps[0].step_type).toBe('SKILL');
    expect(call.plan.steps[0].skill_id).toBe('utility.prompt.optimize');
    expect(call.plan.steps[1].step_type).toBe('HUMAN_GATE');
    expect(call.plan.steps[2].step_type).toBe('PRODUCTION_JOB');
    expect(call.plan.steps[3].step_type).toBe('NOTIFICATION');
  });

  it('step 1 HUMAN_GATE carries JOB_APPROVAL gate type and orderId', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateProductionRun(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[1].input).toMatchObject({
      gate: 'JOB_APPROVAL',
      orderId: 'order-uuid-1',
    });
  });

  it('step 0 SKILL carries briefPrompt and orderId in input', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateProductionRun(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].input).toMatchObject({
      prompt: BASE_PARAMS.briefPrompt,
      orderId: 'order-uuid-1',
      briefId: 'brief-uuid-1',
    });
  });

  it('inherits organizationId and initiator context', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateProductionRun({ ...BASE_PARAMS, initiatorRole: 'ADMIN_OPERATIONS' });

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

    const result = await delegateProductionRun(BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.subTaskId).toBe('delegated-uuid');
  });

  it('propagates delegation failure', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: false, error: 'DB error' });

    const result = await delegateProductionRun(BASE_PARAMS);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('DB error');
  });

  it('sets context to order_id and brief_id when not provided', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegateProductionRun(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.context).toMatchObject({ order_id: 'order-uuid-1', brief_id: 'brief-uuid-1' });
  });
});
