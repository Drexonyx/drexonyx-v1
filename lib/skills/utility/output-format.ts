import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';

export interface UtilityOutputFormatInput {
  content: string;
  targetFormat: string;
  preserveStructure?: boolean;
}

export interface UtilityOutputFormatOutput {
  formatted: string;
  format: string;
  warnings: string[];
}

const SYSTEM_PROMPT = `You are a content formatting specialist.
Reformat the provided content to the requested target format and return a JSON object with:
- formatted: the reformatted content
- format: description of the format applied
- warnings: array of any warnings about content that could not be fully converted (empty array if none)

Respond with ONLY valid JSON. No markdown, no explanation.`;

function buildUserPrompt(input: UtilityOutputFormatInput): string {
  const parts = [
    `Content to format:\n${input.content}`,
    `Target format: ${input.targetFormat}`,
  ];
  if (input.preserveStructure !== undefined) {
    parts.push(`Preserve structure: ${input.preserveStructure}`);
  }
  return parts.join('\n\n');
}

function parseOutput(text: string): UtilityOutputFormatOutput | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (
      typeof o.formatted === 'string' &&
      typeof o.format === 'string' &&
      Array.isArray(o.warnings)
    ) {
      return {
        formatted: o.formatted,
        format: o.format,
        warnings: o.warnings as string[],
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const utilityOutputFormatSkill: Skill<UtilityOutputFormatInput, UtilityOutputFormatOutput> = {
  id: 'utility.output.format',
  version: '1.0.0',
  family: 'UTILITY',

  async execute(input: UtilityOutputFormatInput, _context: SkillContext): Promise<SkillResult<UtilityOutputFormatOutput>> {
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
