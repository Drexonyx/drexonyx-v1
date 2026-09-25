// DR 0124 + DR 0126: Marketing Campaign Specialist agent unit tests.
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

// BASE uses contentOwner: 'EXTERNAL' so all existing step-index assertions remain valid.
const BASE = {
  parentTaskId: 'task-001',
  organizationId: 'org-001',
  initiatedByUserId: 'user-001',
  initiatorRole: 'OWNER' as const,
  contentOwner: 'EXTERNAL' as const,
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

  it('returns error when contentType is IMAGE and mediaUrl is absent', async () => {
    const result = await delegateMarketingCampaign({ ...BASE, contentType: 'IMAGE' });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('mediaUrl') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('returns error when contentType is VIDEO and mediaUrl is absent', async () => {
    const result = await delegateMarketingCampaign({ ...BASE, contentType: 'VIDEO' });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('mediaUrl') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('returns error when publishMode is SCHEDULED and scheduledAt is absent', async () => {
    const result = await delegateMarketingCampaign({ ...BASE, publishMode: 'SCHEDULED' });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('scheduledAt') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('returns error when scheduledAt is not a valid date', async () => {
    const result = await delegateMarketingCampaign({
      ...BASE,
      publishMode: 'SCHEDULED',
      scheduledAt: 'not-a-date',
    });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('scheduledAt') });
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

  it('EXTERNAL plan has exactly 6 steps', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const plan = call.plan as { steps: unknown[] };
    expect(plan.steps).toHaveLength(6);
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

  it('step 4 is SKILL facebook.page.publish', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    expect(steps[4].step_type).toBe('SKILL');
    expect(steps[4].skill_id).toBe('facebook.page.publish');
  });

  it('step 5 is NOTIFICATION', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    expect(steps[5].step_type).toBe('NOTIFICATION');
  });

  // ─── EXTERNAL: human gate is required ────────────────────────────────────

  it('EXTERNAL plan includes exactly one HUMAN_GATE step', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const gates = steps.filter((s) => s.step_type === 'HUMAN_GATE');
    expect(gates.length).toBe(1);
  });

  it('EXTERNAL: facebook.page.publish step follows the HUMAN_GATE step', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const gateIdx = steps.findIndex((s) => s.step_type === 'HUMAN_GATE');
    expect(gateIdx).toBeGreaterThan(-1);
    expect(steps[gateIdx + 1].skill_id).toBe('facebook.page.publish');
  });

  // ─── New params — defaults ─────────────────────────────────────────────────

  it('defaults pageTarget to PAGE_1', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const publishInput = steps[4].input as Record<string, unknown>;
    expect(publishInput.pageTarget).toBe('PAGE_1');
  });

  it('defaults contentType to TEXT', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const publishInput = steps[4].input as Record<string, unknown>;
    expect(publishInput.contentType).toBe('TEXT');
  });

  it('defaults publishMode to IMMEDIATE', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const publishInput = steps[4].input as Record<string, unknown>;
    expect(publishInput.publishMode).toBe('IMMEDIATE');
  });

  // ─── New params — explicit values ─────────────────────────────────────────

  it('passes pageTarget PAGE_2 to publish step', async () => {
    await delegateMarketingCampaign({ ...BASE, pageTarget: 'PAGE_2' });
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const publishInput = steps[4].input as Record<string, unknown>;
    expect(publishInput.pageTarget).toBe('PAGE_2');
  });

  it('passes IMAGE contentType and mediaUrl to publish step', async () => {
    const mediaUrl = 'https://test.r2.cloudflarestorage.com/img.jpg';
    await delegateMarketingCampaign({ ...BASE, contentType: 'IMAGE', mediaUrl });
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const publishInput = steps[4].input as Record<string, unknown>;
    expect(publishInput.contentType).toBe('IMAGE');
    expect(publishInput.mediaUrl).toBe(mediaUrl);
  });

  it('passes SCHEDULED publishMode and scheduledAt to publish step', async () => {
    const scheduledAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await delegateMarketingCampaign({ ...BASE, publishMode: 'SCHEDULED', scheduledAt });
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const publishInput = steps[4].input as Record<string, unknown>;
    expect(publishInput.publishMode).toBe('SCHEDULED');
    expect(publishInput.scheduledAt).toBe(scheduledAt);
  });

  it('publish step input includes campaignId', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const publishInput = steps[4].input as Record<string, unknown>;
    expect(publishInput.campaignId).toBe(BASE.campaignId);
  });

  it('publish step input includes message (captionText)', async () => {
    await delegateMarketingCampaign(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const publishInput = steps[4].input as Record<string, unknown>;
    expect(publishInput.message).toBe(BASE.captionText);
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

// ─── contentOwner business rules ────────────────────────────────────────────

describe('contentOwner — DREXONYX autonomous publishing', () => {
  const DREX = { ...BASE, contentOwner: 'DREXONYX' as const };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'subtask-drex' });
  });

  // Test 1: DREXONYX content — autonomous publish allowed (no HUMAN_GATE)
  it('DREXONYX content: plan has 5 steps and no HUMAN_GATE', async () => {
    const result = await delegateMarketingCampaign({
      ...DREX,
      captionText: 'Introducing DREXONYX Studio — premium video production in Dubai.',
    });
    expect(result).toMatchObject({ ok: true });
    const steps = (mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>).plan as { steps: Record<string, unknown>[] };
    expect(steps.steps).toHaveLength(5);
    expect(steps.steps.every((s) => s.step_type !== 'HUMAN_GATE')).toBe(true);
  });

  // Test 2: DREXONYX promotional offer — autonomous publish allowed (no HUMAN_GATE)
  it('DREXONYX promotional offer: no HUMAN_GATE in plan', async () => {
    const result = await delegateMarketingCampaign({
      ...DREX,
      captionText: 'Limited-time offer: AED 499 starter package. Book now.',
    });
    expect(result).toMatchObject({ ok: true });
    const steps = (mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>).plan as { steps: Record<string, unknown>[] };
    const gates = steps.steps.filter((s) => s.step_type === 'HUMAN_GATE');
    expect(gates).toHaveLength(0);
  });

  // Test 3: DREXONYX campaign — autonomous publish allowed (no HUMAN_GATE)
  it('DREXONYX campaign: no HUMAN_GATE in plan, publish at step 3', async () => {
    const result = await delegateMarketingCampaign({
      ...DREX,
      captionText: 'Q4 campaign — DREXONYX corporate video packages now available.',
    });
    expect(result).toMatchObject({ ok: true });
    const steps = (mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>).plan as { steps: Record<string, unknown>[] };
    expect(steps.steps).toHaveLength(5);
    expect(steps.steps[3].step_type).toBe('SKILL');
    expect(steps.steps[3].skill_id).toBe('facebook.page.publish');
    expect(steps.steps[4].step_type).toBe('NOTIFICATION');
  });

  // Test 5a: Both authorized Facebook Pages — PAGE_1 autonomous publishing allowed
  it('DREXONYX with PAGE_1: autonomous publish allowed (no HUMAN_GATE)', async () => {
    const result = await delegateMarketingCampaign({ ...DREX, pageTarget: 'PAGE_1' });
    expect(result).toMatchObject({ ok: true });
    const steps = (mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>).plan as { steps: Record<string, unknown>[] };
    expect(steps.steps.every((s) => s.step_type !== 'HUMAN_GATE')).toBe(true);
    const publishInput = steps.steps[3].input as Record<string, unknown>;
    expect(publishInput.pageTarget).toBe('PAGE_1');
  });

  // Test 5b: Both authorized Facebook Pages — PAGE_2 autonomous publishing allowed
  it('DREXONYX with PAGE_2: autonomous publish allowed (no HUMAN_GATE)', async () => {
    const result = await delegateMarketingCampaign({ ...DREX, pageTarget: 'PAGE_2' });
    expect(result).toMatchObject({ ok: true });
    const steps = (mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>).plan as { steps: Record<string, unknown>[] };
    expect(steps.steps.every((s) => s.step_type !== 'HUMAN_GATE')).toBe(true);
    const publishInput = steps.steps[3].input as Record<string, unknown>;
    expect(publishInput.pageTarget).toBe('PAGE_2');
  });
});

