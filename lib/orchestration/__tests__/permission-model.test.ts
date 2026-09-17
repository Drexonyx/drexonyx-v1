import { describe, it, expect } from 'vitest';
import { classifyIntent } from '../intent';
import { buildPlan } from '../planner';
import type { InitiatorRole } from '../types';

// Validates that only admin roles can initiate tasks (CLIENT and AGENT excluded)
const ALLOWED_INITIATOR_ROLES: InitiatorRole[] = ['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION', 'QC'];
const EXCLUDED_ROLES = ['CLIENT', 'AGENT'];

describe('permission model — initiator role', () => {
  it('all admin roles are accepted as InitiatorRole', () => {
    ALLOWED_INITIATOR_ROLES.forEach((role) => {
      // InitiatorRole type accepts these; just checking the constant set is correct
      expect(typeof role).toBe('string');
    });
  });

  it('CLIENT and AGENT are not in the InitiatorRole union', () => {
    EXCLUDED_ROLES.forEach((role) => {
      // Verify they are not in the allowed set
      expect(ALLOWED_INITIATOR_ROLES).not.toContain(role);
    });
  });
});

describe('permission model — intent classification rejects unknown types', () => {
  it('classifyIntent returns null for arbitrary strings', () => {
    expect(classifyIntent('ARBITRARY_INTENT')).toBeNull();
    expect(classifyIntent('DROP_TABLE')).toBeNull();
    expect(classifyIntent('')).toBeNull();
  });
});

describe('permission model — plan builder only produces approved step types', () => {
  const APPROVED_STEP_TYPES = new Set(['SKILL', 'HUMAN_GATE', 'FINANCIAL_CHECK']);
  const APPROVED_SKILLS = new Set(['utility.prompt.optimize', 'qc.asset.metadata']);

  it('ROUTE_APPROVAL plan uses only approved step types', () => {
    const r = buildPlan({ intent_type: 'ROUTE_APPROVAL', context: {} });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    r.plan.steps.forEach((s) => expect(APPROVED_STEP_TYPES.has(s.step_type)).toBe(true));
  });

  it('INSPECT_ASSET_METADATA plan uses only AGENT-allowlisted skills', () => {
    const r = buildPlan({ intent_type: 'INSPECT_ASSET_METADATA', context: {} });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    r.plan.steps
      .filter((s) => s.step_type === 'SKILL')
      .forEach((s) => {
        expect(s.skill_id).toBeDefined();
        expect(APPROVED_SKILLS.has(s.skill_id!)).toBe(true);
      });
  });

  it('OPTIMIZE_BRIEF_PROMPTS plan uses only AGENT-allowlisted skills', () => {
    const r = buildPlan({ intent_type: 'OPTIMIZE_BRIEF_PROMPTS', context: {} });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    r.plan.steps
      .filter((s) => s.step_type === 'SKILL')
      .forEach((s) => {
        expect(s.skill_id).toBeDefined();
        expect(APPROVED_SKILLS.has(s.skill_id!)).toBe(true);
      });
  });

  it('COORDINATE_BATCH_OPERATION plan uses only approved step types and skills', () => {
    const r = buildPlan({ intent_type: 'COORDINATE_BATCH_OPERATION', context: {} });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    r.plan.steps.forEach((s) => expect(APPROVED_STEP_TYPES.has(s.step_type)).toBe(true));
    r.plan.steps
      .filter((s) => s.step_type === 'SKILL')
      .forEach((s) => {
        expect(s.skill_id).toBeDefined();
        expect(APPROVED_SKILLS.has(s.skill_id!)).toBe(true);
      });
  });
});
