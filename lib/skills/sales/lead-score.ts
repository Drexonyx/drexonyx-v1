// DR 0128: Sales Lead Scoring Skill.
// Assigns a numeric score (0–100) and priority tier to a lead.
// One AI call per execute(). No DB access.

import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import type { GeminiSchema } from '../ai/adapter';

export interface SalesLeadScoreInput {
  businessName: string;
  country?: string;
  primarySourcePlatform: string;
  opportunity?: string;
  portfolioMatch?: string;
  verificationConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceType?: string;
}

export interface SalesLeadScoreOutput {
  score: number;
  priority: 'HOT' | 'WARM' | 'COLD';
  reasoning: string;
}

const SCORE_SCHEMA: GeminiSchema = {
  type: 'object',
  properties: {
    score:     { type: 'integer' },
    priority:  { type: 'string', enum: ['HOT', 'WARM', 'COLD'] },
    reasoning: { type: 'string' },
  },
  required: ['score', 'priority', 'reasoning'],
};

const SYSTEM_PROMPT = `You are a sales prioritization analyst for DREXONYX, a digital marketing agency specializing in video content, social media, and brand identity.

Score this lead (0–100) and assign a priority tier:
- HOT (75–100): Strong fit, clear need, platform match, high likelihood to convert
- WARM (40–74): Decent fit, some signals, worth pursuing
- COLD (0–39): Weak fit, low signals, or poor match for DREXONYX services

Return ONLY a valid JSON object with:
- score (integer 0–100)
- priority ("HOT", "WARM", or "COLD")
- reasoning (string): 1-2 sentences explaining the score

Scoring factors: industry relevance, platform presence quality, clarity of opportunity, DREXONYX portfolio match, geographic market fit.
No markdown, no prose — pure JSON only.`;

function buildUserPrompt(input: SalesLeadScoreInput): string {
  const parts = [
    `Business: ${input.businessName}`,
    `Platform: ${input.primarySourcePlatform}`,
  ];
  if (input.country) parts.push(`Country: ${input.country}`);
  if (input.sourceType) parts.push(`Source type: ${input.sourceType}`);
  if (input.verificationConfidence) parts.push(`Verification confidence: ${input.verificationConfidence}`);
  if (input.opportunity) parts.push(`Opportunity: ${input.opportunity}`);
  if (input.portfolioMatch) parts.push(`Portfolio match: ${input.portfolioMatch}`);
  return parts.join('\n');
}

function validateOutput(parsed: unknown): SalesLeadScoreOutput {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('expected object');
  }
  const o = parsed as Record<string, unknown>;
  const score = typeof o.score === 'number' ? Math.round(o.score) : NaN;
  if (isNaN(score) || score < 0 || score > 100) throw new Error('score must be an integer 0–100');
  if (!['HOT', 'WARM', 'COLD'].includes(o.priority as string)) throw new Error('priority must be HOT, WARM, or COLD');
  if (typeof o.reasoning !== 'string') throw new Error('reasoning must be a string');
  return { score, priority: o.priority as 'HOT' | 'WARM' | 'COLD', reasoning: o.reasoning };
}

export const salesLeadScoreSkill: Skill<SalesLeadScoreInput, SalesLeadScoreOutput> = {
  id: 'sales.lead.score',
  version: '1.0.0',
  family: 'SALES',

  async execute(input: SalesLeadScoreInput, _context: SkillContext): Promise<SkillResult<SalesLeadScoreOutput>> {
    const result = await callAi({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(input),
      maxTokens: 512,
      responseSchema: SCORE_SCHEMA,
    });

    if (!result.ok) {
      return { ok: false, error: result.error, isTransient: result.isTransient };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `LeadScore: AI response is not valid JSON: ${msg.slice(0, 200)}`, isTransient: false };
    }

    try {
      const output = validateOutput(parsed);
      return { ok: true, output };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `LeadScore: AI response missing required fields: ${msg.slice(0, 200)}`, isTransient: false };
    }
  },
};
