import { describe, it, expect, vi, beforeEach } from 'vitest';

// Tests that the AI-based plan builder validates all output against allowlists
// and rejects unapproved intent types, step types, and skill IDs.

const { mockCallAi } = vi.hoisted(() => ({
  mockCallAi: vi.fn(),
}));

vi.mock('@/lib/skills/ai/adapter', () => ({ callAi: mockCallAi }));

import { buildPlanFromDescription } from '../ai-planner';

const BASE_CTX = {};

function aiOk(obj: unknown) {
  return { ok: true, text: JSON.stringify(obj) };
}

describe('AI planner — valid output accepted', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts a valid single-step SKILL plan', async () => {
    mockCallAi.mockResolvedValueOnce(aiOk({
      intent_type: 'OPTIMIZE_BRIEF_PROMPTS',
      steps: [{ step_index: 0, step_type: 'SKILL', skill_id: 'utility.prompt.optimize' }],
    }));
    const result = await buildPlanFromDescription({ description: 'optimize prompts', context: BASE_CTX });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.classifiedIntentType).toBe('OPTIMIZE_BRIEF_PROMPTS');
    expect(result.plan.steps).toHaveLength(1);
    expect(result.plan.steps[0].skill_id).toBe('utility.prompt.optimize');
  });

  it('accepts a valid HUMAN_GATE plan', async () => {
    mockCallAi.mockResolvedValueOnce(aiOk({
      intent_type: 'ROUTE_APPROVAL',
      steps: [{ step_index: 0, step_type: 'HUMAN_GATE', skill_id: null }],
    }));
    const result = await buildPlanFromDescription({ description: 'route for approval', context: BASE_CTX });
    expect(result.ok).toBe(true);
  });

  it('accepts Phase 2 step types', async () => {
    mockCallAi.mockResolvedValueOnce(aiOk({
      intent_type: 'COORDINATE_BATCH_OPERATION',
      steps: [
        { step_index: 0, step_type: 'VERIFY', skill_id: null },
        { step_index: 1, step_type: 'NOTIFICATION', skill_id: null },
      ],
    }));
    const result = await buildPlanFromDescription({ description: 'verify then notify', context: BASE_CTX });
    expect(result.ok).toBe(true);
  });
});

describe('AI planner — output validation rejects unapproved values', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects unapproved intent_type', async () => {
    mockCallAi.mockResolvedValueOnce(aiOk({
      intent_type: 'DROP_EVERYTHING',
      steps: [{ step_index: 0, step_type: 'SKILL', skill_id: 'utility.prompt.optimize' }],
    }));
    const result = await buildPlanFromDescription({ description: 'bad', context: BASE_CTX });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unapproved intent_type/);
  });

  it('rejects unapproved step_type', async () => {
    mockCallAi.mockResolvedValueOnce(aiOk({
      intent_type: 'ROUTE_APPROVAL',
      steps: [{ step_index: 0, step_type: 'EXEC_SQL', skill_id: null }],
    }));
    const result = await buildPlanFromDescription({ description: 'bad', context: BASE_CTX });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unapproved step_type/);
  });

  it('rejects unapproved skill_id on SKILL step', async () => {
    mockCallAi.mockResolvedValueOnce(aiOk({
      intent_type: 'OPTIMIZE_BRIEF_PROMPTS',
      steps: [{ step_index: 0, step_type: 'SKILL', skill_id: 'strategy.campaign.develop' }],
    }));
    const result = await buildPlanFromDescription({ description: 'bad', context: BASE_CTX });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unapproved skill_id/);
  });

  it('rejects skill_id on non-SKILL step', async () => {
    mockCallAi.mockResolvedValueOnce(aiOk({
      intent_type: 'ROUTE_APPROVAL',
      steps: [{ step_index: 0, step_type: 'HUMAN_GATE', skill_id: 'utility.prompt.optimize' }],
    }));
    const result = await buildPlanFromDescription({ description: 'bad', context: BASE_CTX });
    expect(result.ok).toBe(false);
  });

  it('rejects non-JSON output', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: 'Sure, here is your plan: ...' });
    const result = await buildPlanFromDescription({ description: 'bad', context: BASE_CTX });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/non-JSON/);
  });

  it('rejects empty steps array', async () => {
    mockCallAi.mockResolvedValueOnce(aiOk({ intent_type: 'ROUTE_APPROVAL', steps: [] }));
    const result = await buildPlanFromDescription({ description: 'bad', context: BASE_CTX });
    expect(result.ok).toBe(false);
  });

  it('propagates AI provider errors', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: false, error: 'AI provider error (status 529)', isTransient: true });
    const result = await buildPlanFromDescription({ description: 'test', context: BASE_CTX });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(true);
  });
});
