import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../skills/ai/adapter', () => ({ callAi: vi.fn() }));

import { callAi } from '../skills/ai/adapter';
import { salesLeadDiscoverSkill } from '../skills/sales/lead-discover';
import type { SkillContext } from '../skills/interface';

const mockCallAi = vi.mocked(callAi);

const MOCK_CONTEXT: SkillContext = {
  organizationId: 'org-test',
  actorId: 'agent-test',
  actorType: 'AGENT',
  actorRole: 'ADMIN_OPERATIONS',
};

const VALID_OUTPUT = JSON.stringify({
  businessName: 'Acme Fashion',
  fullName: 'Sarah Johnson',
  country: 'UAE',
  city: 'Dubai',
  website: 'https://acmefashion.ae',
  publicEmail: 'hello@acmefashion.ae',
  publicContactMethod: 'DM on Instagram',
  opportunity: 'Video content for product launches',
  portfolioMatch: 'fashion brand reels',
  notes: 'Very active on Instagram with 50k followers',
});

beforeEach(() => vi.clearAllMocks());

describe('salesLeadDiscoverSkill', () => {
  it('has correct id, version, and family', () => {
    expect(salesLeadDiscoverSkill.id).toBe('sales.lead.discover');
    expect(salesLeadDiscoverSkill.version).toBe('1.0.0');
    expect(salesLeadDiscoverSkill.family).toBe('SALES');
  });

  it('returns ok:true with parsed output on valid response', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_OUTPUT });
    const result = await salesLeadDiscoverSkill.execute(
      { rawData: 'Acme Fashion @acmefashion_ae Dubai', primarySourcePlatform: 'instagram', sourceType: 'social_profile' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.businessName).toBe('Acme Fashion');
      expect(result.output.country).toBe('UAE');
      expect(result.output.opportunity).toBe('Video content for product launches');
    }
  });

  it('returns ok:false when AI call fails (transient)', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: false, error: 'AI provider error (status 500)', isTransient: true });
    const result = await salesLeadDiscoverSkill.execute(
      { rawData: 'some data', primarySourcePlatform: 'instagram', sourceType: 'social_profile' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.isTransient).toBe(true);
    }
  });

  it('returns ok:false when AI returns invalid JSON', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: 'not json' });
    const result = await salesLeadDiscoverSkill.execute(
      { rawData: 'some data', primarySourcePlatform: 'instagram', sourceType: 'social_profile' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.isTransient).toBe(false);
      expect(result.error).toContain('LeadDiscover:');
      expect(result.error).toContain('not valid JSON');
    }
  });

  it('returns ok:false when businessName is missing', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify({ fullName: 'Jane' }) });
    const result = await salesLeadDiscoverSkill.execute(
      { rawData: 'some data', primarySourcePlatform: 'instagram', sourceType: 'social_profile' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('businessName');
    }
  });

  it('makes exactly one callAi call per execute (DR 0073 §2.6)', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_OUTPUT });
    await salesLeadDiscoverSkill.execute(
      { rawData: 'data', primarySourcePlatform: 'instagram', sourceType: 'social_profile' },
      MOCK_CONTEXT,
    );
    expect(mockCallAi).toHaveBeenCalledOnce();
  });

  it('includes primarySourceUrl in user prompt when provided', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_OUTPUT });
    await salesLeadDiscoverSkill.execute(
      {
        rawData: 'data',
        primarySourcePlatform: 'instagram',
        primarySourceUrl: 'https://instagram.com/acme',
        sourceType: 'social_profile',
      },
      MOCK_CONTEXT,
    );
    const call = mockCallAi.mock.calls[0][0] as { userPrompt: string };
    expect(call.userPrompt).toContain('https://instagram.com/acme');
  });

  it('handles optional fields as undefined in output when null in response', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify({
      businessName: 'Test Co',
      fullName: null,
      country: null,
    }) });
    const result = await salesLeadDiscoverSkill.execute(
      { rawData: 'data', primarySourcePlatform: 'website', sourceType: 'website' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.fullName).toBeUndefined();
      expect(result.output.country).toBeUndefined();
    }
  });

  it('passes responseSchema to callAi', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_OUTPUT });
    await salesLeadDiscoverSkill.execute(
      { rawData: 'data', primarySourcePlatform: 'instagram', sourceType: 'social_profile' },
      MOCK_CONTEXT,
    );
    const call = mockCallAi.mock.calls[0][0] as { responseSchema?: unknown };
    expect(call.responseSchema).toBeDefined();
    expect(call.responseSchema).toMatchObject({ type: 'object' });
  });
});
