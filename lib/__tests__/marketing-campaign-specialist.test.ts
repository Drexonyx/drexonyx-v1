// DR 0124: Marketing Campaign Specialist agent unit tests.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockDelegateSubTask } = vi.hoisted(() => ({
  mockDelegateSubTask: vi.fn(),
}));

vi.mock('@/lib/orchestration/delegation', () => ({
  delegateSubTask: mockDelegateSubTask,
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-uuid' }));

import { delegateMarketingCampaign } from '../agents/marketing-campaign-specialist';

const BASE = {
  parentTaskId: 'task-001',
  organizationId: 'org-001',
  initiatedByUserId: 'user-001',
  initiatorRole: 'OWNER' as const,
  campaignId: 'camp-001',
  captionText: 'Check out our amazing new product line! Quality you can trust.',
};

describe('delegateMarketingCampaign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'subtask-001' });
  });

  // ─── Authorization ────────────────────────────────────────────────────────

  it('returns error for non-OWNER/ADMIN_OPERATIONS initiator role', async () => {
    const result = await delegateMarketingCampaign({
      ...BASE,
      initiatorRole: 'QC' as never,
    });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('OWNER or ADMIN_OPERATIONS') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('accepts ADMIN_OPERATIONS as initiator role', async () => {
    const result = await delegateMarketingCampaign({
      ...BASE,
      initiatorRole: 'ADMIN_OPERATIONS',
    });
    expect(result).toMatchObject({ ok: true, subTaskId: 'subtask-001' });
  });

  // ─── Input validation ────────────────────────────────────────────────────

  it('returns error when campaignId is empty', async () => {
    const result = await delegateMarketingCampaign({ ...BASE, campaignId: '' });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('campaignId') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('returns error when captionText is empty', async () => {
    const result = await delegateMarketingCampaign({ ...BASE, captionText: '' });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('captionText') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  // ─── Happy path ───────────────────────────────────────────────────────────

  it('delegates successfully and returns subTaskId', async () => {
    const result = await delegateMarketingCampaign(BASE);
    expect(result).toMatchObject({ ok: true, subTaskId: 'subtask-001' });
    expect(mockDelegateSubTask).toHaveBeenCalledOnce();
  });

  it('uses COORDINATE_MARKETING_CAMPAIGN intentType', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    expect(call.intentType).toBe('COORDINATE_MARKETING_CAMPAIGN');
  });

  it('plan has exactly 5 steps', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const plan = call.plan as { steps: unknown[] };
    expect(plan.steps).toHaveLength(5);
  });

  it('step 0 is SKILL qc.script.review', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    expect(steps[0].step_type).toBe('SKILL');
    expect(steps[0].skill_id).toBe('qc.script.review');
  });

  it('step 1 is SKILL qc.brand.alignment', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    expect(steps[1].step_type).toBe('SKILL');
    expect(steps[1].skill_id).toBe('qc.brand.alignment');
  });

  it('step 2 is SKILL qc.facebook_policy.check', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    expect(steps[2].step_type).toBe('SKILL');
    expect(steps[2].skill_id).toBe('qc.facebook_policy.check');
  });

  it('step 3 is HUMAN_GATE with OWNER and ADMIN_OPERATIONS as required roles', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const step3 = steps[3] as Record<string, unknown>;
    expect(step3.step_type).toBe('HUMAN_GATE');
    const input = step3.input as Record<string, unknown>;
    expect(input.requiredRoles).toContain('OWNER');
    expect(input.requiredRoles).toContain('ADMIN_OPERATIONS');
  });

  it('step 4 is NOTIFICATION', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    expect(steps[4].step_type).toBe('NOTIFICATION');
  });

  // ─── Human gate is mandatory ──────────────────────────────────────────────

  it('plan always includes a HUMAN_GATE step (no skip path)', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const gates = steps.filter((s) => s.step_type === 'HUMAN_GATE');
    expect(gates.length).toBe(1);
  });

  // ─── Context ──────────────────────────────────────────────────────────────

  it('sets campaign_id in default context', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const ctx = call.context as Record<string, unknown>;
    expect(ctx.campaign_id).toBe(BASE.campaignId);
  });

  it('accepts and passes through custom context', async () => {
    const customContext = { campaign_id: 'camp-001', order_id: 'ord-999' };
    await delegateMarketingCampaign({ ...BASE, context: customContext });
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    expect(call.context).toEqual(customContext);
  });

  // ─── Optional fields ──────────────────────────────────────────────────────

  it('includes headline in facebook_policy.check input when provided', async () => {
    await delegateMarketingCampaign({ ...BASE, headline: 'Great Products' });
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const step2input = steps[2].input as Record<string, unknown>;
    expect(step2input.headline).toBe('Great Products');
  });

  it('omits headline from facebook_policy.check input when not provided', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const step2input = steps[2].input as Record<string, unknown>;
    expect(step2input.headline).toBeUndefined();
  });

  it('uses feed as default placement', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const step2input = steps[2].input as Record<string, unknown>;
    expect(step2input.placement).toBe('feed');
  });

  it('propagates custom placement to facebook_policy.check', async () => {
    await delegateMarketingCampaign({ ...BASE, placement: 'story' });
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const step2input = steps[2].input as Record<string, unknown>;
    expect(step2input.placement).toBe('story');
  });

  // ─── Delegation failure propagation ──────────────────────────────────────

  it('propagates error from delegateSubTask', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: false, error: 'DB connection failed' });
    const result = await delegateMarketingCampaign(BASE);
    expect(result).toMatchObject({ ok: false, error: 'DB connection failed' });
  });
});
