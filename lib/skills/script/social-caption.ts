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

const SYSTEM_PROMPT = `You are a social media copywriter.
Generate platform-optimized captions and return a JSON object with:
- caption: the primary caption (platform-appropriate length and style)
- alternatives: array of 2 alternative caption versions with different angles

Respond with ONLY valid JSON. No markdown, no explanation.`;

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
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (typeof o.caption === 'string' && Array.isArray(o.alternatives)) {
      return { caption: o.caption, alternatives: o.alternatives as string[] };
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
