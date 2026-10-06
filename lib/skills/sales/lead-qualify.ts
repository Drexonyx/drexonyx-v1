// DR 0128: Sales Lead Qualification Skill.
// Determines if a lead should be qualified for outreach and recommends channel/approach.
// One AI call per execute(). No DB access.

import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import type { GeminiSchema } from '../ai/adapter';

export interface SalesLeadQualifyInput {
  businessName: string;
  opportunity?: string;
  portfolioMatch?: string;
  score?: number;
  verificationConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  primarySourcePlatform?: string;
  notes?: string;
}

export interface SalesLeadQualifyOutput {
  qualified: boolean;
  qualificationReason: string;
  recommendedChannel: 'email' | 'instagram' | 'whatsapp' | 'linkedin' | 'manual';
  recommendedMessageType: 'cold_outreach' | 'follow_up' | 'proposal';
}

const QUALIFY_SCHEMA: GeminiSchema = {
  type: 'object',
  properties: {
    qualified:             { type: 'boolean' },
    qualificationReason:   { type: 'string' },
    recommendedChannel:    { type: 'string', enum: ['email', 'instagram', 'whatsapp', 'linkedin', 'manual'] },
    recommendedMessageType:{ type: 'string', enum: ['cold_outreach', 'follow_up', 'proposal'] },
  },
  required: ['qualified', 'qualificationReason', 'recommendedChannel', 'recommendedMessageType'],
};

const SYSTEM_PROMPT = `You are a sales qualification specialist for DREXONYX, a digital marketing agency.

Decide whether this lead should be qualified for outreach. Recommend the best channel and message type.

QUALIFICATION RULES:
- Qualify (true) if the lead has a clear opportunity, decent portfolio match, and credible presence
- Reject (false) if the lead is inactive, has very low score (<30), or no clear DREXONYX service fit
- Channel guidance: email for professional/formal, instagram for social-native brands, linkedin for B2B, manual for complex cases
- Message type: cold_outreach for first contact, follow_up if previously contacted, proposal only for warm/hot leads

Return ONLY a valid JSON object with:
- qualified (boolean)
- qualificationReason (string): 1-2 sentences explaining the decision
- recommendedChannel ("email", "instagram", "whatsapp", "linkedin", or "manual")
- recommendedMessageType ("cold_outreach", "follow_up", or "proposal")

No markdown, no prose — pure JSON only.`;

function buildUserPrompt(input: SalesLeadQualifyInput): string {
  const parts = [`Business: ${input.businessName}`];
  if (input.primarySourcePlatform) parts.push(`Platform: ${input.primarySourcePlatform}`);
  if (input.score !== undefined) parts.push(`Lead score: ${input.score}/100`);
  if (input.verificationConfidence) parts.push(`Verification: ${input.verificationConfidence}`);
  if (input.opportunity) parts.push(`Opportunity: ${input.opportunity}`);
  if (input.portfolioMatch) parts.push(`Portfolio match: ${input.portfolioMatch}`);
  if (input.notes) parts.push(`Notes: ${input.notes}`);
  return parts.join('\n');
}

function validateOutput(parsed: unknown): SalesLeadQualifyOutput {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('expected object');
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.qualified !== 'boolean') throw new Error('qualified must be a boolean');
  if (typeof o.qualificationReason !== 'string') throw new Error('qualificationReason must be a string');
  const validChannels = ['email', 'instagram', 'whatsapp', 'linkedin', 'manual'];
  if (!validChannels.includes(o.recommendedChannel as string)) {
    throw new Error('recommendedChannel must be one of: ' + validChannels.join(', '));
  }
  const validTypes = ['cold_outreach', 'follow_up', 'proposal'];
  if (!validTypes.includes(o.recommendedMessageType as string)) {
    throw new Error('recommendedMessageType must be one of: ' + validTypes.join(', '));
  }
  return {
    qualified: o.qualified,
    qualificationReason: o.qualificationReason,
    recommendedChannel: o.recommendedChannel as SalesLeadQualifyOutput['recommendedChannel'],
    recommendedMessageType: o.recommendedMessageType as SalesLeadQualifyOutput['recommendedMessageType'],
  };
}

export const salesLeadQualifySkill: Skill<SalesLeadQualifyInput, SalesLeadQualifyOutput> = {
  id: 'sales.lead.qualify',
  version: '1.0.0',
  family: 'SALES',

  async execute(input: SalesLeadQualifyInput, _context: SkillContext): Promise<SkillResult<SalesLeadQualifyOutput>> {
    const result = await callAi({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(input),
      maxTokens: 512,
      responseSchema: QUALIFY_SCHEMA,
    });

    if (!result.ok) {
      return { ok: false, error: result.error, isTransient: result.isTransient };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `LeadQualify: AI response is not valid JSON: ${msg.slice(0, 200)}`, isTransient: false };
    }

    try {
      const output = validateOutput(parsed);
      return { ok: true, output };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `LeadQualify: AI response missing required fields: ${msg.slice(0, 200)}`, isTransient: false };
    }
  },
};
