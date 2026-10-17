// DR 0128: Sales Lead Verification Skill.
// Assesses the credibility and activity level of a discovered lead.
// One AI call per execute(). No DB access. No external API calls.

import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import type { GeminiSchema } from '../ai/adapter';

export interface SalesLeadVerifyInput {
  businessName: string;
  primarySourcePlatform: string;
  primarySourceUrl?: string;
  website?: string;
  publicEmail?: string;
  notes?: string;
}

export interface SalesLeadVerifyOutput {
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  verificationNotes: string;
  isActive: boolean;
  suggestedCategory: string;
}

const VERIFY_SCHEMA: GeminiSchema = {
  type: 'object',
  properties: {
    confidence:        { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
    verificationNotes: { type: 'string' },
    isActive:          { type: 'boolean' },
    suggestedCategory: { type: 'string' },
  },
  required: ['confidence', 'verificationNotes', 'isActive', 'suggestedCategory'],
};

const SYSTEM_PROMPT = `You are a sales research analyst for a digital marketing agency (DREXONYX).
Your task: assess the credibility and activity level of a potential lead based on available information.

Return ONLY a valid JSON object with:
- confidence ("HIGH", "MEDIUM", or "LOW"): how confident are you this is a real, active business?
  HIGH = multiple credible signals, active online presence
  MEDIUM = some evidence of activity, minor gaps or inconsistencies
  LOW = sparse information, possibly inactive, uncertain identity
- verificationNotes (string): 1-2 sentence explanation of the confidence assessment
- isActive (boolean): true if the business appears to be currently operating
- suggestedCategory (string): industry/niche category (e.g., "e-commerce", "restaurant", "fashion brand", "real estate", "fitness")

No markdown, no prose — pure JSON only.`;

function buildUserPrompt(input: SalesLeadVerifyInput): string {
  const parts = [
    `Business name: ${input.businessName}`,
    `Platform: ${input.primarySourcePlatform}`,
  ];
  if (input.primarySourceUrl) parts.push(`Profile URL: ${input.primarySourceUrl}`);
  if (input.website) parts.push(`Website: ${input.website}`);
  if (input.publicEmail) parts.push(`Public email: ${input.publicEmail}`);
  if (input.notes) parts.push(`Notes: ${input.notes}`);
  return parts.join('\n');
}

function validateOutput(parsed: unknown): SalesLeadVerifyOutput {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('expected object');
  }
  const o = parsed as Record<string, unknown>;
  if (!['HIGH', 'MEDIUM', 'LOW'].includes(o.confidence as string)) {
    throw new Error('confidence must be HIGH, MEDIUM, or LOW');
  }
  if (typeof o.verificationNotes !== 'string') throw new Error('verificationNotes must be a string');
  if (typeof o.isActive !== 'boolean') throw new Error('isActive must be a boolean');
  if (typeof o.suggestedCategory !== 'string') throw new Error('suggestedCategory must be a string');
  return {
    confidence: o.confidence as 'HIGH' | 'MEDIUM' | 'LOW',
    verificationNotes: o.verificationNotes,
    isActive: o.isActive,
    suggestedCategory: o.suggestedCategory,
  };
}

export const salesLeadVerifySkill: Skill<SalesLeadVerifyInput, SalesLeadVerifyOutput> = {
  id: 'sales.lead.verify',
  version: '1.0.0',
  family: 'SALES',

  async execute(input: SalesLeadVerifyInput, _context: SkillContext): Promise<SkillResult<SalesLeadVerifyOutput>> {
    const result = await callAi({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(input),
      maxTokens: 512,
      responseSchema: VERIFY_SCHEMA,
    });

    if (!result.ok) {
      return { ok: false, error: result.error, isTransient: result.isTransient };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `LeadVerify: AI response is not valid JSON: ${msg.slice(0, 200)}`, isTransient: false };
    }

    try {
      const output = validateOutput(parsed);
      return { ok: true, output };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `LeadVerify: AI response missing required fields: ${msg.slice(0, 200)}`, isTransient: false };
    }
  },
};
