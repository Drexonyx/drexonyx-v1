import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCallAi, mockStrategyExecute, mockCaptionExecute } = vi.hoisted(() => ({
  mockCallAi: vi.fn(),
  mockStrategyExecute: vi.fn(),
  mockCaptionExecute: vi.fn(),
}));

vi.mock('@/lib/skills/ai/adapter', () => ({ callAi: mockCallAi }));
vi.mock('@/lib/skills/strategy/campaign-develop', () => ({
  strategyCampaignDevelopSkill: { execute: mockStrategyExecute },
}));
vi.mock('@/lib/skills/script/social-caption', () => ({
  scriptSocialCaptionSkill: { execute: mockCaptionExecute },
}));

import { runAutonomousCampaignPreflight } from '../agents/autonomous-campaign';

const BASE_PARAMS = {
  brief: 'Promote our new video editing course targeting freelancers. Publish immediately.',
  organizationId: 'org-1',
  initiatedByUserId: 'user-1',
  initiatorRole: 'OWNER' as const,
};

const PARSED_BRIEF = {
  campaignName: 'Video Course Launch',
  campaignObjective: 'Promote video editing course',
  targetAudience: 'freelancers',
  tone: 'professional',
  pageTarget: 'PAGE_1',
  placement: 'feed',
  publishMode: 'IMMEDIATE',
  scheduledAt: null,
};

const STRATEGY_OUTPUT = {
  angles: ['Skills angle', 'Career growth angle'],
  themes: ['Professional development'],
  channels: ['Facebook'],
  keyMessages: ['Level up your editing skills', 'Join DREXONYX today'],
};

const CAPTION_OUTPUT = {
  caption: 'Ready to take your editing to the next level? Join the DREXONYX video course.',
  alternatives: ['Master video editing with DREXONYX'],
};

function aiOk(obj: unknown) {
  return { ok: true, text: JSON.stringify(obj) };
}

function aiOkFenced(obj: unknown) {
  return { ok: true, text: '```json\n' + JSON.stringify(obj, null, 2) + '\n```' };
}

function aiOkProse(obj: unknown) {
  return { ok: true, text: 'Here is the result:\n\n```json\n' + JSON.stringify(obj) + '\n```\n\nLet me know if you need anything else.' };
}

describe('runAutonomousCampaignPreflight — happy path', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns generated caption, headline, and derived publish params', async () => {
    mockCallAi.mockResolvedValueOnce(aiOk(PARSED_BRIEF));
    mockStrategyExecute.mockResolvedValueOnce({ ok: true, output: STRATEGY_OUTPUT });
    mockCaptionExecute.mockResolvedValueOnce({ ok: true, output: CAPTION_OUTPUT });

    const result = await runAutonomousCampaignPreflight(BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.captionText).toBe(CAPTION_OUTPUT.caption);
    expect(result.headline).toBe(CAPTION_OUTPUT.alternatives[0]);
    expect(result.campaignNameSuggestion).toBe(PARSED_BRIEF.campaignName);
    expect(result.pageTarget).toBe('PAGE_1');
    expect(result.placement).toBe('feed');
    expect(result.publishMode).toBe('IMMEDIATE');
    expect(result.scheduledAt).toBeUndefined();
    expect(result.strategyAngles).toEqual(STRATEGY_OUTPUT.angles);
    expect(result.strategyKeyMessages).toEqual(STRATEGY_OUTPUT.keyMessages);
  });

  it('parses brief returned inside markdown code fences', async () => {
    mockCallAi.mockResolvedValueOnce(aiOkFenced(PARSED_BRIEF));
    mockStrategyExecute.mockResolvedValueOnce({ ok: true, output: STRATEGY_OUTPUT });
    mockCaptionExecute.mockResolvedValueOnce({ ok: true, output: CAPTION_OUTPUT });

    const result = await runAutonomousCampaignPreflight(BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.campaignNameSuggestion).toBe(PARSED_BRIEF.campaignName);
  });

  it('parses brief returned with prose preamble and fenced JSON', async () => {
    mockCallAi.mockResolvedValueOnce(aiOkProse(PARSED_BRIEF));
    mockStrategyExecute.mockResolvedValueOnce({ ok: true, output: STRATEGY_OUTPUT });
    mockCaptionExecute.mockResolvedValueOnce({ ok: true, output: CAPTION_OUTPUT });

    const result = await runAutonomousCampaignPreflight(BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.campaignNameSuggestion).toBe(PARSED_BRIEF.campaignName);
  });

  it('passes first keyMessage to caption skill', async () => {
    mockCallAi.mockResolvedValueOnce(aiOk(PARSED_BRIEF));
    mockStrategyExecute.mockResolvedValueOnce({ ok: true, output: STRATEGY_OUTPUT });
    mockCaptionExecute.mockResolvedValueOnce({ ok: true, output: CAPTION_OUTPUT });

    await runAutonomousCampaignPreflight(BASE_PARAMS);

    const captionCall = mockCaptionExecute.mock.calls[0][0];
    expect(captionCall.keyMessage).toBe(STRATEGY_OUTPUT.keyMessages[0]);
    expect(captionCall.platform).toBe('Facebook');
  });

  it('derives SCHEDULED publishMode and scheduledAt from brief parser', async () => {
    const scheduledBrief = {
      ...PARSED_BRIEF,
      publishMode: 'SCHEDULED',
      scheduledAt: '2026-10-01T10:00:00.000Z',
    };
    mockCallAi.mockResolvedValueOnce(aiOk(scheduledBrief));
    mockStrategyExecute.mockResolvedValueOnce({ ok: true, output: STRATEGY_OUTPUT });
    mockCaptionExecute.mockResolvedValueOnce({ ok: true, output: CAPTION_OUTPUT });

    const result = await runAutonomousCampaignPreflight(BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.publishMode).toBe('SCHEDULED');
    expect(result.scheduledAt).toBe('2026-10-01T10:00:00.000Z');
  });

  it('downgrades SCHEDULED to IMMEDIATE when scheduledAt is missing', async () => {
    const briefNoDate = { ...PARSED_BRIEF, publishMode: 'SCHEDULED', scheduledAt: null };
    mockCallAi.mockResolvedValueOnce(aiOk(briefNoDate));
    mockStrategyExecute.mockResolvedValueOnce({ ok: true, output: STRATEGY_OUTPUT });
    mockCaptionExecute.mockResolvedValueOnce({ ok: true, output: CAPTION_OUTPUT });

    const result = await runAutonomousCampaignPreflight(BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.publishMode).toBe('IMMEDIATE');
    expect(result.scheduledAt).toBeUndefined();
  });

  it('downgrades SCHEDULED to IMMEDIATE when scheduledAt is not a valid ISO string', async () => {
    const briefBadDate = { ...PARSED_BRIEF, publishMode: 'SCHEDULED', scheduledAt: 'next Friday' };
    mockCallAi.mockResolvedValueOnce(aiOk(briefBadDate));
    mockStrategyExecute.mockResolvedValueOnce({ ok: true, output: STRATEGY_OUTPUT });
    mockCaptionExecute.mockResolvedValueOnce({ ok: true, output: CAPTION_OUTPUT });

    const result = await runAutonomousCampaignPreflight(BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.publishMode).toBe('IMMEDIATE');
    expect(result.scheduledAt).toBeUndefined();
  });

  it('falls back to objective as keyMessage when keyMessages is empty', async () => {
    const strategyNoKeys = { ...STRATEGY_OUTPUT, keyMessages: [] };
    mockCallAi.mockResolvedValueOnce(aiOk(PARSED_BRIEF));
    mockStrategyExecute.mockResolvedValueOnce({ ok: true, output: strategyNoKeys });
    mockCaptionExecute.mockResolvedValueOnce({ ok: true, output: CAPTION_OUTPUT });

    await runAutonomousCampaignPreflight(BASE_PARAMS);

    const captionCall = mockCaptionExecute.mock.calls[0][0];
    expect(captionCall.keyMessage).toBe(PARSED_BRIEF.campaignObjective);
  });
});

