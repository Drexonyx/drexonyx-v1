import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuditBoundaryViolation, mockSkillExecute } = vi.hoisted(() => ({
  mockAuditBoundaryViolation: vi.fn().mockResolvedValue(undefined),
  mockSkillExecute: vi.fn(),
}));

vi.mock('../audit', () => ({
  auditBoundaryViolation: mockAuditBoundaryViolation,
}));

vi.mock('@/lib/skills', () => ({
  isAgentAuthorized: (skillId: string) => ['utility.prompt.optimize', 'qc.asset.metadata'].includes(skillId),
  isHumanAuthorized: (skillId: string, role: string) => {
    if (['CLIENT', 'AGENT'].includes(role)) return false;
    return ['OWNER', 'ADMIN_OPERATIONS'].includes(role);
  },
  SKILL_REGISTRY: {
    'utility.prompt.optimize': { id: 'utility.prompt.optimize', version: '1.0.0', execute: mockSkillExecute },
  },
}));

import { executeSkillStep } from '../executor';

const base = {
  taskId: 'task-1',
  organizationId: 'org-1',
  stepIndex: 0,
  input: {},
  initiatorUserId: 'user-1',
  initiatorRole: 'OWNER' as const,
};

describe('boundary violations — each produces a BOUNDARY_VIOLATION audit event', () => {
  beforeEach(() => vi.clearAllMocks());

  it('skill not on AGENT allowlist → BOUNDARY_VIOLATION audit', async () => {
    const result = await executeSkillStep({ ...base, skillId: 'strategy.campaign.develop' });
    expect(result.ok).toBe(false);
    expect(mockAuditBoundaryViolation).toHaveBeenCalledWith(
      expect.objectContaining({ attemptedAction: 'SKILL_EXECUTE:strategy.campaign.develop' }),
    );
  });

  it('allowlisted skill but unauthorized initiator role → BOUNDARY_VIOLATION audit', async () => {
    const result = await executeSkillStep({ ...base, skillId: 'utility.prompt.optimize', initiatorRole: 'QC' as const });
    expect(result.ok).toBe(false);
    expect(mockAuditBoundaryViolation).toHaveBeenCalledWith(
      expect.objectContaining({ attemptedAction: 'SKILL_EXECUTE:utility.prompt.optimize' }),
    );
  });

  it('authorized execution does NOT produce BOUNDARY_VIOLATION', async () => {
    mockSkillExecute.mockResolvedValueOnce({ ok: true, output: {} });
    const result = await executeSkillStep({ ...base, skillId: 'utility.prompt.optimize' });
    expect(result.ok).toBe(true);
    expect(mockAuditBoundaryViolation).not.toHaveBeenCalled();
  });

  it('non-transient skill error does NOT produce BOUNDARY_VIOLATION', async () => {
    mockSkillExecute.mockResolvedValueOnce({ ok: false, error: 'parse error', isTransient: false });
    await executeSkillStep({ ...base, skillId: 'utility.prompt.optimize' });
    expect(mockAuditBoundaryViolation).not.toHaveBeenCalled();
  });
});
