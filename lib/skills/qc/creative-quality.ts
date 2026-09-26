// DR 0123 §2.1: Brief fidelity assessment — machine recommendation only.
// Evaluates creative output against eight quality categories from the approved brief.
// Does NOT issue binding verdicts. QC_GATE (human) is still mandatory.

import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import { extractJson } from '../ai/extract-json';

export interface QcCreativeQualityInput {
  assetId: string;
  assetName: string;
  assetType: string;
  briefText: string;
  deliverables?: string;
  targetAudience?: string;
}

export interface QcCreativeQualityCategory {
  category: string;
  pass: boolean;
  notes: string;
}

export interface QcCreativeQualityOutput {
  verdict: 'PASS' | 'FAIL';
  fidelityScore: number;
  materialErrors: string[];
  categories: QcCreativeQualityCategory[];
}

const SYSTEM_PROMPT = `You are a creative quality reviewer assessing whether a produced asset matches its approved creative brief.

Evaluate the asset against these eight quality categories:
1. STORY_CONCEPT — narrative arc, message, emotional tone
2. SHOT_SCENE — composition, scene sequence, visual storytelling
3. PRODUCT — product representation, key attributes, branding accuracy
4. HUMAN_CHARACTER — people, characters, casting alignment with brief
5. MOTION — movement, pacing, timing
6. VISUAL — color, lighting, style, aesthetic
7. EDITING_POST — cuts, transitions, effects, audio sync
8. CLIENT_SPECIFIC — any custom requirements stated in the brief

Return a JSON object with exactly these fields:
- verdict: "PASS" or "FAIL" (FAIL if any material error exists)
- fidelityScore: integer 0-100 (overall brief fidelity)
- materialErrors: array of strings describing material deviations (must all be corrected before delivery; empty if none)
- categories: array of { category, pass, notes } — one entry per category above

A material error is any deviation that a client would notice and object to. Minor imperfections that do not contradict the brief are not material errors.

Respond with ONLY valid JSON. No markdown, no explanation.`;

function buildUserPrompt(input: QcCreativeQualityInput): string {
  const parts = [
    `Asset: ${input.assetName} (type: ${input.assetType}, id: ${input.assetId})`,
    `Approved brief:\n${input.briefText}`,
  ];
  if (input.deliverables) parts.push(`Deliverables spec:\n${input.deliverables}`);
  if (input.targetAudience) parts.push(`Target audience:\n${input.targetAudience}`);
  return parts.join('\n\n');
}

function parseOutput(text: string): QcCreativeQualityOutput | null {
  try {
    const parsed = extractJson(text);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (
      (o.verdict === 'PASS' || o.verdict === 'FAIL') &&
      typeof o.fidelityScore === 'number' &&
      Array.isArray(o.materialErrors) &&
      Array.isArray(o.categories)
    ) {
      return {
        verdict: o.verdict,
        fidelityScore: o.fidelityScore,
        materialErrors: o.materialErrors as string[],
        categories: o.categories as QcCreativeQualityCategory[],
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const qcCreativeQualitySkill: Skill<QcCreativeQualityInput, QcCreativeQualityOutput> = {
  id: 'qc.creative.quality',
  version: '1.0.0',
  family: 'QC',

  async execute(
    input: QcCreativeQualityInput,
    _context: SkillContext,
  ): Promise<SkillResult<QcCreativeQualityOutput>> {
    const result = await callAi({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(input),
    });

    if (!result.ok) {
      return { ok: false, error: result.error, isTransient: result.isTransient };
    }

    const output = parseOutput(result.text);
    if (!output) {
      return { ok: false, error: 'AI returned unparseable output', isTransient: false };
    }

    return { ok: true, output };
  },
};
