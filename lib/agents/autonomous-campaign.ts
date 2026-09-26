// Autonomous Campaign Preflight — DR 0127
//
// Runs BEFORE the orchestrated task is created.
// Takes a natural-language brief and produces a ready-to-delegate campaign:
//   1. Parse brief   → structured campaign parameters (via callAi + responseSchema)
//   2. Strategy      → campaign angles, themes, keyMessages (strategy.campaign.develop)
//   3. Caption       → Facebook-optimised caption + headline (script.social_caption.generate)
//
// The generated captionText is then passed to delegateMarketingCampaign, which
// runs the existing QC + policy + publish pipeline unchanged.
//
// CONSTRAINTS:
//   - Callers must be OWNER or ADMIN_OPERATIONS (delegateMarketingCampaign enforces this)
//   - callAi is called here only for brief parsing; skills call it internally per DR 0073 §2.6
//   - strategyCampaignDevelopSkill and scriptSocialCaptionSkill each make exactly one AI call
//   - Total AI calls per autonomous run: 3 (parse + strategy + caption)

import { callAi } from '@/lib/skills/ai/adapter';
import type { GeminiSchema } from '@/lib/skills/ai/adapter';
import { strategyCampaignDevelopSkill } from '@/lib/skills/strategy/campaign-develop';
import { scriptSocialCaptionSkill } from '@/lib/skills/script/social-caption';
import type { SkillContext } from '@/lib/skills/interface';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AutonomousCampaignPreflightParams {
  brief: string;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: 'OWNER' | 'ADMIN_OPERATIONS';
}

export interface AutonomousCampaignPreflightOk {
  ok: true;
  captionText: string;
  headline: string | undefined;
  campaignNameSuggestion: string;
  pageTarget: 'PAGE_1' | 'PAGE_2';
  placement: 'feed' | 'story' | 'reel' | 'marketplace' | 'search';
  publishMode: 'IMMEDIATE' | 'SCHEDULED';
  scheduledAt: string | undefined;
  strategyAngles: string[];
  strategyKeyMessages: string[];
}

export type AutonomousCampaignPreflightResult =
  | AutonomousCampaignPreflightOk
  | { ok: false; error: string; isTransient: boolean };

// ── Parsed brief ───────────────────────────────────────────────────────────────

interface ParsedBrief {
  campaignName: string;
  campaignObjective: string;
  targetAudience: string;
  tone: string;
  pageTarget: 'PAGE_1' | 'PAGE_2';
  placement: 'feed' | 'story' | 'reel' | 'marketplace' | 'search';
  publishMode: 'IMMEDIATE' | 'SCHEDULED';
  scheduledAt: string | null;
}

const BRIEF_SCHEMA: GeminiSchema = {
  type: 'object',
  properties: {
    campaignName: { type: 'string' },
    campaignObjective: { type: 'string' },
    targetAudience: { type: 'string' },
    tone: { type: 'string', enum: ['professional', 'casual', 'energetic', 'inspiring', 'authoritative'] },
    pageTarget: { type: 'string', enum: ['PAGE_1', 'PAGE_2'] },
    placement: { type: 'string', enum: ['feed', 'story', 'reel', 'marketplace', 'search'] },
    publishMode: { type: 'string', enum: ['IMMEDIATE', 'SCHEDULED'] },
    scheduledAt: { type: 'string', nullable: true },
  },
  required: ['campaignName', 'campaignObjective', 'targetAudience', 'tone', 'pageTarget', 'placement', 'publishMode', 'scheduledAt'],
};

const VALID_PLACEMENTS = new Set(['feed', 'story', 'reel', 'marketplace', 'search']);
const VALID_PAGE_TARGETS = new Set(['PAGE_1', 'PAGE_2']);

function validateBriefOutput(parsed: unknown): ParsedBrief {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('expected object');
  }
  const o = parsed as Record<string, unknown>;

  const campaignObjective = typeof o.campaignObjective === 'string' ? o.campaignObjective.trim() : '';
  if (!campaignObjective) throw new Error('campaignObjective must be a non-empty string');

  const targetAudience = typeof o.targetAudience === 'string' ? o.targetAudience.trim() : '';
  if (!targetAudience) throw new Error('targetAudience must be a non-empty string');

  const campaignName = typeof o.campaignName === 'string' && o.campaignName.trim()
    ? o.campaignName.trim()
    : 'DREXONYX Campaign';
  const tone = typeof o.tone === 'string' ? o.tone.trim() : 'professional';
  const pageTarget = VALID_PAGE_TARGETS.has(String(o.pageTarget)) ? (o.pageTarget as 'PAGE_1' | 'PAGE_2') : 'PAGE_1';
  const placement = VALID_PLACEMENTS.has(String(o.placement)) ? (o.placement as ParsedBrief['placement']) : 'feed';
  const rawPublishMode = o.publishMode === 'SCHEDULED' ? 'SCHEDULED' : 'IMMEDIATE';
  const rawScheduledAt = o.scheduledAt;
  const scheduledAt =
    rawPublishMode === 'SCHEDULED' &&
    typeof rawScheduledAt === 'string' &&
    !isNaN(Date.parse(rawScheduledAt))
      ? rawScheduledAt
      : null;
  // AI said SCHEDULED but couldn't provide a valid ISO datetime — downgrade to IMMEDIATE.
  const publishMode: 'IMMEDIATE' | 'SCHEDULED' =
    rawPublishMode === 'SCHEDULED' && scheduledAt === null ? 'IMMEDIATE' : rawPublishMode;

  return { campaignName, campaignObjective, targetAudience, tone, pageTarget, placement, publishMode, scheduledAt };
}

