// DR 0128: Sales Outreach Draft Skill.
// Drafts a professional outreach message and determines if human approval is required.
// One AI call per execute(). No DB access.
//
// HARD BOUNDARY (DR 0128, DR 0001):
//   - This skill ONLY drafts text — it does NOT send any message
//   - Sending requires HUMAN_APPROVED status via the approval gate
//   - approvalStatus = NOT_REQUIRED only for low-risk standard email cold_outreach / follow_up
//   - All proposals, discounts, pricing, and non-email channels require PENDING approval

import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import type { GeminiSchema } from '../ai/adapter';
import { getApprovalPolicy } from '@/lib/sales/queries';
import type { OutreachChannel } from '@/lib/sales/queries';

export interface SalesOutreachDraftInput {
  businessName: string;
  channel: OutreachChannel;
  messageType: 'cold_outreach' | 'follow_up' | 'proposal';
  opportunity?: string;
  portfolioMatch?: string;
  notes?: string;
  senderName?: string;
  sourcePlatform?: string;
  sourceUrl?: string;
}

export interface SalesOutreachDraftOutput {
  messageText: string;
  approvalStatus: string;
  approvalType?: 'OUTREACH' | 'FOLLOW_UP' | 'PROPOSAL' | 'SENSITIVE_CONTENT';
  hasDiscount: boolean;
  hasPricingOffer: boolean;
  hasContractualCommitment: boolean;
  isSensitiveContent: boolean;
}

const DRAFT_SCHEMA: GeminiSchema = {
  type: 'object',
  properties: {
    messageText:               { type: 'string' },
    hasDiscount:               { type: 'boolean' },
    hasPricingOffer:           { type: 'boolean' },
    hasContractualCommitment:  { type: 'boolean' },
    isSensitiveContent:        { type: 'boolean' },
  },
  required: ['messageText', 'hasDiscount', 'hasPricingOffer', 'hasContractualCommitment', 'isSensitiveContent'],
};

const SYSTEM_PROMPT = `You are a professional sales copywriter for MASTER DIGITAL AGENCY (DREXONYX).

MASTER DIGITAL AGENCY builds professional static websites and landing pages for businesses.

Our core offer:
- AED 599 — one-time payment, not monthly, not a subscription
- A professional static website or landing page, delivered ready to publish
- Domain setup included when the client does not already have a domain (setup only — do not imply ongoing renewal)
- No ongoing commitment

Write a concise, personalized outreach message for a potential client. The message should:
- Be professional but conversational
- Acknowledge the client's specific business context
- Briefly introduce MASTER DIGITAL AGENCY's website service
- Include a clear, low-pressure call to action
- Stay under 150 words for cold_outreach/follow_up, under 300 for proposals

For proposals (messageType=proposal), use this voice and structure:
- Open with a short, confident hook: the business deserves a professional online presence — not a long explanation of customer behaviour
- Connect to the outcome: customers can understand what they offer, see services clearly, know how to reach them
- Introduce MASTER DIGITAL AGENCY as the builder of clean, professional static websites for UAE businesses
- Present the offer: AED 599, one-time. No monthly fees. Domain setup included when they do not already have one (do not imply domain renewal is included)
- Close with: "Ready to put your business online professionally?"
- Do NOT describe the offer as monthly or recurring
- Do NOT mention video content, social media management, brand identity, or ongoing services
- Do NOT invent statistics, guarantees, fake scarcity, discounts, or testimonials

Platform-based personalization (applies to all message types):
- If "Discovery source" is provided in the prompt, naturally reference that platform/context in the opening when it adds genuine value (e.g. "We came across your Instagram page" or "We found your business on Google").
- If the source is unknown, not provided, or referencing it would sound unnatural, use a neutral phrase such as "We came across your business online".
- NEVER invent or assume a platform presence unless the discovery source field explicitly names that platform.
- The core sales message and AED 599 offer must remain platform-independent regardless of source.
- For multi-source leads, use the primary discovery source if provided; do not list multiple platforms.

Also classify any risk flags in the draft:

Return ONLY a valid JSON object with:
- messageText (string): the complete draft message
- hasDiscount (boolean): true if the message offers any discount or promotional pricing
- hasPricingOffer (boolean): true if the message mentions specific prices, rates, or packages
- hasContractualCommitment (boolean): true if the message implies any contractual obligation
- isSensitiveContent (boolean): true if the message contains anything potentially sensitive

No markdown fences, no prose explanation — pure JSON only.`;

