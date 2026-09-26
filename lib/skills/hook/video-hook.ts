import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import { extractJson } from '../ai/extract-json';

export interface HookVideoInput {
  objective: string;
  targetAudience: string;
  tone: string;
  keyMessage: string;
  platform?: string;
}

interface VideoHook {
  hook: string;
  rationale: string;
}

export interface HookVideoOutput {
  hooks: VideoHook[];
}

const SYSTEM_PROMPT = `You are a video content strategist specializing in high-retention hooks.
Generate 5 compelling video opening hooks and return a JSON object with:
- hooks: array of 5 hook objects, each with:
  - hook: the opening line or action (first 3 seconds of video)
  - rationale: brief explanation of why this hook works for the target audience

Hooks should be varied in approach: question, bold statement, curiosity gap, story opening, visual action.
Respond with ONLY valid JSON. No markdown, no explanation.`;

function buildUserPrompt(input: HookVideoInput): string {
  const parts = [
    `Objective: ${input.objective}`,
    `Target audience: ${input.targetAudience}`,
    `Tone: ${input.tone}`,
    `Key message: ${input.keyMessage}`,
  ];
  if (input.platform) parts.push(`Platform: ${input.platform}`);
  return parts.join('\n');
}

function parseOutput(text: string): HookVideoOutput | null {
  try {
    const parsed = extractJson(text);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (Array.isArray(o.hooks)) {
      const valid = (o.hooks as unknown[]).every(
        (h): h is VideoHook =>
          typeof h === 'object' &&
          h !== null &&
          typeof (h as Record<string, unknown>).hook === 'string' &&
          typeof (h as Record<string, unknown>).rationale === 'string',
      );
      if (valid) return { hooks: o.hooks as VideoHook[] };
    }
    return null;
  } catch {
    return null;
  }
}

export const hookVideoGenerateSkill: Skill<HookVideoInput, HookVideoOutput> = {
  id: 'hook.video.generate',
  version: '1.0.0',
  family: 'HOOK',

  async execute(input: HookVideoInput, _context: SkillContext): Promise<SkillResult<HookVideoOutput>> {
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
