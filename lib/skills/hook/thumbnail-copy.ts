import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import { extractJson } from '../ai/extract-json';

export interface HookThumbnailCopyInput {
  videoTopic: string;
  targetAudience: string;
  platform: string;
}

export interface HookThumbnailCopyOutput {
  headlines: string[];
  subheadings: string[];
}

const SYSTEM_PROMPT = `You are a thumbnail copy specialist for digital video platforms.
Generate thumbnail text optimized for click-through and return a JSON object with:
- headlines: array of 5 headline options (short, punchy, high-curiosity, platform-optimized)
- subheadings: array of 3 supporting subheadings that complement the headlines

Headlines must be short enough to read on a thumbnail at a glance (typically under 8 words).
Respond with ONLY valid JSON. No markdown, no explanation.`;

function buildUserPrompt(input: HookThumbnailCopyInput): string {
  return [
    `Video topic: ${input.videoTopic}`,
    `Target audience: ${input.targetAudience}`,
    `Platform: ${input.platform}`,
  ].join('\n');
}

function parseOutput(text: string): HookThumbnailCopyOutput | null {
  try {
    const parsed = extractJson(text);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (Array.isArray(o.headlines) && Array.isArray(o.subheadings)) {
      return {
        headlines: o.headlines as string[],
        subheadings: o.subheadings as string[],
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const hookThumbnailCopySkill: Skill<HookThumbnailCopyInput, HookThumbnailCopyOutput> = {
  id: 'hook.thumbnail_copy.generate',
  version: '1.0.0',
  family: 'HOOK',

  async execute(input: HookThumbnailCopyInput, _context: SkillContext): Promise<SkillResult<HookThumbnailCopyOutput>> {
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
