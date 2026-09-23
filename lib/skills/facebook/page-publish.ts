// DR 0126: facebook.page.publish — organic Page post skill.
// Publishes approved content (text, image, or video) to an allowlisted DREXONYX
// Facebook Page via the Meta Graph API v21.0.
//
// CONSTRAINTS (DR 0126):
//   - Called ONLY after HUMAN_GATE approval (step 4 of COORDINATE_MARKETING_CAMPAIGN)
//   - Only META_PAGE_ID_1 and META_PAGE_ID_2 are authorized targets (two-page allowlist)
//   - mediaUrl MUST originate from project R2 storage (derived from R2_ENDPOINT / R2_ACCOUNT_ID)
//   - No paid ads, no boosts, no Ads Manager API calls — zero spend
//   - META_PAGE_ACCESS_TOKEN never logged, returned, or included in any payload
//   - Publishing to feed placement only in this DR

import type { Skill, SkillContext, SkillResult } from '../interface';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';
const SCHEDULE_MIN_MS = 10 * 60 * 1000;           // 10 minutes
const SCHEDULE_MAX_MS = 75 * 24 * 60 * 60 * 1000; // 75 days

export type FacebookPageTarget = 'PAGE_1' | 'PAGE_2';
export type FacebookContentType = 'TEXT' | 'IMAGE' | 'VIDEO';
export type FacebookPublishMode = 'IMMEDIATE' | 'SCHEDULED';

export type FacebookPublishFailReason =
  | 'MISSING_CREDENTIAL'
  | 'UNAUTHORIZED_PAGE'
  | 'MEDIA_REQUIRED'
  | 'MEDIA_URL_DOMAIN_REJECTED'
  | 'SCHEDULE_TIME_REQUIRED'
  | 'SCHEDULE_WINDOW_VIOLATED'
  | 'GRAPH_API_ERROR';

export interface FacebookPagePublishInput {
  pageTarget: FacebookPageTarget;
  contentType: FacebookContentType;
  /** Approved caption / post text. Posted verbatim — no AI generation at publish time. */
  message: string;
  /** R2 URL for image or video. Required when contentType is IMAGE or VIDEO. */
  mediaUrl?: string;
  publishMode: FacebookPublishMode;
  /** ISO 8601 datetime. Required when publishMode is SCHEDULED. */
  scheduledAt?: string;
  /** Campaign identifier for audit correlation. */
  campaignId: string;
}

export interface FacebookPagePublishOutput {
  postId: string;
  pageId: string;
  publishMode: FacebookPublishMode;
  scheduledAt?: string;
}

// Derives the R2 storage origin for mediaUrl validation (DR 0126 §media-url-validation).
// Duplicates the endpoint derivation from lib/infrastructure/object-storage.ts intentionally
// to avoid importing the S3 client initialization logic into a skill module.
function r2Origin(): string | null {
  const explicit = process.env.R2_ENDPOINT;
  if (explicit) {
    try { return new URL(explicit.replace(/\/$/, '')).origin; } catch { return null; }
  }
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) return null;
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function buildPageAllowlist(): Map<FacebookPageTarget, string> {
  const m = new Map<FacebookPageTarget, string>();
  const id1 = process.env.META_PAGE_ID_1?.trim();
  const id2 = process.env.META_PAGE_ID_2?.trim();
  if (id1) m.set('PAGE_1', id1);
  if (id2) m.set('PAGE_2', id2);
  return m;
}

interface GraphApiSuccess { ok: true; id: string }
interface GraphApiFailure { ok: false; errorCode: number; errorSubcode?: number; errorMessage: string; isTransient: boolean }

