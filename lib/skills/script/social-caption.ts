import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import { extractJson } from '../ai/extract-json';

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

function parseOutput(text: string): ScriptSocialCaptionOutput | null {
  try {
    const parsed = extractJson(text);
    if (typeof parsed === 'object' && parsed !== null) {
      const o = parsed as Record<string, unknown>;
      if (typeof o.caption === 'string' && Array.isArray(o.alternatives)) {
        return { caption: o.caption, alternatives: o.alternatives as string[] };
      }
    }
    // Model returned plain text instead of JSON — treat the full text as the caption.
    // alternatives is safely empty; the caller uses `alternatives[0] ?? undefined`.
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      return { caption: trimmed, alternatives: [] };
    }
    return null;
  } catch {
    return null;
  }
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
