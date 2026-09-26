import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import type { GeminiSchema } from '../ai/adapter';

export interface QcBrandAlignmentInput {
  content: string;
  brandGuidelines: string;
  brandVoice?: string;
}

export interface QcBrandAlignmentOutput {
  verdict: 'PASS' | 'FAIL';
  alignmentScore: number;
  findings: string[];
  recommendations: string[];
}

const BRAND_ALIGNMENT_SCHEMA: GeminiSchema = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] },
    alignmentScore: { type: 'number' },
    findings: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'alignmentScore', 'findings', 'recommendations'],
};

const SYSTEM_PROMPT = `You are a brand compliance reviewer.
Assess whether the provided content aligns with the brand guidelines and return a JSON object with:
- verdict: "PASS" or "FAIL"
- alignmentScore: alignment score from 0-100
- findings: array of specific brand alignment issues found (empty array if none)
- recommendations: array of specific recommendations to improve brand alignment

Respond with ONLY valid JSON. No markdown, no explanation.`;

function buildUserPrompt(input: QcBrandAlignmentInput): string {
  const parts = [
    `Content to review:\n${input.content}`,
    `Brand guidelines:\n${input.brandGuidelines}`,
  ];
  if (input.brandVoice) parts.push(`Brand voice:\n${input.brandVoice}`);
  return parts.join('\n\n');
}

function validateOutput(parsed: unknown): QcBrandAlignmentOutput {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('expected object');
  }
  const o = parsed as Record<string, unknown>;
  if (o.verdict !== 'PASS' && o.verdict !== 'FAIL') throw new Error('verdict must be PASS or FAIL');
  if (typeof o.alignmentScore !== 'number') throw new Error('alignmentScore must be a number');
  if (!Array.isArray(o.findings)) throw new Error('findings must be an array');
  if (!Array.isArray(o.recommendations)) throw new Error('recommendations must be an array');
  return {
    verdict: o.verdict,
    alignmentScore: o.alignmentScore,
    findings: o.findings as string[],
    recommendations: o.recommendations as string[],
  };
}

export const qcBrandAlignmentSkill: Skill<QcBrandAlignmentInput, QcBrandAlignmentOutput> = {
  id: 'qc.brand.alignment',
  version: '1.0.0',
  family: 'QC',

  async execute(input: QcBrandAlignmentInput, _context: SkillContext): Promise<SkillResult<QcBrandAlignmentOutput>> {
    const result = await callAi({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(input),
      maxTokens: 512,
      responseSchema: BRAND_ALIGNMENT_SCHEMA,
    });

    if (!result.ok) {
      return { ok: false, error: result.error, isTransient: result.isTransient };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `QC brand alignment: AI response is not valid JSON: ${msg.slice(0, 200)}`, isTransient: false };
    }

    try {
      const output = validateOutput(parsed);
      return { ok: true, output };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `QC brand alignment: AI response missing required fields: ${msg.slice(0, 200)}`, isTransient: false };
    }
  },
};