async function callGraphApi(
  endpoint: string,
  token: string,
  body: Record<string, unknown>,
): Promise<GraphApiSuccess | GraphApiFailure> {
  let res: Response;
  try {
    res = await fetch(`${GRAPH_API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return {
      ok: false,
      errorCode: 0,
      errorMessage: e instanceof Error ? e.message : 'Network error',
      isTransient: true,
    };
  }

  let json: Record<string, unknown>;
  try {
    json = await res.json() as Record<string, unknown>;
  } catch {
    return { ok: false, errorCode: res.status, errorMessage: `HTTP ${res.status} (non-JSON body)`, isTransient: res.status >= 500 };
  }

  if (res.ok && typeof json.id === 'string') {
    return { ok: true, id: json.id };
  }

  const err = json.error as Record<string, unknown> | undefined;
  return {
    ok: false,
    errorCode: typeof err?.code === 'number' ? err.code : res.status,
    errorSubcode: typeof err?.error_subcode === 'number' ? err.error_subcode : undefined,
    errorMessage: typeof err?.message === 'string' ? err.message : `HTTP ${res.status}`,
    isTransient: res.status >= 500,
  };
}

export const facebookPagePublishSkill: Skill<FacebookPagePublishInput, FacebookPagePublishOutput> = {
  id: 'facebook.page.publish',
  version: '1.0.0',
  family: 'SOCIAL',

  async execute(
    input: FacebookPagePublishInput,
    _context: SkillContext,
  ): Promise<SkillResult<FacebookPagePublishOutput>> {
    const fail = (reason: FacebookPublishFailReason, msg: string, isTransient = false): SkillResult<FacebookPagePublishOutput> => ({
      ok: false,
      error: `[${reason}] ${msg}`,
      isTransient,
    });

    // 1. Credential check
    const token = process.env.META_PAGE_ACCESS_TOKEN?.trim();
    if (!token) {
      return fail('MISSING_CREDENTIAL', 'META_PAGE_ACCESS_TOKEN is not set');
    }

    // 2. Two-page allowlist enforcement (DR 0126)
    const allowlist = buildPageAllowlist();
    if (allowlist.size === 0) {
      return fail('MISSING_CREDENTIAL', 'No authorized page IDs configured (META_PAGE_ID_1 and META_PAGE_ID_2 are both absent)');
    }
    const pageId = allowlist.get(input.pageTarget);
    if (!pageId) {
      return fail('UNAUTHORIZED_PAGE', `pageTarget '${input.pageTarget}' is not in the authorized page allowlist`);
    }

    // 3. Media URL validation — must be from project R2 storage
    if (input.contentType === 'IMAGE' || input.contentType === 'VIDEO') {
      if (!input.mediaUrl) {
        return fail('MEDIA_REQUIRED', `mediaUrl is required for contentType ${input.contentType}`);
      }
      const origin = r2Origin();
      if (!origin) {
        return fail('MISSING_CREDENTIAL', 'R2 origin cannot be determined (R2_ENDPOINT and R2_ACCOUNT_ID are both absent)');
      }
      let parsedOrigin: string;
      try {
        parsedOrigin = new URL(input.mediaUrl).origin;
      } catch {
        return fail('MEDIA_URL_DOMAIN_REJECTED', 'mediaUrl is not a valid URL');
      }
      if (parsedOrigin !== origin) {
        return fail('MEDIA_URL_DOMAIN_REJECTED', `mediaUrl origin '${parsedOrigin}' is not from the authorized R2 storage`);
      }
    }

    // 4. Scheduling validation
    let scheduledPublishTime: number | undefined;
    if (input.publishMode === 'SCHEDULED') {
      if (!input.scheduledAt) {
        return fail('SCHEDULE_TIME_REQUIRED', 'scheduledAt is required when publishMode is SCHEDULED');
      }
      const ts = Date.parse(input.scheduledAt);
      if (isNaN(ts)) {
        return fail('SCHEDULE_WINDOW_VIOLATED', `scheduledAt '${input.scheduledAt}' is not a valid ISO 8601 date`);
      }
      const delta = ts - Date.now();
      if (delta < SCHEDULE_MIN_MS) {
        return fail('SCHEDULE_WINDOW_VIOLATED', 'scheduledAt must be at least 10 minutes in the future');
      }
      if (delta > SCHEDULE_MAX_MS) {
        return fail('SCHEDULE_WINDOW_VIOLATED', 'scheduledAt must be no more than 75 days in the future');
      }
      scheduledPublishTime = Math.floor(ts / 1000);
    }

    // 5. Build Graph API request — organic feed post only (DR 0126)
    const published = input.publishMode === 'IMMEDIATE';
    const scheduleParams = scheduledPublishTime !== undefined
      ? { scheduled_publish_time: scheduledPublishTime }
      : {};

    let endpoint: string;
    let body: Record<string, unknown>;

    switch (input.contentType) {
      case 'TEXT':
        endpoint = `${pageId}/feed`;
        body = { message: input.message, published, ...scheduleParams };
        break;
      case 'IMAGE':
        endpoint = `${pageId}/photos`;
        body = { url: input.mediaUrl!, caption: input.message, published, ...scheduleParams };
        break;
      case 'VIDEO':
        endpoint = `${pageId}/videos`;
        body = { file_url: input.mediaUrl!, description: input.message, published, ...scheduleParams };
        break;
    }

    // 6. Call Graph API
    const apiResult = await callGraphApi(endpoint!, token, body!);
    if (!apiResult.ok) {
      const codeTag = apiResult.errorCode > 0 ? `:${apiResult.errorCode}` : '';
      return {
        ok: false,
        error: `[GRAPH_API_ERROR${codeTag}] ${apiResult.errorMessage}`,
        isTransient: apiResult.isTransient,
      };
    }

    return {
      ok: true,
      output: {
        postId: apiResult.id,
        pageId,
        publishMode: input.publishMode,
        ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
      },
    };
  },
};
