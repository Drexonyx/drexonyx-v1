import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDelegateSubTask } = vi.hoisted(() => ({
  mockDelegateSubTask: vi.fn(),
}));

vi.mock('@/lib/orchestration/delegation', () => ({
  delegateSubTask: mockDelegateSubTask,
}));

import { delegatePromptOptimize } from '../prompt-optimize-specialist';

const BASE_PARAMS = {
  parentTaskId: 'parent-task-id',
  organizationId: 'org-1',
  initiatedByUserId: 'user-1',
  initiatorRole: 'OWNER' as const,
  originalPrompt: 'cinematic close-up of a coffee cup',
};

describe('delegatePromptOptimize', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when originalPrompt is empty', async () => {
    const result = await delegatePromptOptimize({ ...BASE_PARAMS, originalPrompt: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/originalPrompt/);
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('delegates with OPTIMIZE_BRIEF_PROMPTS intent type', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegatePromptOptimize(BASE_PARAMS);

    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({ intentType: 'OPTIMIZE_BRIEF_PROMPTS' }),
    );
  });

  it('builds a single-step SKILL plan with utility.prompt.optimize and step input', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegatePromptOptimize({
      ...BASE_PARAMS,
      objectives: 'high contrast, dramatic lighting',
      targetModel: 'flux-pro',
    });

    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: expect.objectContaining({
          steps: [
            {
              step_index: 0,
              step_type: 'SKILL',
              skill_id: 'utility.prompt.optimize',
              input: {
                originalPrompt: 'cinematic close-up of a coffee cup',
                objectives: 'high contrast, dramatic lighting',
                targetModel: 'flux-pro',
              },
            },
          ],
        }),
      }),
    );
  });

  it('omits optional keys from step input when not supplied', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegatePromptOptimize(BASE_PARAMS);

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].input).toEqual({ originalPrompt: 'cinematic close-up of a coffee cup' });
    expect(call.plan.steps[0].input).not.toHaveProperty('objectives');
    expect(call.plan.steps[0].input).not.toHaveProperty('targetModel');
  });

  it('inherits organizationId and initiator context', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });

    await delegatePromptOptimize({ ...BASE_PARAMS, initiatorRole: 'CREATIVE_PRODUCTION' });

    expect(mockDelegateSubTask).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        initiatedByUserId: 'user-1',
        initiatorRole: 'CREATIVE_PRODUCTION',
        parentTaskId: 'parent-task-id',
      }),
    );
  });

  it('returns subTaskId on successful delegation', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'delegated-uuid' });

    const result = await delegatePromptOptimize(BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.subTaskId).toBe('delegated-uuid');
  });

  it('propagates delegation failure', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: false, error: 'DB error' });

    const result = await delegatePromptOptimize(BASE_PARAMS);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('DB error');
  });

  it('truncates long prompts in the sub-task title', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    const longPrompt = 'a'.repeat(80);

    await delegatePromptOptimize({ ...BASE_PARAMS, originalPrompt: longPrompt });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.title).toContain('…');
    expect(call.title.length).toBeLessThan(longPrompt.length + 20);
  });
});
