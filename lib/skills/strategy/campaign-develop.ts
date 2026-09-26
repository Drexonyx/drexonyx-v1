import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import { extractJson } from '../ai/extract-json';

export interface StrategyCampaignDevelopInput {
  objective: string;
  targetAudience: string;
  timeline?: string;
  brand?: string;
}

export interface StrategyCampaignDevelopOutput {
  angles: string[];
  themes: string[];
  channels: string[];
  keyMessages: string[];
}

const SYSTEM_PROMPT = `You are a senior campaign strategist. Return ONLY a valid JSON object with these string-array fields:
- angles: array of 4 distinct creative angles (short phrases)
- themes: array of 3 overarching campaign themes (short phrases)
- channels: array of recommended distribution channel names (e.g. "Facebook", "Instagram")
- keyMessages: array of 5 core messages the campaign must communicate (complete sentences)

No markdown fences, no prose, no explanation. All array values must be strings.`;

function buildUserPrompt(input: StrategyCampaignDevelopInput): string {
  const parts = [
    `Objective: ${input.objective}`,
    `Target audience: ${input.targetAudience}`,
  ];
  if (input.timeline) parts.push(`Timeline: ${input.timeline}`);
  if (input.brand) parts.push(`Brand context: ${input.brand}`);
  return parts.join('\n');
}

function parseOutput(text: string): StrategyCampaignDevelopOutput | null {
  try {
    const parsed = extractJson(text);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (
      Array.isArray(o.angles) &&
      Array.isArray(o.themes) &&
      Array.isArray(o.channels) &&
      Array.isArray(o.keyMessages)
    ) {
      return {
        angles: o.angles as string[],
        themes: o.themes as string[],
        channels: o.channels as string[],
        keyMessages: o.keyMessages as string[],
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const strategyCampaignDevelopSkill: Skill<StrategyCampaignDevelopInput, StrategyCampaignDevelopOutput> = {
  id: 'strategy.campaign.develop',
  version: '1.0.0',
  family: 'STRATEGY',

  async execute(input: StrategyCampaignDevelopInput, _context: SkillContext): Promise<SkillResult<StrategyCampaignDevelopOutput>> {
    const result = await callAi({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(input),
      maxTokens: 1024,
    });

    if (!result.ok) {
      return { ok: false, error: result.error, isTransient: result.isTransient };
    }

    const output = parseOutput(result.text);
    if (!output) {
      const preview = result.text.slice(0, 120).replace(/\n/g, ' ');
      return { ok: false, error: `Strategy: unparseable AI response — ${preview}`, isTransient: false };
    }

    return { ok: true, output };
  },
};
