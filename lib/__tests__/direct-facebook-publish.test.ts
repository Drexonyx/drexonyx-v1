// Direct Facebook Publish agent unit tests.
// Verifies the 3-step plan shape and that no AI skills appear anywhere.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockDelegateSubTask } = vi.hoisted(() => ({
  mockDelegateSubTask: vi.fn(),
}));

vi.mock('@/lib/orchestration/delegation', () => ({
  delegateSubTask: mockDelegateSubTask,
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-uuid' }));

import { delegateDirectFacebookPublish } from '../agents/direct-facebook-publish';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE = {
  parentTaskId: null as string | null,
  organizationId: 'org-001',
  initiatedByUserId: 'user-001',
  initiatorRole: 'OWNER' as const,
  campaignId: 'camp-001',
  captionText: 'DREXONYX Studio — premium video production in Dubai.',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('delegateDirectFacebookPublish — authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'subtask-001' });
  });

  it('returns error for non-OWNER/ADMIN_OPERATIONS initiator role', async () => {
    const result = await delegateDirectFacebookPublish({
      ...BASE,
      initiatorRole: 'QC' as never,
    });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('OWNER or ADMIN_OPERATIONS') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('accepts OWNER as initiator role', async () => {
    const result = await delegateDirectFacebookPublish({ ...BASE, initiatorRole: 'OWNER' });
    expect(result).toMatchObject({ ok: true, subTaskId: 'subtask-001' });
  });

  it('accepts ADMIN_OPERATIONS as initiator role', async () => {
    const result = await delegateDirectFacebookPublish({ ...BASE, initiatorRole: 'ADMIN_OPERATIONS' });
    expect(result).toMatchObject({ ok: true, subTaskId: 'subtask-001' });
  });
});

describe('delegateDirectFacebookPublish — input validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'subtask-001' });
  });

  it('returns error when campaignId is empty', async () => {
    const result = await delegateDirectFacebookPublish({ ...BASE, campaignId: '' });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('campaignId') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('returns error when captionText is empty', async () => {
    const result = await delegateDirectFacebookPublish({ ...BASE, captionText: '' });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('captionText') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('returns error for unauthorized pageTarget', async () => {
    const result = await delegateDirectFacebookPublish({
      ...BASE,
      pageTarget: 'PAGE_EXTERNAL_HACK' as never,
    });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('not an authorized Facebook page') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('returns error when contentType is IMAGE and mediaUrl is absent', async () => {
    const result = await delegateDirectFacebookPublish({ ...BASE, contentType: 'IMAGE' });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('mediaUrl') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('returns error when contentType is VIDEO and mediaUrl is absent', async () => {
    const result = await delegateDirectFacebookPublish({ ...BASE, contentType: 'VIDEO' });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('mediaUrl') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('returns error when publishMode is SCHEDULED and scheduledAt is absent', async () => {
    const result = await delegateDirectFacebookPublish({ ...BASE, publishMode: 'SCHEDULED' });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('scheduledAt') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('returns error when scheduledAt is not a valid ISO 8601 date', async () => {
    const result = await delegateDirectFacebookPublish({
      ...BASE,
      publishMode: 'SCHEDULED',
      scheduledAt: 'not-a-date',
    });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('scheduledAt') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });
});

describe('delegateDirectFacebookPublish — plan shape (zero AI)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'subtask-001' });
  });

  it('plan has exactly 3 steps', async () => {
    await delegateDirectFacebookPublish(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const plan = call.plan as { steps: unknown[] };
    expect(plan.steps).toHaveLength(3);
  });

  it('plan contains NO AI skills (qc.script.review and qc.brand.alignment are absent)', async () => {
    await delegateDirectFacebookPublish(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const skillIds = steps.filter((s) => s.skill_id).map((s) => s.skill_id);
    expect(skillIds).not.toContain('qc.script.review');
    expect(skillIds).not.toContain('qc.brand.alignment');
  });

  it('plan contains NO HUMAN_GATE step', async () => {
    await delegateDirectFacebookPublish(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    expect(steps.every((s) => s.step_type !== 'HUMAN_GATE')).toBe(true);
  });

  it('step 0 is SKILL qc.facebook_policy.check', async () => {
    await delegateDirectFacebookPublish(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    expect(steps[0].step_type).toBe('SKILL');
    expect(steps[0].skill_id).toBe('qc.facebook_policy.check');
  });

  it('step 1 is SKILL facebook.page.publish', async () => {
    await delegateDirectFacebookPublish(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    expect(steps[1].step_type).toBe('SKILL');
    expect(steps[1].skill_id).toBe('facebook.page.publish');
  });

  it('step 2 is NOTIFICATION', async () => {
    await delegateDirectFacebookPublish(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    expect(steps[2].step_type).toBe('NOTIFICATION');
  });

  it('uses COORDINATE_MARKETING_CAMPAIGN intentType', async () => {
    await delegateDirectFacebookPublish(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    expect(call.intentType).toBe('COORDINATE_MARKETING_CAMPAIGN');
  });

  it('title identifies the path as a direct FB publish', async () => {
    await delegateDirectFacebookPublish(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    expect(call.title).toContain('Direct FB publish');
    expect(call.title).toContain(BASE.campaignId);
  });
});

describe('delegateDirectFacebookPublish — step inputs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'subtask-001' });
  });

  it('facebook_policy.check receives captionText as text', async () => {
    await delegateDirectFacebookPublish(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const input = steps[0].input as Record<string, unknown>;
    expect(input.text).toBe(BASE.captionText);
  });

  it('facebook_policy.check uses feed as default placement', async () => {
    await delegateDirectFacebookPublish(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const input = steps[0].input as Record<string, unknown>;
    expect(input.placement).toBe('feed');
  });

  it('facebook_policy.check propagates custom placement', async () => {
    await delegateDirectFacebookPublish({ ...BASE, placement: 'story' });
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const input = steps[0].input as Record<string, unknown>;
    expect(input.placement).toBe('story');
  });

  it('facebook_policy.check includes headline when provided', async () => {
    await delegateDirectFacebookPublish({ ...BASE, headline: 'Great Offer' });
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const input = steps[0].input as Record<string, unknown>;
    expect(input.headline).toBe('Great Offer');
  });

  it('facebook_policy.check omits headline when not provided', async () => {
    await delegateDirectFacebookPublish(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const input = steps[0].input as Record<string, unknown>;
    expect(input.headline).toBeUndefined();
  });

  it('publish step receives captionText as message', async () => {
    await delegateDirectFacebookPublish(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const input = steps[1].input as Record<string, unknown>;
    expect(input.message).toBe(BASE.captionText);
  });

  it('publish step includes campaignId', async () => {
    await delegateDirectFacebookPublish(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const input = steps[1].input as Record<string, unknown>;
    expect(input.campaignId).toBe(BASE.campaignId);
  });

  it('defaults pageTarget to PAGE_1', async () => {
    await delegateDirectFacebookPublish(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const input = steps[1].input as Record<string, unknown>;
    expect(input.pageTarget).toBe('PAGE_1');
  });

  it('passes PAGE_2 as pageTarget', async () => {
    await delegateDirectFacebookPublish({ ...BASE, pageTarget: 'PAGE_2' });
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const input = steps[1].input as Record<string, unknown>;
    expect(input.pageTarget).toBe('PAGE_2');
  });

  it('defaults contentType to TEXT', async () => {
    await delegateDirectFacebookPublish(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const input = steps[1].input as Record<string, unknown>;
    expect(input.contentType).toBe('TEXT');
  });

  it('defaults publishMode to IMMEDIATE', async () => {
    await delegateDirectFacebookPublish(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const input = steps[1].input as Record<string, unknown>;
    expect(input.publishMode).toBe('IMMEDIATE');
  });

  it('passes IMAGE contentType and mediaUrl to publish step', async () => {
    const mediaUrl = 'https://test.r2.cloudflarestorage.com/img.jpg';
    await delegateDirectFacebookPublish({ ...BASE, contentType: 'IMAGE', mediaUrl });
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const input = steps[1].input as Record<string, unknown>;
    expect(input.contentType).toBe('IMAGE');
    expect(input.mediaUrl).toBe(mediaUrl);
  });

  it('passes SCHEDULED publishMode and scheduledAt to publish step', async () => {
    const scheduledAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await delegateDirectFacebookPublish({ ...BASE, publishMode: 'SCHEDULED', scheduledAt });
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const input = steps[1].input as Record<string, unknown>;
    expect(input.publishMode).toBe('SCHEDULED');
    expect(input.scheduledAt).toBe(scheduledAt);
  });
});

describe('delegateDirectFacebookPublish — context and delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'subtask-001' });
  });

  it('sets campaign_id in default context', async () => {
    await delegateDirectFacebookPublish(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const ctx = call.context as Record<string, unknown>;
    expect(ctx.campaign_id).toBe(BASE.campaignId);
  });

  it('accepts and passes through custom context', async () => {
    const customContext = { campaign_id: 'camp-001', order_id: 'ord-999' };
    await delegateDirectFacebookPublish({ ...BASE, context: customContext });
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    expect(call.context).toEqual(customContext);
  });

  it('delegates successfully and returns subTaskId', async () => {
    const result = await delegateDirectFacebookPublish(BASE);
    expect(result).toMatchObject({ ok: true, subTaskId: 'subtask-001' });
    expect(mockDelegateSubTask).toHaveBeenCalledOnce();
  });

  it('propagates error from delegateSubTask', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: false, error: 'DB connection failed' });
    const result = await delegateDirectFacebookPublish(BASE);
    expect(result).toMatchObject({ ok: false, error: 'DB connection failed' });
  });

  it('passes parentTaskId to delegateSubTask', async () => {
    await delegateDirectFacebookPublish({ ...BASE, parentTaskId: 'parent-task-abc' });
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    expect(call.parentTaskId).toBe('parent-task-abc');
  });

  it('accepts null parentTaskId (admin-initiated)', async () => {
    await delegateDirectFacebookPublish({ ...BASE, parentTaskId: null });
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    expect(call.parentTaskId).toBeNull();
  });
});
