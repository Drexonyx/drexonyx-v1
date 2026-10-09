import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../skills/ai/adapter', () => ({ callAi: vi.fn() }));

import { callAi } from '../skills/ai/adapter';
import { salesLeadScoreSkill } from '../skills/sales/lead-score';
import type { SkillContext } from '../skills/interface';

const mockCallAi = vi.mocked(callAi);

const MOCK_CONTEXT: SkillContext = {
  organizationId: 'org-test',
  actorId: 'agent-test',
  actorType: 'AGENT',
  actorRole: 'ADMIN_OPERATIONS',
};

const VALID_OUTPUT = JSON.stringify({
  score: 82,
  priority: 'HOT',
  reasoning: 'Fashion brand with strong Instagram presence and clear video content need.',
});

beforeEach(() => vi.clearAllMocks());

describe('salesLeadScoreSkill', () => {
  it('has correct id, version, and family', () => {
    expect(salesLeadScoreSkill.id).toBe('sales.lead.score');
    expect(salesLeadScoreSkill.version).toBe('1.0.0');
    expect(salesLeadScoreSkill.family).toBe('SALES');
  });

  it('returns ok:true with parsed output on valid response', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_OUTPUT });
    const result = await salesLeadScoreSkill.execute(
      { businessName: 'Acme Fashion', primarySourcePlatform: 'instagram' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.score).toBe(82);
      expect(result.output.priority).toBe('HOT');
      expect(typeof result.output.reasoning).toBe('string');
    }
  });

  it('returns ok:false when AI call fails (transient)', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: false, error: 'AI provider error (status 500)', isTransient: true });
    const result = await salesLeadScoreSkill.execute(
      { businessName: 'Acme', primarySourcePlatform: 'instagram' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.isTransient).toBe(true);
    }
  });

  it('returns ok:false when AI returns invalid JSON', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: 'not json' });
    const result = await salesLeadScoreSkill.execute(
      { businessName: 'Acme', primarySourcePlatform: 'instagram' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.isTransient).toBe(false);
      expect(result.error).toContain('LeadScore:');
      expect(result.error).toContain('not valid JSON');
    }
  });

  it('returns ok:false when score is out of range', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify({
      score: 150,
      priority: 'HOT',
      reasoning: 'Great lead',
    }) });
    const result = await salesLeadScoreSkill.execute(
      { businessName: 'Acme', primarySourcePlatform: 'instagram' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('score');
    }
  });

  it('returns ok:false when priority is invalid', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify({
      score: 80,
      priority: 'LUKEWARM',
      reasoning: 'Decent fit',
    }) });
    const result = await salesLeadScoreSkill.execute(
      { businessName: 'Acme', primarySourcePlatform: 'instagram' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('priority');
    }
  });

  it('makes exactly one callAi call per execute', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_OUTPUT });
    await salesLeadScoreSkill.execute(
      { businessName: 'Acme', primarySourcePlatform: 'instagram' },
      MOCK_CONTEXT,
    );
    expect(mockCallAi).toHaveBeenCalledOnce();
  });

  it('passes responseSchema to callAi', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_OUTPUT });
    await salesLeadScoreSkill.execute(
      { businessName: 'Acme', primarySourcePlatform: 'instagram' },
      MOCK_CONTEXT,
    );
    const call = mockCallAi.mock.calls[0][0] as { responseSchema?: unknown };
    expect(call.responseSchema).toBeDefined();
    expect(call.responseSchema).toMatchObject({ type: 'object' });
  });

  it('accepts all valid priority tiers', async () => {
    for (const [priority, score] of [['HOT', 80], ['WARM', 55], ['COLD', 20]] as const) {
      mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify({
        score,
        priority,
        reasoning: 'Test reasoning',
      }) });
      const result = await salesLeadScoreSkill.execute(
        { businessName: 'Test Co', primarySourcePlatform: 'website' },
        MOCK_CONTEXT,
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.output.priority).toBe(priority);
        expect(result.output.score).toBe(score);
      }
    }
  });

  it('includes optional fields in user prompt when provided', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_OUTPUT });
    await salesLeadScoreSkill.execute(
      {
        businessName: 'Acme',
        primarySourcePlatform: 'instagram',
        country: 'UAE',
        verificationConfidence: 'HIGH',
        opportunity: 'video reels',
        portfolioMatch: 'fashion reels',
      },
      MOCK_CONTEXT,
    );
    const call = mockCallAi.mock.calls[0][0] as { userPrompt: string };
    expect(call.userPrompt).toContain('UAE');
    expect(call.userPrompt).toContain('HIGH');
    expect(call.userPrompt).toContain('video reels');
  });
});
