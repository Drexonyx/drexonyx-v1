import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import { extractJson } from '../ai/extract-json';

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

function parseOutput(text: string): QcBrandAlignmentOutput | null {
  try {
    const parsed = extractJson(text);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (
      (o.verdict === 'PASS' || o.verdict === 'FAIL') &&
      typeof o.alignmentScore === 'number' &&
      Array.isArray(o.findings) &&
      Array.isArray(o.recommendations)
    ) {
      return {
        verdict: o.verdict,
        alignmentScore: o.alignmentScore,
        findings: o.findings as string[],
        recommendations: o.recommendations as string[],
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const qcBrandAlignmentSkill: Skill<QcBrandAlignmentInput, QcBrandAlignmentOutput> = {
  id: 'qc.brand.alignment',
  version: '1.0.0',
  family: 'QC',

  async execute(input: QcBrandAlignmentInput, _context: SkillContext): Promise<SkillResult<QcBrandAlignmentOutput>> {
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
