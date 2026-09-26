import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import { extractJson } from '../ai/extract-json';

export interface BriefExtractRequirementsInput {
  briefText: string;
  additionalNotes?: string;
}

export interface BriefExtractRequirementsOutput {
  requirements: string[];
  deliverables: string[];
  constraints: string[];
  assumptions: string[];
}

const SYSTEM_PROMPT = `You are a senior project analyst extracting structured requirements from a client brief.
Return a JSON object with:
- requirements: explicit functional and creative requirements stated or implied
- deliverables: specific outputs the client expects
- constraints: limitations (budget hints, timeline, technical, platform)
- assumptions: reasonable assumptions made where the brief is ambiguous

Respond with ONLY valid JSON. No markdown, no explanation.`;

function buildUserPrompt(input: BriefExtractRequirementsInput): string {
  const parts = [`Brief text:\n${input.briefText}`];
  if (input.additionalNotes) parts.push(`Additional notes:\n${input.additionalNotes}`);
  return parts.join('\n\n');
}

function parseOutput(text: string): BriefExtractRequirementsOutput | null {
  try {
    const parsed = extractJson(text);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (
      Array.isArray(o.requirements) &&
      Array.isArray(o.deliverables) &&
      Array.isArray(o.constraints) &&
      Array.isArray(o.assumptions)
    ) {
      return {
        requirements: o.requirements as string[],
        deliverables: o.deliverables as string[],
        constraints: o.constraints as string[],
        assumptions: o.assumptions as string[],
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const briefExtractRequirementsSkill: Skill<BriefExtractRequirementsInput, BriefExtractRequirementsOutput> = {
  id: 'brief.extract_requirements',
  version: '1.0.0',
  family: 'BRIEF',

  async execute(input: BriefExtractRequirementsInput, _context: SkillContext): Promise<SkillResult<BriefExtractRequirementsOutput>> {
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
