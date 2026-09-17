// Rule-based plan builder for Phase 1 (Architecture v2 §20 P1).
// Deterministic: IntentType → fixed step template. No AI/LLM.
// Phase 2 replaces this with an AI-based plan builder using callAi() with typed output.

import type { TaskIntent, TaskPlan, PlanStep } from './types';

// Fixed step templates per intent type. Sequence is immutable after plan generation.
const PLAN_TEMPLATES: Record<TaskIntent['intent_type'], readonly Omit<PlanStep, 'step_index'>[]> = {
  ROUTE_APPROVAL: [
    { step_type: 'HUMAN_GATE', skill_id: undefined },
  ],
  INSPECT_ASSET_METADATA: [
    { step_type: 'SKILL', skill_id: 'qc.asset.metadata' },
  ],
  OPTIMIZE_BRIEF_PROMPTS: [
    { step_type: 'SKILL', skill_id: 'utility.prompt.optimize' },
  ],
  COORDINATE_BATCH_OPERATION: [
    { step_type: 'SKILL', skill_id: 'utility.prompt.optimize' },
    { step_type: 'HUMAN_GATE', skill_id: undefined },
  ],
  // DR 0113: Production Agent — prompt optimize → human gate (job approval) → production job → notification
  COORDINATE_PRODUCTION_RUN: [
    { step_type: 'SKILL', skill_id: 'utility.prompt.optimize' },
    { step_type: 'HUMAN_GATE', skill_id: undefined },
    { step_type: 'PRODUCTION_JOB', skill_id: undefined },
    { step_type: 'NOTIFICATION', skill_id: undefined },
  ],
  // DR 0114: QC Agent — qc skills → collect recommendations → QC_GATE (mandatory human verdict) → notification
  COORDINATE_QC_REVIEW: [
    { step_type: 'SKILL', skill_id: 'qc.asset.metadata' },
    { step_type: 'SKILL', skill_id: 'qc.script.review' },
    { step_type: 'SKILL', skill_id: 'qc.brand.alignment' },
    { step_type: 'QC_GATE', skill_id: undefined },
    { step_type: 'NOTIFICATION', skill_id: undefined },
  ],
  // DR 0116: Finance Monitoring Agent — financial check → notification
  COORDINATE_FINANCIAL_MONITORING: [
    { step_type: 'FINANCIAL_CHECK', skill_id: undefined },
    { step_type: 'NOTIFICATION', skill_id: undefined },
  ],
  // DR 0117: Reporting Agent — read-only verify → notification
  GENERATE_OPERATIONAL_REPORT: [
    { step_type: 'VERIFY', skill_id: undefined },
    { step_type: 'NOTIFICATION', skill_id: undefined },
  ],
};

export type PlanResult =
  | { ok: true; plan: TaskPlan }
  | { ok: false; reason: string };

// Builds a deterministic TaskPlan from a validated TaskIntent.
// Returns ok:false if the intent_type has no registered template.
export function buildPlan(intent: TaskIntent): PlanResult {
  const template = PLAN_TEMPLATES[intent.intent_type];
  if (!template) {
    return { ok: false, reason: `No plan template for intent_type: ${intent.intent_type}` };
  }

  const steps: PlanStep[] = template.map((s, idx) => ({
    step_index: idx,
    step_type: s.step_type,
    ...(s.skill_id !== undefined ? { skill_id: s.skill_id } : {}),
  }));

  return {
    ok: true,
    plan: {
      steps,
      generated_at: new Date().toISOString(),
    },
  };
}
