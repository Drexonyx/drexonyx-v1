import { describe, it, expect } from 'vitest';
import { buildPlan } from '../planner';
import type { TaskIntent } from '../types';

const ctx = {};

describe('buildPlan — ROUTE_APPROVAL', () => {
  it('produces a single HUMAN_GATE step', () => {
    const r = buildPlan({ intent_type: 'ROUTE_APPROVAL', context: ctx });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.steps).toHaveLength(1);
    expect(r.plan.steps[0]).toMatchObject({ step_index: 0, step_type: 'HUMAN_GATE' });
    expect(r.plan.generated_at).toBeTruthy();
  });
});

describe('buildPlan — INSPECT_ASSET_METADATA', () => {
  it('produces a single SKILL step for qc.asset.metadata', () => {
    const r = buildPlan({ intent_type: 'INSPECT_ASSET_METADATA', context: ctx });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.steps).toHaveLength(1);
    expect(r.plan.steps[0]).toMatchObject({ step_index: 0, step_type: 'SKILL', skill_id: 'qc.asset.metadata' });
  });
});

describe('buildPlan — OPTIMIZE_BRIEF_PROMPTS', () => {
  it('produces a single SKILL step for utility.prompt.optimize', () => {
    const r = buildPlan({ intent_type: 'OPTIMIZE_BRIEF_PROMPTS', context: ctx });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.steps).toHaveLength(1);
    expect(r.plan.steps[0]).toMatchObject({ step_index: 0, step_type: 'SKILL', skill_id: 'utility.prompt.optimize' });
  });
});

describe('buildPlan — COORDINATE_BATCH_OPERATION', () => {
  it('produces a SKILL step then a HUMAN_GATE step', () => {
    const r = buildPlan({ intent_type: 'COORDINATE_BATCH_OPERATION', context: ctx });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.steps).toHaveLength(2);
    expect(r.plan.steps[0]).toMatchObject({ step_index: 0, step_type: 'SKILL' });
    expect(r.plan.steps[1]).toMatchObject({ step_index: 1, step_type: 'HUMAN_GATE' });
  });
});

describe('buildPlan — step indices are sequential', () => {
  it('step_index values match array position', () => {
    const r = buildPlan({ intent_type: 'COORDINATE_BATCH_OPERATION', context: ctx });
    if (!r.ok) throw new Error('expected ok');
    r.plan.steps.forEach((step, i) => expect(step.step_index).toBe(i));
  });
});

describe('buildPlan — unknown intent type', () => {
  it('returns ok:false for an unknown intent type', () => {
    const r = buildPlan({ intent_type: 'UNKNOWN' as TaskIntent['intent_type'], context: ctx });
    expect(r.ok).toBe(false);
  });
});
