import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../skills/ai/adapter', () => ({ callAi: vi.fn() }));
vi.mock('@/lib/sales/queries', () => ({
  getApprovalPolicy: vi.fn(),
}));

import { callAi } from '../skills/ai/adapter';
import { getApprovalPolicy } from '@/lib/sales/queries';
import { salesOutreachDraftSkill } from '../skills/sales/outreach-draft';
import type { SkillContext } from '../skills/interface';

const mockCallAi = vi.mocked(callAi);
const mockGetApprovalPolicy = vi.mocked(getApprovalPolicy);

const MOCK_CONTEXT: SkillContext = {
  organizationId: 'org-test',
  actorId: 'agent-test',
  actorType: 'AGENT',
  actorRole: 'ADMIN_OPERATIONS',
};

const VALID_AI_OUTPUT = JSON.stringify({
  messageText: 'Hi Acme Fashion, we loved your Instagram presence and would love to help with video content.',
  hasDiscount: false,
  hasPricingOffer: false,
  hasContractualCommitment: false,
  isSensitiveContent: false,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetApprovalPolicy.mockReturnValue('NOT_REQUIRED');
});

describe('salesOutreachDraftSkill', () => {
  it('has correct id, version, and family', () => {
    expect(salesOutreachDraftSkill.id).toBe('sales.outreach.draft');
    expect(salesOutreachDraftSkill.version).toBe('1.0.0');
    expect(salesOutreachDraftSkill.family).toBe('SALES');
  });

  it('returns ok:true with approvalStatus NOT_REQUIRED for low-risk email cold_outreach', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_AI_OUTPUT });
    mockGetApprovalPolicy.mockReturnValue('NOT_REQUIRED');
    const result = await salesOutreachDraftSkill.execute(
      { businessName: 'Acme Fashion', channel: 'email', messageType: 'cold_outreach' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.approvalStatus).toBe('NOT_REQUIRED');
      expect(result.output.approvalType).toBeUndefined();
      expect(typeof result.output.messageText).toBe('string');
      expect(result.output.messageText.length).toBeGreaterThan(0);
    }
  });

  it('returns ok:true with approvalStatus PENDING and approvalType OUTREACH for high-risk channel', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_AI_OUTPUT });
    mockGetApprovalPolicy.mockReturnValue('PENDING');
    const result = await salesOutreachDraftSkill.execute(
      { businessName: 'Acme', channel: 'instagram', messageType: 'cold_outreach' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.approvalStatus).toBe('PENDING');
      expect(result.output.approvalType).toBe('OUTREACH');
    }
  });

  it('returns approvalType PROPOSAL when messageType is proposal', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_AI_OUTPUT });
    mockGetApprovalPolicy.mockReturnValue('PENDING');
    const result = await salesOutreachDraftSkill.execute(
      { businessName: 'Acme', channel: 'email', messageType: 'proposal' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.approvalType).toBe('PROPOSAL');
    }
  });

  it('returns approvalType SENSITIVE_CONTENT when isSensitiveContent is true', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify({
      messageText: 'Some sensitive message text here.',
      hasDiscount: false,
      hasPricingOffer: false,
      hasContractualCommitment: false,
      isSensitiveContent: true,
    }) });
    mockGetApprovalPolicy.mockReturnValue('PENDING');
    const result = await salesOutreachDraftSkill.execute(
      { businessName: 'Acme', channel: 'email', messageType: 'follow_up' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.approvalType).toBe('SENSITIVE_CONTENT');
    }
  });

  it('returns ok:false when AI call fails (transient)', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: false, error: 'AI provider error (status 500)', isTransient: true });
    const result = await salesOutreachDraftSkill.execute(
      { businessName: 'Acme', channel: 'email', messageType: 'cold_outreach' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.isTransient).toBe(true);
    }
  });

  it('returns ok:false when AI returns invalid JSON', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: 'not json' });
    const result = await salesOutreachDraftSkill.execute(
      { businessName: 'Acme', channel: 'email', messageType: 'cold_outreach' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.isTransient).toBe(false);
      expect(result.error).toContain('OutreachDraft:');
      expect(result.error).toContain('not valid JSON');
    }
  });

  it('returns ok:false when messageText is missing', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify({
      hasDiscount: false,
      hasPricingOffer: false,
      hasContractualCommitment: false,
      isSensitiveContent: false,
    }) });
    const result = await salesOutreachDraftSkill.execute(
      { businessName: 'Acme', channel: 'email', messageType: 'cold_outreach' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('messageText');
    }
  });

  it('makes exactly one callAi call per execute (DR 0128 §2.6)', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_AI_OUTPUT });
    await salesOutreachDraftSkill.execute(
      { businessName: 'Acme', channel: 'email', messageType: 'cold_outreach' },
      MOCK_CONTEXT,
    );
    expect(mockCallAi).toHaveBeenCalledOnce();
  });

  it('passes responseSchema to callAi', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: VALID_AI_OUTPUT });
    await salesOutreachDraftSkill.execute(
      { businessName: 'Acme', channel: 'email', messageType: 'cold_outreach' },
      MOCK_CONTEXT,
    );
    const call = mockCallAi.mock.calls[0][0] as { responseSchema?: unknown };
    expect(call.responseSchema).toBeDefined();
    expect(call.responseSchema).toMatchObject({ type: 'object' });
  });

  it('calls getApprovalPolicy with correct risk flags from AI output', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify({
      messageText: 'Message with 20% discount.',
      hasDiscount: true,
      hasPricingOffer: true,
      hasContractualCommitment: false,
      isSensitiveContent: false,
    }) });
    mockGetApprovalPolicy.mockReturnValue('PENDING');
    await salesOutreachDraftSkill.execute(
      { businessName: 'Acme', channel: 'email', messageType: 'cold_outreach' },
      MOCK_CONTEXT,
    );
    expect(mockGetApprovalPolicy).toHaveBeenCalledWith(expect.objectContaining({
      hasDiscount: true,
      hasPricingOffer: true,
    }));
  });

  it('reflects all boolean risk flags in output', async () => {
    mockCallAi.mockResolvedValueOnce({ ok: true, text: JSON.stringify({
      messageText: 'Message text',
      hasDiscount: true,
      hasPricingOffer: true,
      hasContractualCommitment: true,
      isSensitiveContent: true,
    }) });
    mockGetApprovalPolicy.mockReturnValue('PENDING');
    const result = await salesOutreachDraftSkill.execute(
      { businessName: 'Acme', channel: 'email', messageType: 'cold_outreach' },
      MOCK_CONTEXT,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.hasDiscount).toBe(true);
      expect(result.output.hasPricingOffer).toBe(true);
      expect(result.output.hasContractualCommitment).toBe(true);
      expect(result.output.isSensitiveContent).toBe(true);
    }
  });
});