async function parseBrief(
  brief: string,
): Promise<{ ok: true; parsed: ParsedBrief } | { ok: false; error: string; isTransient: boolean }> {
  const currentUtc = new Date().toISOString();

  const systemPrompt = `You are a campaign brief parser for DREXONYX, a premium video production studio.
Extract structured campaign parameters from the user's natural-language brief.
The current UTC datetime is: ${currentUtc}

Return ONLY valid JSON matching this exact schema:
{
  "campaignName": "short descriptive name for this campaign (3–6 words)",
  "campaignObjective": "what this campaign aims to achieve",
  "targetAudience": "who this campaign targets",
  "tone": "one of: professional, casual, energetic, inspiring, authoritative",
  "pageTarget": "PAGE_1 or PAGE_2 — PAGE_1 is the main DREXONYX page; use PAGE_1 unless the brief mentions a secondary or alternate page",
  "placement": "one of: feed, story, reel, marketplace, search — default to feed unless the brief specifies otherwise",
  "publishMode": "IMMEDIATE or SCHEDULED — use SCHEDULED only if the brief specifies a future date or time",
  "scheduledAt": "ISO 8601 datetime string when publishMode is SCHEDULED (compute from the relative expression and the current UTC time above), otherwise null"
}
No markdown, no explanation. Return only the JSON object.`;

  const result = await callAi({ systemPrompt, userPrompt: brief, maxTokens: 512, responseSchema: BRIEF_SCHEMA });

  if (!result.ok) {
    return { ok: false, error: result.error, isTransient: result.isTransient };
  }

  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(result.text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Brief parser returned malformed JSON: ${msg.slice(0, 200)}`, isTransient: false };
  }

  try {
    const parsed = validateBriefOutput(rawParsed);
    return { ok: true, parsed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Brief parser returned invalid fields: ${msg.slice(0, 300)}`, isTransient: false };
  }
}

// ── runAutonomousCampaignPreflight ─────────────────────────────────────────────

export async function runAutonomousCampaignPreflight(
  params: AutonomousCampaignPreflightParams,
): Promise<AutonomousCampaignPreflightResult> {
  const { brief, organizationId, initiatedByUserId, initiatorRole } = params;

  const context: SkillContext = {
    organizationId,
    actorId: initiatedByUserId,
    actorType: 'USER',
    actorRole: initiatorRole,
  };

  // ── Step 1: parse brief ────────────────────────────────────────────────────
  const parsedResult = await parseBrief(brief);
  if (!parsedResult.ok) {
    return { ok: false, error: `Brief parsing failed: ${parsedResult.error}`, isTransient: parsedResult.isTransient };
  }
  const { parsed } = parsedResult;

  // ── Step 2: strategy.campaign.develop ─────────────────────────────────────
  const strategyResult = await strategyCampaignDevelopSkill.execute(
    {
      objective: parsed.campaignObjective,
      targetAudience: parsed.targetAudience,
      brand: 'DREXONYX',
    },
    context,
  );
  if (!strategyResult.ok) {
    return { ok: false, error: `Strategy generation failed: ${strategyResult.error}`, isTransient: strategyResult.isTransient };
  }
  const strategy = strategyResult.output;

  // ── Step 3: script.social_caption.generate ────────────────────────────────
  const captionResult = await scriptSocialCaptionSkill.execute(
    {
      platform: 'Facebook',
      objective: parsed.campaignObjective,
      tone: parsed.tone,
      keyMessage: strategy.keyMessages[0] ?? parsed.campaignObjective,
    },
    context,
  );
  if (!captionResult.ok) {
    return { ok: false, error: `Caption generation failed: ${captionResult.error}`, isTransient: captionResult.isTransient };
  }
  const caption = captionResult.output;

  return {
    ok: true,
    captionText: caption.caption,
    headline: caption.alternatives[0] ?? undefined,
    campaignNameSuggestion: parsed.campaignName,
    pageTarget: parsed.pageTarget,
    placement: parsed.placement,
    publishMode: parsed.publishMode,
    scheduledAt: parsed.scheduledAt ?? undefined,
    strategyAngles: strategy.angles,
    strategyKeyMessages: strategy.keyMessages,
  };
}