describe('runAutonomousCampaignPreflight — failure cases', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns ok:false when brief parsing AI call fails', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: false, error: 'Provider overloaded', isTransient: true });

    const result = await runAutonomousCampaignPreflight(BASE_PARAMS);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.isTransient).toBe(true);
    expect(result.error).toMatch(/Brief parsing failed/);
  });

  it('returns ok:false when brief parser returns unparseable output', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: 'here is your plan' });

    const result = await runAutonomousCampaignPreflight(BASE_PARAMS);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.isTransient).toBe(false);
  });

  it('returns ok:false when brief is missing objective', async () => {
    const incomplete = { ...PARSED_BRIEF, campaignObjective: '' };
    mockCallAi.mockResolvedValueOnce(aiOk(incomplete));

    const result = await runAutonomousCampaignPreflight(BASE_PARAMS);

    expect(result.ok).toBe(false);
  });

  it('returns ok:false when strategy skill fails', async () => {
    mockCallAi.mockResolvedValueOnce(aiOk(PARSED_BRIEF));
    mockStrategyExecute.mockResolvedValueOnce({ ok: false, error: 'Strategy failed', isTransient: false });

    const result = await runAutonomousCampaignPreflight(BASE_PARAMS);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Strategy generation failed/);
  });

  it('returns ok:false when caption skill fails', async () => {
    mockCallAi.mockResolvedValueOnce(aiOk(PARSED_BRIEF));
    mockStrategyExecute.mockResolvedValueOnce({ ok: true, output: STRATEGY_OUTPUT });
    mockCaptionExecute.mockResolvedValueOnce({ ok: false, error: 'Caption failed', isTransient: true });

    const result = await runAutonomousCampaignPreflight(BASE_PARAMS);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Caption generation failed/);
    expect(result.isTransient).toBe(true);
  });

  it('defaults pageTarget to PAGE_1 for invalid values', async () => {
    const badTarget = { ...PARSED_BRIEF, pageTarget: 'PAGE_99' };
    mockCallAi.mockResolvedValueOnce(aiOk(badTarget));
    mockStrategyExecute.mockResolvedValueOnce({ ok: true, output: STRATEGY_OUTPUT });
    mockCaptionExecute.mockResolvedValueOnce({ ok: true, output: CAPTION_OUTPUT });

    const result = await runAutonomousCampaignPreflight(BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pageTarget).toBe('PAGE_1');
  });

  it('defaults placement to feed for invalid values', async () => {
    const badPlacement = { ...PARSED_BRIEF, placement: 'billboard' };
    mockCallAi.mockResolvedValueOnce(aiOk(badPlacement));
    mockStrategyExecute.mockResolvedValueOnce({ ok: true, output: STRATEGY_OUTPUT });
    mockCaptionExecute.mockResolvedValueOnce({ ok: true, output: CAPTION_OUTPUT });

    const result = await runAutonomousCampaignPreflight(BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.placement).toBe('feed');
  });
});