function buildUserPrompt(input: SalesOutreachDraftInput): string {
  const sender = input.senderName ?? 'DREXONYX';
  const parts = [
    `Client business: ${input.businessName}`,
    `Channel: ${input.channel}`,
    `Message type: ${input.messageType}`,
    `Sender: ${sender}`,
  ];
  if (input.sourcePlatform) parts.push(`Discovery source: ${input.sourcePlatform}`);
  if (input.sourceUrl) parts.push(`Source URL: ${input.sourceUrl}`);
  if (input.opportunity) parts.push(`Opportunity identified: ${input.opportunity}`);
  if (input.portfolioMatch) parts.push(`Relevant portfolio work: ${input.portfolioMatch}`);
  if (input.notes) parts.push(`Additional context: ${input.notes}`);
  return parts.join('\n');
}

function validateAiOutput(parsed: unknown): {
  messageText: string;
  hasDiscount: boolean;
  hasPricingOffer: boolean;
  hasContractualCommitment: boolean;
  isSensitiveContent: boolean;
} {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('expected object');
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.messageText !== 'string' || !o.messageText.trim()) {
    throw new Error('messageText must be a non-empty string');
  }
  if (typeof o.hasDiscount !== 'boolean') throw new Error('hasDiscount must be boolean');
  if (typeof o.hasPricingOffer !== 'boolean') throw new Error('hasPricingOffer must be boolean');
  if (typeof o.hasContractualCommitment !== 'boolean') throw new Error('hasContractualCommitment must be boolean');
  if (typeof o.isSensitiveContent !== 'boolean') throw new Error('isSensitiveContent must be boolean');
  return {
    messageText: o.messageText,
    hasDiscount: o.hasDiscount,
    hasPricingOffer: o.hasPricingOffer,
    hasContractualCommitment: o.hasContractualCommitment,
    isSensitiveContent: o.isSensitiveContent,
  };
}

function resolveApprovalType(
  messageType: string,
  isSensitiveContent: boolean,
): SalesOutreachDraftOutput['approvalType'] {
  if (messageType === 'proposal') return 'PROPOSAL';
  if (isSensitiveContent) return 'SENSITIVE_CONTENT';
  if (messageType === 'follow_up') return 'FOLLOW_UP';
  return 'OUTREACH';
}

export const salesOutreachDraftSkill: Skill<SalesOutreachDraftInput, SalesOutreachDraftOutput> = {
  id: 'sales.outreach.draft',
  version: '1.0.0',
  family: 'SALES',

  async execute(input: SalesOutreachDraftInput, _context: SkillContext): Promise<SkillResult<SalesOutreachDraftOutput>> {
    const result = await callAi({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(input),
      maxTokens: 1024,
      responseSchema: DRAFT_SCHEMA,
    });

    if (!result.ok) {
      return { ok: false, error: result.error, isTransient: result.isTransient };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `OutreachDraft: AI response is not valid JSON: ${msg.slice(0, 200)}`, isTransient: false };
    }

    let aiOut: ReturnType<typeof validateAiOutput>;
    try {
      aiOut = validateAiOutput(parsed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `OutreachDraft: AI response missing required fields: ${msg.slice(0, 200)}`, isTransient: false };
    }

    // Apply approval policy (pure function — no AI call, no DB access)
    const approvalStatus = getApprovalPolicy({
      channel: input.channel,
      messageType: input.messageType,
      hasDiscount: aiOut.hasDiscount,
      hasContractualCommitment: aiOut.hasContractualCommitment,
      hasPricingOffer: aiOut.hasPricingOffer,
      isSensitiveContent: aiOut.isSensitiveContent,
    });

    const needsApproval = approvalStatus === 'PENDING';

    return {
      ok: true,
      output: {
        messageText: aiOut.messageText,
        approvalStatus,
        approvalType: needsApproval
          ? resolveApprovalType(input.messageType, aiOut.isSensitiveContent)
          : undefined,
        hasDiscount: aiOut.hasDiscount,
        hasPricingOffer: aiOut.hasPricingOffer,
        hasContractualCommitment: aiOut.hasContractualCommitment,
        isSensitiveContent: aiOut.isSensitiveContent,
      },
    };
  },
};
