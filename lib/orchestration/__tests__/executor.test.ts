import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockAuditBoundaryViolation, mockSkillExecute } = vi.hoisted(() => ({
  mockAuditBoundaryViolation: vi.fn().mockResolvedValue(undefined),
  mockSkillExecute: vi.fn(),
}));

vi.mock('../audit', () => ({
  auditBoundaryViolation: mockAuditBoundaryViolation,
}));

vi.mock('@/lib/skills', () => ({
  isAgentAuthorized: (skillId: string) =>
    ['utility.prompt.optimize', 'qc.asset.metadata'].includes(skillId),
  isHumanAuthorized: (skillId: string, role: string) => {
    if (['CLIENT', 'AGENT'].includes(role)) return false;
    if (['OWNER', 'ADMIN_OPERATIONS'].includes(role)) return true;
    if (role === 'CREATIVE_PRODUCTION') {
      return ['utility.prompt.optimize', 'brief.analyze', 'script.ad.generate'].includes(skillId);
    }
    if (role === 'QC') return ['qc.asset.metadata', 'qc.script.review'].includes(skillId);
    return false;
  },
  SKILL_REGISTRY: {
    'utility.prompt.optimize': { id: 'utility.prompt.optimize', version: '1.0.0', execute: mockSkillExecute },
    'qc.asset.metadata': { id: 'qc.asset.metadata', version: '1.0.0', execute: mockSkillExecute },
  },
}));

import { executeSkillStep } from '../executor';

const base = {
  taskId: 'task-1',
  organizationId: 'org-1',
  stepIndex: 0,
  input: { originalPrompt: 'hello' },
  initiatorUserId: 'user-1',
  initiatorRole: 'OWNER' as const,
};

describe('executeSkillStep — Gate 1: AGENT allowlist', () => {
  beforeEach(() => vi.clearAllMocks());

  it('blocks a skill not on the allowlist', async () => {
    const result = await executeSkillStep({ ...base, skillId: 'brief.analyze' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(false);
    expect(mockAuditBoundaryViolation).toHaveBeenCalledWith(
      expect.objectContaining({ attemptedAction: 'SKILL_EXECUTE:brief.analyze' }),
    );
  });

  it('blocks strategy skills not on the allowlist', async () => {
    const result = await executeSkillStep({ ...base, skillId: 'strategy.campaign.develop' });
    expect(result.ok).toBe(false);
    expect(mockAuditBoundaryViolation).toHaveBeenCalledOnce();
  });

  it('passes utility.prompt.optimize through Gate 1', async () => {
    mockSkillExecute.mockResolvedValueOnce({ ok: true, output: { optimizedPrompt: 'x', changes: [], rationale: '' } });
    const result = await executeSkillStep({ ...base, skillId: 'utility.prompt.optimize' });
    expect(result.ok).toBe(true);
  });

  it('passes qc.asset.metadata through Gate 1', async () => {
    mockSkillExecute.mockResolvedValueOnce({ ok: true, output: {} });
    const result = await executeSkillStep({ ...base, skillId: 'qc.asset.metadata' });
    expect(result.ok).toBe(true);
  });
});

describe('executeSkillStep — Gate 2: initiator role', () => {
  beforeEach(() => vi.clearAllMocks());

  it('blocks QC role from utility.prompt.optimize', async () => {
    const result = await executeSkillStep({ ...base, skillId: 'utility.prompt.optimize', initiatorRole: 'QC' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(false);
    expect(mockAuditBoundaryViolation).toHaveBeenCalledWith(
      expect.objectContaining({ blockReason: expect.stringContaining('QC') }),
    );
  });

  it('OWNER passes Gate 2 for utility.prompt.optimize', async () => {
    mockSkillExecute.mockResolvedValueOnce({ ok: true, output: { optimizedPrompt: 'x', changes: [], rationale: '' } });
    const result = await executeSkillStep({ ...base, skillId: 'utility.prompt.optimize', initiatorRole: 'OWNER' });
    expect(result.ok).toBe(true);
    expect(mockAuditBoundaryViolation).not.toHaveBeenCalled();
  });

  it('ADMIN_OPERATIONS passes Gate 2', async () => {
    mockSkillExecute.mockResolvedValueOnce({ ok: true, output: {} });
    const result = await executeSkillStep({ ...base, skillId: 'utility.prompt.optimize', initiatorRole: 'ADMIN_OPERATIONS' });
    expect(result.ok).toBe(true);
  });

  it('QC passes Gate 2 for qc.asset.metadata', async () => {
    mockSkillExecute.mockResolvedValueOnce({ ok: true, output: {} });
    const result = await executeSkillStep({ ...base, skillId: 'qc.asset.metadata', initiatorRole: 'QC' });
    expect(result.ok).toBe(true);
  });
});

describe('executeSkillStep — skill execution results', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns ok:true with skill output on success', async () => {
    const output = { optimizedPrompt: 'better', changes: ['c1'], rationale: 'r' };
    mockSkillExecute.mockResolvedValueOnce({ ok: true, output });
    const result = await executeSkillStep({ ...base, skillId: 'utility.prompt.optimize' });
    expect(result).toEqual({ ok: true, output });
  });

  it('returns ok:false with transient error', async () => {
    mockSkillExecute.mockResolvedValueOnce({ ok: false, error: 'timeout', isTransient: true });
    const result = await executeSkillStep({ ...base, skillId: 'utility.prompt.optimize' });
    expect(result).toEqual({ ok: false, error: 'timeout', isTransient: true });
  });

  it('returns ok:false with non-transient error', async () => {
    mockSkillExecute.mockResolvedValueOnce({ ok: false, error: 'parse failure', isTransient: false });
    const result = await executeSkillStep({ ...base, skillId: 'utility.prompt.optimize' });
    expect(result).toEqual({ ok: false, error: 'parse failure', isTransient: false });
  });

  it('does not audit boundary violation on a skill execution error', async () => {
    mockSkillExecute.mockResolvedValueOnce({ ok: false, error: 'timeout', isTransient: true });
    await executeSkillStep({ ...base, skillId: 'utility.prompt.optimize' });
    expect(mockAuditBoundaryViolation).not.toHaveBeenCalled();
  });
});
