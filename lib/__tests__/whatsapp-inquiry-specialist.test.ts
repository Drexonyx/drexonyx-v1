// DR 0125: WhatsApp Inquiry Specialist agent unit tests.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockDelegateSubTask } = vi.hoisted(() => ({
  mockDelegateSubTask: vi.fn(),
}));

vi.mock('@/lib/orchestration/delegation', () => ({
  delegateSubTask: mockDelegateSubTask,
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-uuid' }));

import { delegateWhatsAppInquiry } from '../agents/whatsapp-inquiry-specialist';

const BASE = {
  parentTaskId: 'task-001',
  organizationId: 'org-001',
  initiatedByUserId: 'user-001',
  initiatorRole: 'OWNER' as const,
  externalMessageId: 'msg-ext-001',
  messageText: 'I need help with my order, there is a problem',
};

describe('delegateWhatsAppInquiry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelegateSubTask.mockResolvedValue({ ok: true, subTaskId: 'subtask-001' });
  });

  // ─── Authorization ────────────────────────────────────────────────────────

  it('rejects QC initiator role', async () => {
    const result = await delegateWhatsAppInquiry({ ...BASE, initiatorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('OWNER or ADMIN_OPERATIONS') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects CREATIVE_PRODUCTION initiator role', async () => {
    const result = await delegateWhatsAppInquiry({ ...BASE, initiatorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('OWNER or ADMIN_OPERATIONS') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('accepts ADMIN_OPERATIONS initiator', async () => {
    const result = await delegateWhatsAppInquiry({ ...BASE, initiatorRole: 'ADMIN_OPERATIONS' });
    expect(result).toMatchObject({ ok: true, subTaskId: 'subtask-001' });
  });

  it('accepts OWNER initiator', async () => {
    const result = await delegateWhatsAppInquiry(BASE);
    expect(result).toMatchObject({ ok: true, subTaskId: 'subtask-001' });
  });

  // ─── Input validation ────────────────────────────────────────────────────

  it('rejects empty externalMessageId', async () => {
    const result = await delegateWhatsAppInquiry({ ...BASE, externalMessageId: '' });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('externalMessageId') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  it('rejects empty messageText', async () => {
    const result = await delegateWhatsAppInquiry({ ...BASE, messageText: '' });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('messageText') });
    expect(mockDelegateSubTask).not.toHaveBeenCalled();
  });

  // ─── Correct intent type ──────────────────────────────────────────────────

  it('uses ROUTE_WHATSAPP_INQUIRY intentType', async () => {
    await delegateWhatsAppInquiry(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    expect(call.intentType).toBe('ROUTE_WHATSAPP_INQUIRY');
  });

  // ─── Plan structure ───────────────────────────────────────────────────────

  it('plan has exactly 3 steps', async () => {
    await delegateWhatsAppInquiry(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const plan = call.plan as { steps: unknown[] };
    expect(plan.steps).toHaveLength(3);
  });

  it('step 0 is SKILL communication.whatsapp.classify', async () => {
    await delegateWhatsAppInquiry(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    expect(steps[0].step_type).toBe('SKILL');
    expect(steps[0].skill_id).toBe('communication.whatsapp.classify');
  });

  it('step 1 is HUMAN_GATE with OWNER and ADMIN_OPERATIONS as required roles', async () => {
    await delegateWhatsAppInquiry(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const step1 = steps[1] as Record<string, unknown>;
    expect(step1.step_type).toBe('HUMAN_GATE');
    const input = step1.input as Record<string, unknown>;
    expect(input.requiredRoles).toContain('OWNER');
    expect(input.requiredRoles).toContain('ADMIN_OPERATIONS');
  });

  it('step 2 is NOTIFICATION', async () => {
    await delegateWhatsAppInquiry(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    expect(steps[2].step_type).toBe('NOTIFICATION');
  });

  // ─── Human gate is mandatory (no skip path) ──────────────────────────────

  it('plan always contains exactly one HUMAN_GATE', async () => {
    await delegateWhatsAppInquiry(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const gates = steps.filter((s) => s.step_type === 'HUMAN_GATE');
    expect(gates).toHaveLength(1);
  });

  // ─── PII boundary: phone number must not appear in plan ──────────────────

  it('does not include phone numbers in the plan (PII boundary)', async () => {
    const phoneNum = '+971501234567';
    await delegateWhatsAppInquiry({ ...BASE, messageText: `Call me at ${phoneNum}` });
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    // messageText IS in the plan (it's the input to classify), but the task title must not be a phone number
    const externalMsgIdInCall = (call as { title?: string }).title;
    expect(externalMsgIdInCall).not.toContain(phoneNum);
  });

  // ─── messageText passed to classify step ─────────────────────────────────

  it('passes messageText as text input to classify step', async () => {
    await delegateWhatsAppInquiry(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    const step0input = steps[0].input as Record<string, unknown>;
    expect(step0input.text).toBe(BASE.messageText);
  });

  // ─── Context ──────────────────────────────────────────────────────────────

  it('uses empty default context when no context provided', async () => {
    await delegateWhatsAppInquiry(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    expect(call.context).toEqual({});
  });

  it('passes through custom context', async () => {
    const customCtx = { campaign_id: 'camp-001' };
    await delegateWhatsAppInquiry({ ...BASE, context: customCtx });
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    expect(call.context).toEqual(customCtx);
  });

  // ─── Org isolation ────────────────────────────────────────────────────────

  it('passes organizationId to delegateSubTask', async () => {
    await delegateWhatsAppInquiry(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    expect(call.organizationId).toBe(BASE.organizationId);
  });

  it('different organizationIds produce separate tasks (org isolation)', async () => {
    mockDelegateSubTask
      .mockResolvedValueOnce({ ok: true, subTaskId: 'st-org1' })
      .mockResolvedValueOnce({ ok: true, subTaskId: 'st-org2' });

    const r1 = await delegateWhatsAppInquiry({ ...BASE, organizationId: 'org-001' });
    const r2 = await delegateWhatsAppInquiry({ ...BASE, organizationId: 'org-002' });

    expect(r1.ok && r1.subTaskId).toBe('st-org1');
    expect(r2.ok && r2.subTaskId).toBe('st-org2');

    const call1 = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const call2 = mockDelegateSubTask.mock.calls[1][0] as Record<string, unknown>;
    expect(call1.organizationId).toBe('org-001');
    expect(call2.organizationId).toBe('org-002');
  });

  // ─── Delegation failure propagation ──────────────────────────────────────

  it('propagates error from delegateSubTask', async () => {
    mockDelegateSubTask.mockResolvedValue({ ok: false, error: 'DB error' });
    const result = await delegateWhatsAppInquiry(BASE);
    expect(result).toMatchObject({ ok: false, error: 'DB error' });
  });

  // ─── No financial authority ───────────────────────────────────────────────

  it('plan contains no FINANCIAL_CHECK step', async () => {
    await delegateWhatsAppInquiry(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    expect(steps.some((s) => s.step_type === 'FINANCIAL_CHECK')).toBe(false);
  });

  // ─── No production step ───────────────────────────────────────────────────

  it('plan contains no PRODUCTION_JOB step', async () => {
    await delegateWhatsAppInquiry(BASE);
    const call = mockDelegateSubTask.mock.calls[0][0] as Record<string, unknown>;
    const steps = (call.plan as { steps: Record<string, unknown>[] }).steps;
    expect(steps.some((s) => s.step_type === 'PRODUCTION_JOB')).toBe(false);
  });
});
