// Autonomous Campaign Preflight — DR 0127
//
// Runs BEFORE the orchestrated task is created.
// Takes a natural-language brief and produces a ready-to-delegate campaign:
//   1. Parse brief   → structured campaign parameters (via callAi)
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
import { extractJson } from '@/lib/skills/ai/extract-json';
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

const VALID_PLACEMENTS = new Set(['feed', 'story', 'reel', 'marketplace', 'search']);
const VALID_PAGE_TARGETS = new Set(['PAGE_1', 'PAGE_2']);

function parseBriefOutput(text: string): ParsedBrief | null {
  try {
    const raw = extractJson(text);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const o = raw as Record<string, unknown>;

    const campaignName = typeof o.campaignName === 'string' ? o.campaignName.trim() : '';
    const campaignObjective = typeof o.campaignObjective === 'string' ? o.campaignObjective.trim() : '';
    const targetAudience = typeof o.targetAudience === 'string' ? o.targetAudience.trim() : '';
    const tone = typeof o.tone === 'string' ? o.tone.trim() : 'professional';
    const pageTarget = VALID_PAGE_TARGETS.has(String(o.pageTarget)) ? (o.pageTarget as 'PAGE_1' | 'PAGE_2') : 'PAGE_1';
    const placement = VALID_PLACEMENTS.has(String(o.placement)) ? (o.placement as ParsedBrief['placement']) : 'feed';
    const rawPublishMode = o.publishMode === 'SCHEDULED' ? 'SCHEDULED' : 'IMMEDIATE';
    const scheduledAt =
      rawPublishMode === 'SCHEDULED' && typeof o.scheduledAt === 'string' && !isNaN(Date.parse(o.scheduledAt))
        ? o.scheduledAt
        : null;
    // AI said SCHEDULED but couldn't provide a valid ISO datetime — downgrade to IMMEDIATE.
    const publishMode: 'IMMEDIATE' | 'SCHEDULED' = rawPublishMode === 'SCHEDULED' && scheduledAt === null ? 'IMMEDIATE' : rawPublishMode;

    if (!campaignObjective || !targetAudience) return null;

    return { campaignName: campaignName || 'DREXONYX Campaign', campaignObjective, targetAudience, tone, pageTarget, placement, publishMode, scheduledAt };
  } catch {
    return null;
  }
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

  const result = await callAi({ systemPrompt, userPrompt: brief, maxTokens: 512 });

  if (!result.ok) {
    return { ok: false, error: result.error, isTransient: result.isTransient };
  }

  // TEMPORARY DIAGNOSTIC — remove once root cause is confirmed (DR 0073: no secrets logged)
  {
    const diagPreview = result.text.slice(0, 2000);
    const diagExtracted = extractJson(result.text);
    const diagObj = diagExtracted && typeof diagExtracted === 'object' && !Array.isArray(diagExtracted)
      ? diagExtracted as Record<string, unknown>
      : null;
    console.error(
      '[DIAG:brief-parser] text_len=%d extracted_type=%s has_objective=%s has_audience=%s preview=%s',
      result.text.length,
      diagExtracted === null ? 'null' : Array.isArray(diagExtracted) ? 'array' : typeof diagExtracted,
      diagObj ? String(!!diagObj.campaignObjective) : 'N/A',
      diagObj ? String(!!diagObj.targetAudience) : 'N/A',
      JSON.stringify(diagPreview),
    );
  }

  const parsed = parseBriefOutput(result.text);
  if (!parsed) {
    return { ok: false, error: 'Brief parser returned unparseable output', isTransient: false };
  }

  return { ok: true, parsed };
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