describe('contentOwner — EXTERNAL requires HUMAN_GATE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'subtask-ext' });
  });

  // Test 4: External company/client content — HUMAN_GATE required
  it('EXTERNAL company content: HUMAN_GATE at step 3 with required roles', async () => {
    const result = await delegateMarketingCampaign({
      ...BASE,
      contentOwner: 'EXTERNAL',
      captionText: 'ClientCo announces their new product launch this November.',
    });
    expect(result).toMatchObject({ ok: true });
    const steps = (mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>).plan as { steps: Record<string, unknown>[] };
    expect(steps.steps).toHaveLength(6);
    const gate = steps.steps[3] as Record<string, unknown>;
    expect(gate.step_type).toBe('HUMAN_GATE');
    const gateInput = gate.input as Record<string, unknown>;
    expect(gateInput.requiredRoles).toContain('OWNER');
    expect(gateInput.requiredRoles).toContain('ADMIN_OPERATIONS');
  });
});

describe('contentOwner — page target validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'subtask-001' });
  });

  // Test 6: Any unauthorized page ID → rejected
  it('unauthorized pageTarget is rejected before delegation', async () => {
    const result = await delegateMarketingCampaign({
      ...BASE,
      pageTarget: 'PAGE_EXTERNAL_HACK' as never,
    });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('not an authorized Facebook page') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('invalid contentOwner value is rejected', async () => {
    const result = await delegateMarketingCampaign({
      ...BASE,
      contentOwner: 'UNKNOWN' as never,
    });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('contentOwner') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });
});
