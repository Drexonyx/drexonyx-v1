import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCallAi } = vi.hoisted(() => ({ mockCallAi: vi.fn() }));

vi.mock('../skills/ai/adapter', () => ({ callAi: mockCallAi }));

import { scriptSocialCaptionSkill } from '../skills/script/social-caption';
import type { SkillContext } from '../skills/interface';

const CONTEXT: SkillContext = {
  organizationId: 'org-1',
  actorId: 'user-1',
  actorType: 'USER',
  actorRole: 'OWNER',
};

const INPUT = {
  platform: 'Facebook',
  objective: 'Promote video production services',
  tone: 'professional',
  keyMessage: 'DREXONYX delivers cinematic excellence',
};

const JSON_OUTPUT = {
  caption: 'Elevate your brand with DREXONYX.',
  alternatives: ['Your vision, our craft.', 'Cinematic excellence, every frame.'],
};

describe('scriptSocialCaptionSkill', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Happy path: JSON formats ────────────────────────────────────────────────

  it('returns caption and alternatives from direct JSON', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify(JSON_OUTPUT) });

    const result = await scriptSocialCaptionSkill.execute(INPUT, CONTEXT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.caption).toBe(JSON_OUTPUT.caption);
    expect(result.output.alternatives).toEqual(JSON_OUTPUT.alternatives);
  });

  it('parses JSON wrapped in markdown fences', async () => {
    const text = '```json\n' + JSON.stringify(JSON_OUTPUT) + '\n```';
    mockCallAi.mockResolvedValueOnce({ ok: true, text });

    const result = await scriptSocialCaptionSkill.execute(INPUT, CONTEXT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.caption).toBe(JSON_OUTPUT.caption);
  });

  it('parses JSON embedded in surrounding prose', async () => {
    const text = 'Here is your caption:\n' + JSON.stringify(JSON_OUTPUT) + '\nLet me know if you need changes.';
    mockCallAi.mockResolvedValueOnce({ ok: true, text });

    const result = await scriptSocialCaptionSkill.execute(INPUT, CONTEXT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.caption).toBe(JSON_OUTPUT.caption);
  });

  // ── Plain-text fallback (DR regression: "AI returned unparseable output") ──

  it('normalizes a plain-text caption when the model returns prose instead of JSON', async () => {
    const plainText =
      'Transform your vision into cinematic excellence with DREXONYX. ' +
      'Our expert team crafts compelling video narratives. #VideoProduction #DREXONYX';
    mockCallAi.mockResolvedValueOnce({ ok: true, text: plainText });

    const result = await scriptSocialCaptionSkill.execute(INPUT, CONTEXT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.caption).toBe(plainText);
    expect(result.output.alternatives).toEqual([]);
  });

  it('normalizes a multi-line plain-text caption', async () => {
    const plainText =
      'Ready to elevate your brand?\n\nDREXONYX delivers cinematic storytelling that captivates audiences.\n#VideoProduction';
    mockCallAi.mockResolvedValueOnce({ ok: true, text: plainText });

    const result = await scriptSocialCaptionSkill.execute(INPUT, CONTEXT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.caption).toBe(plainText.trim());
    expect(result.output.alternatives).toEqual([]);
  });

  // ── Failure cases ───────────────────────────────────────────────────────────

  it('returns ok:false when the AI call itself fails', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: false, error: 'Provider error', isTransient: true });

    const result = await scriptSocialCaptionSkill.execute(INPUT, CONTEXT);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.isTransient).toBe(true);
    expect(result.error).toBe('Provider error');
  });

  it('returns ok:false for whitespace-only response', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: '   \n   ' });

    const result = await scriptSocialCaptionSkill.execute(INPUT, CONTEXT);

    expect(result.ok).toBe(false);
  });

  // ── Contract checks ─────────────────────────────────────────────────────────

  it('passes maxTokens: 512 to the AI adapter', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify(JSON_OUTPUT) });

    await scriptSocialCaptionSkill.execute(INPUT, CONTEXT);

    const call = mockCallAi.mock.calls[0][0] as { maxTokens?: number };
    expect(call.maxTokens).toBe(512);
  });

  it('includes optional hashtags in the user prompt when provided', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify(JSON_OUTPUT) });

    await scriptSocialCaptionSkill.execute(
      { ...INPUT, hashtags: ['#VideoProduction', '#DREXONYX'] },
      CONTEXT,
    );

    const call = mockCallAi.mock.calls[0][0] as { userPrompt: string };
    expect(call.userPrompt).toContain('#VideoProduction');
  });
});
