import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import type { GeminiSchema } from '../ai/adapter';

export interface ScriptSocialCaptionInput {
  platform: string;
  objective: string;
  tone: string;
  keyMessage: string;
  hashtags?: string[];
}

export interface ScriptSocialCaptionOutput {
  caption: string;
  alternatives: string[];
}

const CAPTION_SCHEMA: GeminiSchema = {
  type: 'object',
  properties: {
    caption: { type: 'string' },
    alternatives: { type: 'array', items: { type: 'string' } },
  },
  required: ['caption', 'alternatives'],
};

const SYSTEM_PROMPT = `You are a social media copywriter. Respond with ONLY a raw JSON object — no markdown fences, no prose, no explanation.
The JSON must have exactly these fields:
- caption: string — the primary caption, platform-appropriate length and style
- alternatives: array of 2 alternative caption strings with different angles

Example output: {"caption":"Your primary caption here.","alternatives":["Alternative angle 1.","Alternative angle 2."]}`;


function buildUserPrompt(input: ScriptSocialCaptionInput): string {
  const parts = [
    `Platform: ${input.platform}`,
    `Objective: ${input.objective}`,
    `Tone: ${input.tone}`,
    `Key message: ${input.keyMessage}`,
  ];
  if (input.hashtags && input.hashtags.length > 0) {
    parts.push(`Suggested hashtags: ${input.hashtags.join(', ')}`);
  }
  return parts.join('\n');
}

function validateOutput(parsed: unknown): ScriptSocialCaptionOutput {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('expected object');
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.caption !== 'string') throw new Error('caption must be a string');
  if (!Array.isArray(o.alternatives)) throw new Error('alternatives must be an array');
  return { caption: o.caption, alternatives: o.alternatives as string[] };
}

export const scriptSocialCaptionSkill: Skill<ScriptSocialCaptionInput, ScriptSocialCaptionOutput> = {
  id: 'script.social_caption.generate',
  version: '1.0.0',
  family: 'SCRIPT',

  async execute(input: ScriptSocialCaptionInput, _context: SkillContext): Promise<SkillResult<ScriptSocialCaptionOutput>> {
    const result = await callAi({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(input),
      maxTokens: 512,
      responseSchema: CAPTION_SCHEMA,
    });

    if (!result.ok) {
      return { ok: false, error: result.error, isTransient: result.isTransient };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Caption: AI response is not valid JSON: ${msg.slice(0, 200)}`, isTransient: false };
    }

    try {
      const output = validateOutput(parsed);
      return { ok: true, output };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Caption: AI response missing required fields: ${msg.slice(0, 200)}`, isTransient: false };
    }
  },
};
