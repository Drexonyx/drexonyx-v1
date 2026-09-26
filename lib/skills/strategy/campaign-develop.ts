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

const SYSTEM_PROMPT = `You are a senior campaign strategist.
Develop a campaign strategy and return a JSON object with:
- angles: array of 4 distinct creative angles to approach the campaign
- themes: array of 3 overarching campaign themes
- channels: array of recommended distribution channels with brief rationale for each
- keyMessages: array of 5 core messages the campaign must communicate

Respond with ONLY valid JSON. No markdown, no explanation.`;

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
