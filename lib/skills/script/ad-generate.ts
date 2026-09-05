import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';

export interface ScriptAdGenerateInput {
  objective: string;
  targetAudience: string;
  tone: string;
  keyMessage: string;
  duration?: number;
  callToAction?: string;
}

export interface ScriptAdGenerateOutput {
  script: string;
  hooks: string[];
  voiceover: string;
  sceneDescriptions: string[];
}

const SYSTEM_PROMPT = `You are an expert advertising copywriter and creative director.
Generate a complete ad script and return a JSON object with:
- script: the full formatted ad script with scene directions and dialogue
- hooks: array of 3 opening hooks to capture attention immediately
- voiceover: voiceover copy for the ad
- sceneDescriptions: array of visual scene descriptions matching the script

Respond with ONLY valid JSON. No markdown, no explanation.`;

function buildUserPrompt(input: ScriptAdGenerateInput): string {
  const parts = [
    `Objective: ${input.objective}`,
    `Target audience: ${input.targetAudience}`,
    `Tone: ${input.tone}`,
    `Key message: ${input.keyMessage}`,
  ];
  if (input.duration) parts.push(`Target duration: ${input.duration} seconds`);
  if (input.callToAction) parts.push(`Call to action: ${input.callToAction}`);
  return parts.join('\n');
}

function parseOutput(text: string): ScriptAdGenerateOutput | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (
      typeof o.script === 'string' &&
      Array.isArray(o.hooks) &&
      typeof o.voiceover === 'string' &&
      Array.isArray(o.sceneDescriptions)
    ) {
      return {
        script: o.script,
        hooks: o.hooks as string[],
        voiceover: o.voiceover,
        sceneDescriptions: o.sceneDescriptions as string[],
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const scriptAdGenerateSkill: Skill<ScriptAdGenerateInput, ScriptAdGenerateOutput> = {
  id: 'script.ad.generate',
  version: '1.0.0',
  family: 'SCRIPT',

  async execute(input: ScriptAdGenerateInput, _context: SkillContext): Promise<SkillResult<ScriptAdGenerateOutput>> {
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
