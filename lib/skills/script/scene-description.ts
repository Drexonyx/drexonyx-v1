import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import { extractJson } from '../ai/extract-json';

export interface ScriptSceneDescriptionInput {
  script: string;
  tone: string;
  style?: string;
}

interface Scene {
  sceneNumber: number;
  description: string;
  visualNotes: string;
}

export interface ScriptSceneDescriptionOutput {
  scenes: Scene[];
}

const SYSTEM_PROMPT = `You are a creative director writing visual scene descriptions for video production.
Break down the provided script into numbered scenes and return a JSON object with:
- scenes: array of scene objects, each with:
  - sceneNumber: integer starting at 1
  - description: narrative description of what happens visually
  - visualNotes: specific visual production notes (camera angle, lighting, motion, color palette)

Respond with ONLY valid JSON. No markdown, no explanation.`;

function buildUserPrompt(input: ScriptSceneDescriptionInput): string {
  const parts = [`Script:\n${input.script}`, `Tone: ${input.tone}`];
  if (input.style) parts.push(`Visual style: ${input.style}`);
  return parts.join('\n\n');
}

function parseOutput(text: string): ScriptSceneDescriptionOutput | null {
  try {
    const parsed = extractJson(text);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (Array.isArray(o.scenes)) {
      const scenes = o.scenes as unknown[];
      const valid = scenes.every(
        (s): s is Scene =>
          typeof s === 'object' &&
          s !== null &&
          typeof (s as Record<string, unknown>).sceneNumber === 'number' &&
          typeof (s as Record<string, unknown>).description === 'string' &&
          typeof (s as Record<string, unknown>).visualNotes === 'string',
      );
      if (valid) return { scenes: o.scenes as Scene[] };
    }
    return null;
  } catch {
    return null;
  }
}

export const scriptSceneDescriptionSkill: Skill<ScriptSceneDescriptionInput, ScriptSceneDescriptionOutput> = {
  id: 'script.scene_description.generate',
  version: '1.0.0',
  family: 'SCRIPT',

  async execute(input: ScriptSceneDescriptionInput, _context: SkillContext): Promise<SkillResult<ScriptSceneDescriptionOutput>> {
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
