import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDelegateSubTask } = vi.hoisted(() => ({
  mockDelegateSubTask: vi.fn(),
}));

vi.mock('@/lib/orchestration/delegation', () => ({
  delegateSubTask: mockDelegateSubTask,
}));

import {
  delegateLeadDiscovery,
  delegateLeadQualification,
  delegateOutreachDrafting,
  delegateFollowUpScheduling,
} from '../sales-discovery-specialist';

const BASE = {
  parentTaskId: 'parent-task-id',
  organizationId: 'org-1',
  initiatedByUserId: 'user-1',
  initiatorRole: 'ADMIN_OPERATIONS' as const,
};

beforeEach(() => vi.clearAllMocks());

// ── Role guard (shared across all 4 delegates) ────────────────────────────────

describe('role guard', () => {
  const invalidRoles = ['CREATIVE_PRODUCTION', 'QC', 'CLIENT', 'FINANCE'] as const;

  for (const role of invalidRoles) {
    it(`delegateLeadDiscovery rejects role ${role}`, async () => {
      const result = await delegateLeadDiscovery({
        ...BASE,
        // @ts-expect-error — testing runtime guard
        initiatorRole: role,
        rawData: 'data',
        primarySourcePlatform: 'instagram',
        sourceType: 'social_profile',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/OWNER|ADMIN_OPERATIONS/);
      expect(mockDelegateSubTask).not.toHaveBeenCalled();
    });

    it(`delegateLeadQualification rejects role ${role}`, async () => {
      const result = await delegateLeadQualification({
        ...BASE,
        // @ts-expect-error — testing runtime guard
        initiatorRole: role,
        leadId: 'lead-1',
        businessName: 'Acme',
      });
      expect(result.ok).toBe(false);
      expect(mockDelegateSubTask).not.toHaveBeenCalled();
    });

    it(`delegateOutreachDrafting rejects role ${role}`, async () => {
      const result = await delegateOutreachDrafting({
        ...BASE,
        // @ts-expect-error — testing runtime guard
        initiatorRole: role,
        leadId: 'lead-1',
        businessName: 'Acme',
        channel: 'email',
        messageType: 'cold_outreach',
      });
      expect(result.ok).toBe(false);
      expect(mockDelegateSubTask).not.toHaveBeenCalled();
    });

    it(`delegateFollowUpScheduling rejects role ${role}`, async () => {
      const result = await delegateFollowUpScheduling({
        ...BASE,
        // @ts-expect-error — testing runtime guard
        initiatorRole: role,
        leadId: 'lead-1',
        businessName: 'Acme',
      });
      expect(result.ok).toBe(false);
      expect(mockDelegateSubTask).not.toHaveBeenCalled();
    });
  }

  it('accepts OWNER role for all delegates', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    const ownerBase = { ...BASE, initiatorRole: 'OWNER' as const };

    await delegateLeadDiscovery({ ...ownerBase, rawData: 'data', primarySourcePlatform: 'instagram', sourceType: 'social_profile' as const });
    await delegateLeadQualification({ ...ownerBase, leadId: 'l1', businessName: 'Co' });
    await delegateOutreachDrafting({ ...ownerBase, leadId: 'l1', businessName: 'Co', channel: 'email', messageType: 'cold_outreach' as const });
    await delegateFollowUpScheduling({ ...ownerBase, leadId: 'l1', businessName: 'Co' });

    expect(mockDelegateSubTask).toHaveBeenCalledTimes(4);
  });
});

// ── delegateLeadDiscovery ─────────────────────────────────────────────────────

describe('delegateLeadDiscovery', () => {
  it('uses DISCOVER_SALES_LEAD intent type', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateLeadDiscovery({ ...BASE, rawData: 'data', primarySourcePlatform: 'instagram', sourceType: 'social_profile' });
    expect(mockDelegateSubTask).toHaveBeenCalledWith(expect.objectContaining({ intentType: 'DISCOVER_SALES_LEAD' }));
  });

  it('builds a 4-step plan: VERIFY → SKILL → STATUS_TRANSITION → NOTIFICATION', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateLeadDiscovery({ ...BASE, rawData: 'data', primarySourcePlatform: 'instagram', sourceType: 'social_profile' });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps).toHaveLength(4);
    expect(call.plan.steps[0].step_type).toBe('VERIFY');
    expect(call.plan.steps[1].step_type).toBe('SKILL');
    expect(call.plan.steps[2].step_type).toBe('STATUS_TRANSITION');
    expect(call.plan.steps[3].step_type).toBe('NOTIFICATION');
  });

  it('SKILL step uses sales.lead.discover skill_id', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateLeadDiscovery({ ...BASE, rawData: 'raw data here', primarySourcePlatform: 'instagram', sourceType: 'social_profile' });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[1].skill_id).toBe('sales.lead.discover');
    expect(call.plan.steps[1].input.rawData).toBe('raw data here');
  });

  it('STATUS_TRANSITION step targets sales_lead with NEW status', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateLeadDiscovery({ ...BASE, rawData: 'data', primarySourcePlatform: 'instagram', sourceType: 'social_profile' });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[2].input).toMatchObject({ entity_type: 'sales_lead', new_status: 'NEW' });
  });

  it('VERIFY step includes SALES_DEDUP check_type', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateLeadDiscovery({ ...BASE, rawData: 'data', primarySourcePlatform: 'instagram', sourceType: 'social_profile', dedupIdentifier: '@acme' });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].input.check_type).toBe('SALES_DEDUP');
    expect(call.plan.steps[0].input.platform).toBe('instagram');
    expect(call.plan.steps[0].input.identifier).toBe('@acme');
  });

  it('VERIFY step uses result:PASS when no dedupIdentifier provided', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateLeadDiscovery({ ...BASE, rawData: 'data', primarySourcePlatform: 'instagram', sourceType: 'social_profile' });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].input).toMatchObject({ result: 'PASS' });
  });

  it('returns subTaskId on success', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'disc-uuid' });
    const result = await delegateLeadDiscovery({ ...BASE, rawData: 'data', primarySourcePlatform: 'instagram', sourceType: 'social_profile' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.subTaskId).toBe('disc-uuid');
  });

  it('propagates delegation failure', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: false, error: 'DB error' });
    const result = await delegateLeadDiscovery({ ...BASE, rawData: 'data', primarySourcePlatform: 'instagram', sourceType: 'social_profile' });
    expect(result.ok).toBe(false);
  });
});

