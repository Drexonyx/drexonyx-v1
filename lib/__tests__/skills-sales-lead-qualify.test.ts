import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../skills/ai/adapter', () => ({ callAi: vi.fn() }));

import { callAi } from '../skills/ai/adapter';
import { salesLeadQualifySkill } from '../skills/sales/lead-qualify';
import type { SkillContext } from '../skills/interface';

const mockCallAi = vi.mocked(callAi);

const MOCK_CONTEXT: SkillContext = {
  organizationId: 'org-test',
  actorId: 'agent-test',
  actorType: 'AGENT',
  actorRole: 'ADMIN_OPERATIONS',
};

const VALID_OUTPUT = JSON.stringify({
  qualified: true,
  qualificationReason: 'High score fashion brand with clear video content need and active presence.',
  recommendedChannel: 'email',
  recommendedMessageType: 'cold_outreach',
});

beforeEach(() => vi.clearAllMocks());

describe('salesLeadQualifySkill', () => {
  it('has correct id, version, and family', () => {
    expect(salesLeadQualifySkill.id).toBe('sales.lead.qualify');
    expect(salesLeadQualifySkill.version).toBe('1.0.0');
    expect(salesLeadQualifySkill.family).toBe('SALES');
  });

  it('returns ok:true with parsed output on valid qualified response', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_OUTPUT });
    const result = await salesLeadQualifySkill.execute(
      { businessName: 'Acme Fashion', score: 82, verificationConfidence: 'HIGH' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.qualified).toBe(true);
      expect(result.output.recommendedChannel).toBe('email');
      expect(result.output.recommendedMessageType).toBe('cold_outreach');
    }
  });

  it('returns ok:true with qualified:false on rejection', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify({
      qualified: false,
      qualificationReason: 'Lead score too low and no clear service fit.',
      recommendedChannel: 'manual',
      recommendedMessageType: 'cold_outreach',
    }) });
    const result = await salesLeadQualifySkill.execute(
      { businessName: 'Weak Lead', score: 15 },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.qualified).toBe(false);
    }
  });

  it('returns ok:false when AI call fails (transient)', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: false, error: 'AI provider error (status 500)', isTransient: true });
    const result = await salesLeadQualifySkill.execute(
      { businessName: 'Acme' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.isTransient).toBe(true);
    }
  });

  it('returns ok:false when AI returns invalid JSON', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: 'not json' });
    const result = await salesLeadQualifySkill.execute(
      { businessName: 'Acme' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.isTransient).toBe(false);
      expect(result.error).toContain('LeadQualify:');
      expect(result.error).toContain('not valid JSON');
    }
  });

  it('returns ok:false when recommendedChannel is invalid', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify({
      qualified: true,
      qualificationReason: 'Good fit',
      recommendedChannel: 'twitter',
      recommendedMessageType: 'cold_outreach',
    }) });
    const result = await salesLeadQualifySkill.execute(
      { businessName: 'Acme' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('recommendedChannel');
    }
  });

  it('returns ok:false when recommendedMessageType is invalid', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify({
      qualified: true,
      qualificationReason: 'Good fit',
      recommendedChannel: 'email',
      recommendedMessageType: 'spam',
    }) });
    const result = await salesLeadQualifySkill.execute(
      { businessName: 'Acme' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('recommendedMessageType');
    }
  });

  it('makes exactly one callAi call per execute', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_OUTPUT });
    await salesLeadQualifySkill.execute(
      { businessName: 'Acme' },
      MOCK_CONTEXT,
    );
    expect(mockCallAi).toHaveBeenCalledOnce();
  });

  it('passes responseSchema to callAi', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_OUTPUT });
    await salesLeadQualifySkill.execute(
      { businessName: 'Acme' },
      MOCK_CONTEXT,
    );
    const call = mockCallAi.mock.calls[0][0] as { responseSchema?: unknown };
    expect(call.responseSchema).toBeDefined();
    expect(call.responseSchema).toMatchObject({ type: 'object' });
  });

  it('accepts all valid channel and message type combinations', async () => {
    const channels = ['email', 'instagram', 'whatsapp', 'linkedin', 'manual'] as const;
    const msgTypes = ['cold_outreach', 'follow_up', 'proposal'] as const;

    for (const channel of channels) {
      mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify({
        qualified: true,
        qualificationReason: 'Test',
        recommendedChannel: channel,
        recommendedMessageType: msgTypes[0],
      }) });
      const result = await salesLeadQualifySkill.execute({ businessName: 'Co' }, MOCK_CONTEXT);
      expect(result.ok).toBe(true);
    }

    for (const msgType of msgTypes) {
      mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify({
        qualified: true,
        qualificationReason: 'Test',
        recommendedChannel: channels[0],
        recommendedMessageType: msgType,
      }) });
      const result = await salesLeadQualifySkill.execute({ businessName: 'Co' }, MOCK_CONTEXT);
      expect(result.ok).toBe(true);
    }
  });
});
