import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';

export interface StrategyBrandPositioningInput {
  brandName: string;
  targetAudience: string;
  targetPosition: string;
  currentPosition?: string;
  competitors?: string[];
}

export interface StrategyBrandPositioningOutput {
  positioningStatement: string;
  pillars: string[];
  differentiators: string[];
  toneOfVoice: string;
}

const SYSTEM_PROMPT = `You are a brand strategist and positioning expert.
Develop a brand positioning strategy and return a JSON object with:
- positioningStatement: a single, concise positioning statement (for X who Y, [Brand] is the Z that W)
- pillars: array of 3-4 brand pillars that support the positioning
- differentiators: array of 3-5 specific points of difference from competitors
- toneOfVoice: description of the brand's tone of voice and communication style

Respond with ONLY valid JSON. No markdown, no explanation.`;

function buildUserPrompt(input: StrategyBrandPositioningInput): string {
  const parts = [
    `Brand name: ${input.brandName}`,
    `Target audience: ${input.targetAudience}`,
    `Target positioning: ${input.targetPosition}`,
  ];
  if (input.currentPosition) parts.push(`Current positioning: ${input.currentPosition}`);
  if (input.competitors && input.competitors.length > 0) {
    parts.push(`Key competitors: ${input.competitors.join(', ')}`);
  }
  return parts.join('\n');
}

function parseOutput(text: string): StrategyBrandPositioningOutput | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (
      typeof o.positioningStatement === 'string' &&
      Array.isArray(o.pillars) &&
      Array.isArray(o.differentiators) &&
      typeof o.toneOfVoice === 'string'
    ) {
      return {
        positioningStatement: o.positioningStatement,
        pillars: o.pillars as string[],
        differentiators: o.differentiators as string[],
        toneOfVoice: o.toneOfVoice,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const strategyBrandPositioningSkill: Skill<StrategyBrandPositioningInput, StrategyBrandPositioningOutput> = {
  id: 'strategy.brand.positioning',
  version: '1.0.0',
  family: 'STRATEGY',

  async execute(input: StrategyBrandPositioningInput, _context: SkillContext): Promise<SkillResult<StrategyBrandPositioningOutput>> {
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
