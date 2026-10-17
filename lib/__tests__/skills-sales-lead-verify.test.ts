import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../skills/ai/adapter', () => ({ callAi: vi.fn() }));

import { callAi } from '../skills/ai/adapter';
import { salesLeadVerifySkill } from '../skills/sales/lead-verify';
import type { SkillContext } from '../skills/interface';

const mockCallAi = vi.mocked(callAi);

const MOCK_CONTEXT: SkillContext = {
  organizationId: 'org-test',
  actorId: 'agent-test',
  actorType: 'AGENT',
  actorRole: 'ADMIN_OPERATIONS',
};

const VALID_OUTPUT = JSON.stringify({
  confidence: 'HIGH',
  verificationNotes: 'Active Instagram presence with 50k followers and regular posts.',
  isActive: true,
  suggestedCategory: 'fashion brand',
});

beforeEach(() => vi.clearAllMocks());

describe('salesLeadVerifySkill', () => {
  it('has correct id, version, and family', () => {
    expect(salesLeadVerifySkill.id).toBe('sales.lead.verify');
    expect(salesLeadVerifySkill.version).toBe('1.0.0');
    expect(salesLeadVerifySkill.family).toBe('SALES');
  });

  it('returns ok:true with parsed output on valid response', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_OUTPUT });
    const result = await salesLeadVerifySkill.execute(
      { businessName: 'Acme Fashion', primarySourcePlatform: 'instagram' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.confidence).toBe('HIGH');
      expect(result.output.isActive).toBe(true);
      expect(result.output.suggestedCategory).toBe('fashion brand');
    }
  });

  it('returns ok:false when AI call fails (transient)', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: false, error: 'AI provider error (status 500)', isTransient: true });
    const result = await salesLeadVerifySkill.execute(
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
    const result = await salesLeadVerifySkill.execute(
      { businessName: 'Acme', primarySourcePlatform: 'instagram' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.isTransient).toBe(false);
      expect(result.error).toContain('LeadVerify:');
      expect(result.error).toContain('not valid JSON');
    }
  });

  it('returns ok:false when confidence value is invalid', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify({
      confidence: 'VERY_HIGH',
      verificationNotes: 'Active',
      isActive: true,
      suggestedCategory: 'fashion',
    }) });
    const result = await salesLeadVerifySkill.execute(
      { businessName: 'Acme', primarySourcePlatform: 'instagram' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('confidence');
    }
  });

  it('makes exactly one callAi call per execute', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_OUTPUT });
    await salesLeadVerifySkill.execute(
      { businessName: 'Acme', primarySourcePlatform: 'instagram' },
      MOCK_CONTEXT,
    );
    expect(mockCallAi).toHaveBeenCalledOnce();
  });

  it('includes primarySourceUrl in user prompt when provided', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_OUTPUT });
    await salesLeadVerifySkill.execute(
      {
        businessName: 'Acme',
        primarySourcePlatform: 'instagram',
        primarySourceUrl: 'https://instagram.com/acme',
      },
      MOCK_CONTEXT,
    );
    const call = mockCallAi.mock.calls[0][0] as { userPrompt: string };
    expect(call.userPrompt).toContain('https://instagram.com/acme');
  });

  it('passes responseSchema to callAi', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_OUTPUT });
    await salesLeadVerifySkill.execute(
      { businessName: 'Acme', primarySourcePlatform: 'instagram' },
      MOCK_CONTEXT,
    );
    const call = mockCallAi.mock.calls[0][0] as { responseSchema?: unknown };
    expect(call.responseSchema).toBeDefined();
    expect(call.responseSchema).toMatchObject({ type: 'object' });
  });

  it('accepts MEDIUM and LOW confidence values', async () => {
    for (const confidence of ['MEDIUM', 'LOW'] as const) {
      mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify({
        confidence,
        verificationNotes: 'Limited info available.',
        isActive: false,
        suggestedCategory: 'unknown',
      }) });
      const result = await salesLeadVerifySkill.execute(
        { businessName: 'Test Co', primarySourcePlatform: 'website' },
        MOCK_CONTEXT,
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.output.confidence).toBe(confidence);
      }
    }
  });
});
