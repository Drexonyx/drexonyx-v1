import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';

export interface BriefAnalyzeInput {
  briefText: string;
  deliverables?: string;
  targetAudience?: string;
  timelineNotes?: string;
  additionalNotes?: string;
}

export interface BriefAnalyzeOutput {
  summary: string;
  keyRequirements: string[];
  targetMarket: string;
  tone: string;
  estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
}

const SYSTEM_PROMPT = `You are a senior creative strategist analyzing a client brief.
Analyze the provided brief and return a structured JSON object with:
- summary: one-paragraph executive summary
- keyRequirements: array of specific requirements extracted from the brief
- targetMarket: description of the target market
- tone: recommended communication tone
- estimatedComplexity: "LOW", "MEDIUM", or "HIGH" based on scope

Respond with ONLY valid JSON matching this schema. No markdown, no explanation.`;

function buildUserPrompt(input: BriefAnalyzeInput): string {
  const parts = [`Brief text:\n${input.briefText}`];
  if (input.deliverables) parts.push(`Deliverables:\n${input.deliverables}`);
  if (input.targetAudience) parts.push(`Target audience:\n${input.targetAudience}`);
  if (input.timelineNotes) parts.push(`Timeline notes:\n${input.timelineNotes}`);
  if (input.additionalNotes) parts.push(`Additional notes:\n${input.additionalNotes}`);
  return parts.join('\n\n');
}

function parseOutput(text: string): BriefAnalyzeOutput | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (
      typeof o.summary === 'string' &&
      Array.isArray(o.keyRequirements) &&
      typeof o.targetMarket === 'string' &&
      typeof o.tone === 'string' &&
      (o.estimatedComplexity === 'LOW' || o.estimatedComplexity === 'MEDIUM' || o.estimatedComplexity === 'HIGH')
    ) {
      return {
        summary: o.summary,
        keyRequirements: o.keyRequirements as string[],
        targetMarket: o.targetMarket,
        tone: o.tone,
        estimatedComplexity: o.estimatedComplexity,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const briefAnalyzeSkill: Skill<BriefAnalyzeInput, BriefAnalyzeOutput> = {
  id: 'brief.analyze',
  version: '1.0.0',
  family: 'BRIEF',

  async execute(input: BriefAnalyzeInput, _context: SkillContext): Promise<SkillResult<BriefAnalyzeOutput>> {
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
