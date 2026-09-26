import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import type { GeminiSchema } from '../ai/adapter';

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

const STRATEGY_SCHEMA: GeminiSchema = {
  type: 'object',
  properties: {
    angles: { type: 'array', items: { type: 'string' } },
    themes: { type: 'array', items: { type: 'string' } },
    channels: { type: 'array', items: { type: 'string' } },
    keyMessages: { type: 'array', items: { type: 'string' } },
  },
  required: ['angles', 'themes', 'channels', 'keyMessages'],
};

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

function validateOutput(parsed: unknown): StrategyCampaignDevelopOutput {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('expected object');
  }
  const o = parsed as Record<string, unknown>;
  if (!Array.isArray(o.angles)) throw new Error('angles must be an array');
  if (!Array.isArray(o.themes)) throw new Error('themes must be an array');
  if (!Array.isArray(o.channels)) throw new Error('channels must be an array');
  if (!Array.isArray(o.keyMessages)) throw new Error('keyMessages must be an array');
  return {
    angles: o.angles as string[],
    themes: o.themes as string[],
    channels: o.channels as string[],
    keyMessages: o.keyMessages as string[],
  };
}

export const strategyCampaignDevelopSkill: Skill<StrategyCampaignDevelopInput, StrategyCampaignDevelopOutput> = {
  id: 'strategy.campaign.develop',
  version: '1.0.0',
  family: 'STRATEGY',

  async execute(input: StrategyCampaignDevelopInput, _context: SkillContext): Promise<SkillResult<StrategyCampaignDevelopOutput>> {
    const result = await callAi({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(input),
      maxTokens: 2048,
      responseSchema: STRATEGY_SCHEMA,
    });

    if (!result.ok) {
      return { ok: false, error: result.error, isTransient: result.isTransient };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Strategy: AI response is not valid JSON: ${msg.slice(0, 200)}`, isTransient: false };
    }

    try {
      const output = validateOutput(parsed);
      return { ok: true, output };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Strategy: AI response missing required fields: ${msg.slice(0, 200)}`, isTransient: false };
    }
  },
};
