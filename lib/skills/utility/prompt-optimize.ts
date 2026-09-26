import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import { extractJson } from '../ai/extract-json';

export interface UtilityPromptOptimizeInput {
  originalPrompt: string;
  objectives?: string;
  targetModel?: string;
}

export interface UtilityPromptOptimizeOutput {
  optimizedPrompt: string;
  changes: string[];
  rationale: string;
}

const SYSTEM_PROMPT = `You are a prompt engineer specializing in optimizing prompts for AI image and video generation.
Optimize the provided prompt and return a JSON object with:
- optimizedPrompt: the improved prompt
- changes: array of specific changes made and why
- rationale: overall explanation of the optimization strategy

Focus on: specificity, visual clarity, style direction, technical quality parameters.
Respond with ONLY valid JSON. No markdown, no explanation.`;

function buildUserPrompt(input: UtilityPromptOptimizeInput): string {
  const parts = [`Original prompt:\n${input.originalPrompt}`];
  if (input.objectives) parts.push(`Optimization objectives:\n${input.objectives}`);
  if (input.targetModel) parts.push(`Target model: ${input.targetModel}`);
  return parts.join('\n\n');
}

function parseOutput(text: string): UtilityPromptOptimizeOutput | null {
  try {
    const parsed = extractJson(text);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (
      typeof o.optimizedPrompt === 'string' &&
      Array.isArray(o.changes) &&
      typeof o.rationale === 'string'
    ) {
      return {
        optimizedPrompt: o.optimizedPrompt,
        changes: o.changes as string[],
        rationale: o.rationale,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const utilityPromptOptimizeSkill: Skill<UtilityPromptOptimizeInput, UtilityPromptOptimizeOutput> = {
  id: 'utility.prompt.optimize',
  version: '1.0.0',
  family: 'UTILITY',

  async execute(input: UtilityPromptOptimizeInput, _context: SkillContext): Promise<SkillResult<UtilityPromptOptimizeOutput>> {
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
