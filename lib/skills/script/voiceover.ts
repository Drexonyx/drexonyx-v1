import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import { extractJson } from '../ai/extract-json';

export interface ScriptVoiceoverInput {
  script: string;
  tone: string;
  targetAudience: string;
  duration?: number;
}

export interface ScriptVoiceoverOutput {
  voiceover: string;
  estimatedDuration: string;
  directions: string;
}

const SYSTEM_PROMPT = `You are a voiceover scriptwriter and audio director.
Generate voiceover copy from the provided script and return a JSON object with:
- voiceover: clean voiceover copy optimized for spoken delivery
- estimatedDuration: estimated read time (e.g., "30 seconds", "60 seconds")
- directions: delivery directions for the voice talent (pace, emphasis, emotion)

Respond with ONLY valid JSON. No markdown, no explanation.`;

function buildUserPrompt(input: ScriptVoiceoverInput): string {
  const parts = [
    `Script:\n${input.script}`,
    `Tone: ${input.tone}`,
    `Target audience: ${input.targetAudience}`,
  ];
  if (input.duration) parts.push(`Target duration: ${input.duration} seconds`);
  return parts.join('\n\n');
}

function parseOutput(text: string): ScriptVoiceoverOutput | null {
  try {
    const parsed = extractJson(text);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (
      typeof o.voiceover === 'string' &&
      typeof o.estimatedDuration === 'string' &&
      typeof o.directions === 'string'
    ) {
      return {
        voiceover: o.voiceover,
        estimatedDuration: o.estimatedDuration,
        directions: o.directions,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const scriptVoiceoverSkill: Skill<ScriptVoiceoverInput, ScriptVoiceoverOutput> = {
  id: 'script.voiceover.generate',
  version: '1.0.0',
  family: 'SCRIPT',

  async execute(input: ScriptVoiceoverInput, _context: SkillContext): Promise<SkillResult<ScriptVoiceoverOutput>> {
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
