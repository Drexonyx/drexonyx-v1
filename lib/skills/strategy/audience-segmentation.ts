import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';

export interface StrategyAudienceSegmentationInput {
  productDescription: string;
  objectives: string;
  existingAudience?: string;
}

interface AudienceSegment {
  name: string;
  description: string;
  characteristics: string[];
  approach: string;
}

export interface StrategyAudienceSegmentationOutput {
  segments: AudienceSegment[];
}

const SYSTEM_PROMPT = `You are an audience research strategist.
Identify and describe audience segments and return a JSON object with:
- segments: array of 3-5 distinct audience segments, each with:
  - name: segment name/label
  - description: who this segment is (demographics, psychographics, behaviors)
  - characteristics: array of 4-6 defining characteristics
  - approach: recommended content and communication approach for this segment

Respond with ONLY valid JSON. No markdown, no explanation.`;

function buildUserPrompt(input: StrategyAudienceSegmentationInput): string {
  const parts = [
    `Product/service: ${input.productDescription}`,
    `Campaign objectives: ${input.objectives}`,
  ];
  if (input.existingAudience) parts.push(`Existing audience knowledge: ${input.existingAudience}`);
  return parts.join('\n\n');
}

function parseOutput(text: string): StrategyAudienceSegmentationOutput | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (Array.isArray(o.segments)) {
      const valid = (o.segments as unknown[]).every(
        (s): s is AudienceSegment =>
          typeof s === 'object' &&
          s !== null &&
          typeof (s as Record<string, unknown>).name === 'string' &&
          typeof (s as Record<string, unknown>).description === 'string' &&
          Array.isArray((s as Record<string, unknown>).characteristics) &&
          typeof (s as Record<string, unknown>).approach === 'string',
      );
      if (valid) return { segments: o.segments as AudienceSegment[] };
    }
    return null;
  } catch {
    return null;
  }
}

export const strategyAudienceSegmentationSkill: Skill<StrategyAudienceSegmentationInput, StrategyAudienceSegmentationOutput> = {
  id: 'strategy.audience.segmentation',
  version: '1.0.0',
  family: 'STRATEGY',

  async execute(input: StrategyAudienceSegmentationInput, _context: SkillContext): Promise<SkillResult<StrategyAudienceSegmentationOutput>> {
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
