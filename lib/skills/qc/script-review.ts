import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import type { GeminiSchema } from '../ai/adapter';

export interface QcScriptReviewInput {
  script: string;
  brandGuidelines?: string;
  objectives?: string;
}

export interface QcScriptReviewOutput {
  verdict: 'PASS' | 'FAIL';
  findings: string[];
  score: number;
  recommendations: string[];
}

const QC_SCRIPT_SCHEMA: GeminiSchema = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] },
    findings: { type: 'array', items: { type: 'string' } },
    score: { type: 'number' },
    recommendations: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'findings', 'score', 'recommendations'],
};

const SYSTEM_PROMPT = `You are a senior QC reviewer assessing ad scripts for quality and compliance.
Review the provided script and return a JSON object with:
- verdict: "PASS" or "FAIL"
- findings: array of specific issues found (empty array if none)
- score: quality score from 0-100
- recommendations: array of specific improvement recommendations

A PASS verdict means the script meets quality standards and can proceed to production.
A FAIL verdict means the script requires revision before production.
Respond with ONLY valid JSON. No markdown, no explanation.`;

function buildUserPrompt(input: QcScriptReviewInput): string {
  const parts = [`Script to review:\n${input.script}`];
  if (input.brandGuidelines) parts.push(`Brand guidelines:\n${input.brandGuidelines}`);
  if (input.objectives) parts.push(`Campaign objectives:\n${input.objectives}`);
  return parts.join('\n\n');
}

function validateOutput(parsed: unknown): QcScriptReviewOutput {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('expected object');
  }
  const o = parsed as Record<string, unknown>;
  if (o.verdict !== 'PASS' && o.verdict !== 'FAIL') throw new Error('verdict must be PASS or FAIL');
  if (!Array.isArray(o.findings)) throw new Error('findings must be an array');
  if (typeof o.score !== 'number') throw new Error('score must be a number');
  if (!Array.isArray(o.recommendations)) throw new Error('recommendations must be an array');
  return {
    verdict: o.verdict,
    findings: o.findings as string[],
    score: o.score,
    recommendations: o.recommendations as string[],
  };
}

export const qcScriptReviewSkill: Skill<QcScriptReviewInput, QcScriptReviewOutput> = {
  id: 'qc.script.review',
  version: '1.0.0',
  family: 'QC',

  async execute(input: QcScriptReviewInput, _context: SkillContext): Promise<SkillResult<QcScriptReviewOutput>> {
    const result = await callAi({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(input),
      maxTokens: 512,
      responseSchema: QC_SCRIPT_SCHEMA,
    });

    if (!result.ok) {
      return { ok: false, error: result.error, isTransient: result.isTransient };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `QC script review: AI response is not valid JSON: ${msg.slice(0, 200)}`, isTransient: false };
    }

    try {
      const output = validateOutput(parsed);
      return { ok: true, output };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `QC script review: AI response missing required fields: ${msg.slice(0, 200)}`, isTransient: false };
    }
  },
};
