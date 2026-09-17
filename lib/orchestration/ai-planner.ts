// AI-based plan builder (Architecture v2 §20 P2).
// Uses callAi() with typed structured JSON output — NOT free-form text.
// All AI output is validated against the step-type and skill-id allowlists before use.
// Prompt injection risk is mitigated by treating AI output as data, not instructions.

import { callAi } from '@/lib/skills/ai/adapter';
import type { TaskPlan, TaskContext, StepType } from './types';

// ── Allowlists (must match Architecture v2 §9, §10, and extended Phase 2 types) ──

const APPROVED_STEP_TYPES: ReadonlySet<string> = new Set<StepType>([
  'SKILL',
  'HUMAN_GATE',
  'FINANCIAL_CHECK',
  'PRODUCTION_JOB',
  'STATUS_TRANSITION',
  'QC_GATE',
  'NOTIFICATION',
  'VERIFY',
]);

const APPROVED_SKILL_IDS: ReadonlySet<string> = new Set([
  'utility.prompt.optimize',
  'qc.asset.metadata',
  'qc.script.review',    // DR 0115
  'qc.brand.alignment',  // DR 0115
]);

const APPROVED_INTENT_TYPES: ReadonlySet<string> = new Set([
  'ROUTE_APPROVAL',
  'INSPECT_ASSET_METADATA',
  'OPTIMIZE_BRIEF_PROMPTS',
  'COORDINATE_BATCH_OPERATION',
  'COORDINATE_PRODUCTION_RUN',          // DR 0113
  'COORDINATE_QC_REVIEW',               // DR 0114
  'COORDINATE_FINANCIAL_MONITORING',    // DR 0116
]);

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a task plan builder for the DREXONYX orchestration system.
Given a task description, produce a JSON object with this exact structure:
{
  "intent_type": "<one of the approved intent types>",
  "steps": [
    {
      "step_index": 0,
      "step_type": "<one of the approved step types>",
      "skill_id": "<approved skill id or null>"
    }
  ]
}

Approved intent types: ROUTE_APPROVAL, INSPECT_ASSET_METADATA, OPTIMIZE_BRIEF_PROMPTS, COORDINATE_BATCH_OPERATION, COORDINATE_PRODUCTION_RUN, COORDINATE_QC_REVIEW, COORDINATE_FINANCIAL_MONITORING

Approved step types: SKILL, HUMAN_GATE, FINANCIAL_CHECK, PRODUCTION_JOB, STATUS_TRANSITION, QC_GATE, NOTIFICATION, VERIFY

Approved skill IDs (only for SKILL steps): utility.prompt.optimize, qc.asset.metadata, qc.script.review, qc.brand.alignment

Rules:
- skill_id must be one of the approved skill IDs when step_type is SKILL.
- skill_id must be null for all other step types.
- step_index values must be sequential starting from 0.
- Respond ONLY with valid JSON. No markdown fences, no explanation.`;

// ── Types ─────────────────────────────────────────────────────────────────────

export type AiPlannerResult =
  | { ok: true; plan: TaskPlan; classifiedIntentType: string }
  | { ok: false; error: string; isTransient: boolean };

// ── buildPlanFromDescription ──────────────────────────────────────────────────

export async function buildPlanFromDescription(params: {
  description: string;
  context: TaskContext;
}): Promise<AiPlannerResult> {
  const aiResult = await callAi({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `Task description: ${params.description}`,
    maxTokens: 1024,
  });

  if (!aiResult.ok) {
    return { ok: false, error: aiResult.error, isTransient: aiResult.isTransient };
  }

  // Parse and validate — treat all output as untrusted data
  let parsed: unknown;
  try {
    parsed = JSON.parse(aiResult.text.trim());
  } catch {
    return { ok: false, error: 'AI plan builder returned non-JSON output', isTransient: false };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'AI plan output is not a JSON object', isTransient: false };
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.intent_type !== 'string' || !APPROVED_INTENT_TYPES.has(obj.intent_type)) {
    return {
      ok: false,
      error: `AI plan produced unapproved intent_type: ${obj.intent_type}`,
      isTransient: false,
    };
  }

  if (!Array.isArray(obj.steps) || obj.steps.length === 0) {
    return { ok: false, error: 'AI plan steps must be a non-empty array', isTransient: false };
  }

  const validatedSteps: TaskPlan['steps'] = [];

  for (let i = 0; i < obj.steps.length; i++) {
    const raw = obj.steps[i];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, error: `AI plan step ${i} is not an object`, isTransient: false };
    }

    const s = raw as Record<string, unknown>;

    if (typeof s.step_index !== 'number' || s.step_index !== i) {
      return {
        ok: false,
        error: `AI plan step ${i} has invalid step_index: ${s.step_index}`,
        isTransient: false,
      };
    }

    if (typeof s.step_type !== 'string' || !APPROVED_STEP_TYPES.has(s.step_type)) {
      return {
        ok: false,
        error: `AI plan step ${i} has unapproved step_type: ${s.step_type}`,
        isTransient: false,
      };
    }

    if (s.step_type === 'SKILL') {
      if (typeof s.skill_id !== 'string' || !APPROVED_SKILL_IDS.has(s.skill_id)) {
        return {
          ok: false,
          error: `AI plan SKILL step ${i} has unapproved skill_id: ${s.skill_id}`,
          isTransient: false,
        };
      }
    } else if (s.skill_id !== null && s.skill_id !== undefined) {
      return {
        ok: false,
        error: `AI plan step ${i} (${s.step_type}) must not have a skill_id`,
        isTransient: false,
      };
    }

    validatedSteps.push({
      step_index: s.step_index as number,
      step_type: s.step_type as StepType,
      skill_id: s.step_type === 'SKILL' ? (s.skill_id as string) : undefined,
    });
  }

  const plan: TaskPlan = {
    steps: validatedSteps,
    generated_at: new Date().toISOString(),
  };

  return { ok: true, plan, classifiedIntentType: obj.intent_type as string };
}
