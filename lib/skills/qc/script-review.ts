import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import { extractJson } from '../ai/extract-json';

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

function parseOutput(text: string): QcScriptReviewOutput | null {
  try {
    const parsed = extractJson(text);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (
      (o.verdict === 'PASS' || o.verdict === 'FAIL') &&
      Array.isArray(o.findings) &&
      typeof o.score === 'number' &&
      Array.isArray(o.recommendations)
    ) {
      return {
        verdict: o.verdict,
        findings: o.findings as string[],
        score: o.score,
        recommendations: o.recommendations as string[],
      };
    }
    return null;
  } catch {
    return null;
  }
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