// ── delegateLeadQualification ─────────────────────────────────────────────────

describe('delegateLeadQualification', () => {
  it('uses QUALIFY_SALES_LEAD intent type', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateLeadQualification({ ...BASE, leadId: 'lead-1', businessName: 'Acme' });
    expect(mockDelegateSubTask).toHaveBeenCalledWith(expect.objectContaining({ intentType: 'QUALIFY_SALES_LEAD' }));
  });

  it('builds a 5-step plan: verify → score → qualify → STATUS_TRANSITION → NOTIFICATION', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateLeadQualification({ ...BASE, leadId: 'lead-1', businessName: 'Acme' });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps).toHaveLength(5);
    expect(call.plan.steps[0].skill_id).toBe('sales.lead.verify');
    expect(call.plan.steps[1].skill_id).toBe('sales.lead.score');
    expect(call.plan.steps[2].skill_id).toBe('sales.lead.qualify');
    expect(call.plan.steps[3].step_type).toBe('STATUS_TRANSITION');
    expect(call.plan.steps[4].step_type).toBe('NOTIFICATION');
  });

  it('STATUS_TRANSITION includes lead_id in entity_id', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateLeadQualification({ ...BASE, leadId: 'lead-xyz', businessName: 'Acme' });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[3].input.entity_id).toBe('lead-xyz');
  });
});

// ── delegateOutreachDrafting ──────────────────────────────────────────────────

describe('delegateOutreachDrafting', () => {
  it('uses DRAFT_SALES_OUTREACH intent type', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateOutreachDrafting({ ...BASE, leadId: 'lead-1', businessName: 'Acme', channel: 'email', messageType: 'cold_outreach' });
    expect(mockDelegateSubTask).toHaveBeenCalledWith(expect.objectContaining({ intentType: 'DRAFT_SALES_OUTREACH' }));
  });

  it('builds a 3-step plan: SKILL → STATUS_TRANSITION → NOTIFICATION', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateOutreachDrafting({ ...BASE, leadId: 'lead-1', businessName: 'Acme', channel: 'email', messageType: 'cold_outreach' });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps).toHaveLength(3);
    expect(call.plan.steps[0].step_type).toBe('SKILL');
    expect(call.plan.steps[1].step_type).toBe('STATUS_TRANSITION');
    expect(call.plan.steps[2].step_type).toBe('NOTIFICATION');
  });

  it('no HUMAN_GATE in plan — cold email outreach is auto-approved', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateOutreachDrafting({ ...BASE, leadId: 'lead-1', businessName: 'Acme', channel: 'email', messageType: 'cold_outreach' });

    const call = mockDelegateSubTask.mock.calls[0][0];
    const humanGate = call.plan.steps.find((s: { step_type: string }) => s.step_type === 'HUMAN_GATE');
    expect(humanGate).toBeUndefined();
  });

  it('SKILL step uses sales.outreach.draft and passes channel/messageType', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateOutreachDrafting({ ...BASE, leadId: 'lead-1', businessName: 'Acme', channel: 'email', messageType: 'proposal' });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].skill_id).toBe('sales.outreach.draft');
    expect(call.plan.steps[0].input.channel).toBe('email');
    expect(call.plan.steps[0].input.messageType).toBe('proposal');
  });
});

// ── delegateFollowUpScheduling ────────────────────────────────────────────────

describe('delegateFollowUpScheduling', () => {
  it('uses SCHEDULE_SALES_FOLLOWUP intent type', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateFollowUpScheduling({ ...BASE, leadId: 'lead-1', businessName: 'Acme' });
    expect(mockDelegateSubTask).toHaveBeenCalledWith(expect.objectContaining({ intentType: 'SCHEDULE_SALES_FOLLOWUP' }));
  });

  it('builds a 3-step plan: SKILL → STATUS_TRANSITION → NOTIFICATION', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateFollowUpScheduling({ ...BASE, leadId: 'lead-1', businessName: 'Acme' });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps).toHaveLength(3);
    expect(call.plan.steps[0].step_type).toBe('SKILL');
    expect(call.plan.steps[1].step_type).toBe('STATUS_TRANSITION');
    expect(call.plan.steps[2].step_type).toBe('NOTIFICATION');
  });

  it('SKILL step uses sales.lead.qualify', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateFollowUpScheduling({ ...BASE, leadId: 'lead-1', businessName: 'Acme' });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[0].skill_id).toBe('sales.lead.qualify');
  });

  it('STATUS_TRANSITION targets sales_followup with lead_id as entity_id', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateFollowUpScheduling({ ...BASE, leadId: 'lead-xyz', businessName: 'Acme' });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.steps[1].input).toMatchObject({
      entity_type: 'sales_followup',
      entity_id: 'lead-xyz',
    });
  });

  it('plan has generated_at ISO timestamp', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'sub-uuid' });
    await delegateFollowUpScheduling({ ...BASE, leadId: 'lead-1', businessName: 'Acme' });

    const call = mockDelegateSubTask.mock.calls[0][0];
    expect(call.plan.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
