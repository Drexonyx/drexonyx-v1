// DR 0128: Sales Lead Discovery Skill.
// Extracts structured lead data from raw text (search result, social profile, website copy).
// One AI call per execute(). No DB access. No external API calls.
//
// CONSTRAINTS (DR 0128, DR 0001):
//   - contact_email / personal phone NEVER emitted in output (PII boundary)
//   - Only public business contact info (public_email field) is allowed
//   - No scraping directives — caller must supply rawData already retrieved
//   - Social platforms: profile URLs only, no API access

import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import type { GeminiSchema } from '../ai/adapter';

export interface SalesLeadDiscoverInput {
  rawData: string;
  primarySourcePlatform: string;
  primarySourceUrl?: string;
  sourceType: 'social_profile' | 'website' | 'directory' | 'websearch' | 'referral' | 'manual';
}

export interface SalesLeadDiscoverOutput {
  businessName: string;
  fullName?: string;
  country?: string;
  city?: string;
  website?: string;
  publicEmail?: string;
  publicContactMethod?: string;
  opportunity?: string;
  portfolioMatch?: string;
  notes?: string;
}

const DISCOVER_SCHEMA: GeminiSchema = {
  type: 'object',
  properties: {
    businessName:         { type: 'string' },
    fullName:             { type: 'string', nullable: true },
    country:              { type: 'string', nullable: true },
    city:                 { type: 'string', nullable: true },
    website:              { type: 'string', nullable: true },
    publicEmail:          { type: 'string', nullable: true },
    publicContactMethod:  { type: 'string', nullable: true },
    opportunity:          { type: 'string', nullable: true },
    portfolioMatch:       { type: 'string', nullable: true },
    notes:                { type: 'string', nullable: true },
  },
  required: ['businessName'],
};

const SYSTEM_PROMPT = `You are a sales research assistant for a digital marketing agency (DREXONYX).
Your task: extract structured lead information from raw business profile or web search data.

Return ONLY a valid JSON object with these fields:
- businessName (string, required): the company or brand name
- fullName (string or null): owner/contact full name if clearly visible
- country (string or null): country of operation
- city (string or null): city of operation
- website (string or null): official website URL
- publicEmail (string or null): ONLY if the email is publicly listed on the profile/page (NOT personal emails, NOT scraped). Return null if absent or unclear.
- publicContactMethod (string or null): any other public contact method visible on the profile
- opportunity (string or null): short phrase describing how DREXONYX could help them (e.g. "social media content", "video ads", "brand identity")
- portfolioMatch (string or null): which type of DREXONYX work would fit this client (e.g. "e-commerce video", "restaurant reels", "fashion brand")
- notes (string or null): other relevant observations about the business

Rules:
- NEVER include private emails, phone numbers not publicly listed, or personal information
- businessName must not be empty; use the domain or handle if no formal name is visible
- No markdown, no prose — pure JSON only`;

function buildUserPrompt(input: SalesLeadDiscoverInput): string {
  const parts = [
    `Platform: ${input.primarySourcePlatform}`,
    `Source type: ${input.sourceType}`,
  ];
  if (input.primarySourceUrl) parts.push(`URL: ${input.primarySourceUrl}`);
  parts.push(`\nRAW DATA:\n${input.rawData}`);
  return parts.join('\n');
}

function validateOutput(parsed: unknown): SalesLeadDiscoverOutput {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('expected object');
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.businessName !== 'string' || !o.businessName.trim()) {
    throw new Error('businessName must be a non-empty string');
  }
  return {
    businessName: o.businessName,
    fullName:             typeof o.fullName === 'string' ? o.fullName : undefined,
    country:              typeof o.country === 'string' ? o.country : undefined,
    city:                 typeof o.city === 'string' ? o.city : undefined,
    website:              typeof o.website === 'string' ? o.website : undefined,
    publicEmail:          typeof o.publicEmail === 'string' ? o.publicEmail : undefined,
    publicContactMethod:  typeof o.publicContactMethod === 'string' ? o.publicContactMethod : undefined,
    opportunity:          typeof o.opportunity === 'string' ? o.opportunity : undefined,
    portfolioMatch:       typeof o.portfolioMatch === 'string' ? o.portfolioMatch : undefined,
    notes:                typeof o.notes === 'string' ? o.notes : undefined,
  };
}

export const salesLeadDiscoverSkill: Skill<SalesLeadDiscoverInput, SalesLeadDiscoverOutput> = {
  id: 'sales.lead.discover',
  version: '1.0.0',
  family: 'SALES',

  async execute(input: SalesLeadDiscoverInput, _context: SkillContext): Promise<SkillResult<SalesLeadDiscoverOutput>> {
    const result = await callAi({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(input),
      maxTokens: 1024,
      responseSchema: DISCOVER_SCHEMA,
    });

    if (!result.ok) {
      return { ok: false, error: result.error, isTransient: result.isTransient };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `LeadDiscover: AI response is not valid JSON: ${msg.slice(0, 200)}`, isTransient: false };
    }

    try {
      const output = validateOutput(parsed);
      return { ok: true, output };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `LeadDiscover: AI response missing required fields: ${msg.slice(0, 200)}`, isTransient: false };
    }
  },
};
