// Direct Facebook Publish Agent — zero Anthropic dependency.
// 3-step plan: qc.facebook_policy.check → facebook.page.publish → NOTIFICATION.
//
// No qc.script.review, no qc.brand.alignment, no callAi() calls in this path.
// Use this path when AI QC is unavailable or not required for DREXONYX content.
// The existing marketing-campaign-specialist path (with AI QC) remains unchanged.
//
// CONSTRAINTS:
//   - Initiator roles: OWNER, ADMIN_OPERATIONS only
//   - mediaUrl MUST originate from project R2 storage (enforced in skill)
//   - pageTarget must be PAGE_1 or PAGE_2 (validated here and in skill runtime)
//   - Zero paid ads, boosts, or Ads Manager calls — organic only
//   - qc.facebook_policy.check is mandatory and cannot be bypassed

import { delegateSubTask } from '@/lib/orchestration/delegation';
import type { InitiatorRole, TaskContext } from '@/lib/orchestration/types';
import type { FacebookPageTarget, FacebookContentType, FacebookPublishMode } from '@/lib/skills/facebook/page-publish';

const ALLOWED_PAGE_TARGETS: ReadonlySet<string> = new Set(['PAGE_1', 'PAGE_2']);

export interface DirectFacebookPublishParams {
  /** null when initiated directly from the admin UI (no parent agent task). */
  parentTaskId: string | null;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: Extract<InitiatorRole, 'OWNER' | 'ADMIN_OPERATIONS'>;
  /** Campaign identifier for tracking and audit. */
  campaignId: string;
  /** The post caption text. Posted verbatim after Facebook policy check. */
  captionText: string;
  /** Optional ad headline (validated by qc.facebook_policy.check). */
  headline?: string;
  /** Facebook placement context for policy check. Defaults to 'feed'. */
  placement?: 'feed' | 'story' | 'reel' | 'marketplace' | 'search';
  /** Target page. Defaults to 'PAGE_1'. */
  pageTarget?: FacebookPageTarget;
  /** Content type. Defaults to 'TEXT'. */
  contentType?: FacebookContentType;
  /** R2 URL for media. Required when contentType is IMAGE or VIDEO. */
  mediaUrl?: string;
  /** Publish mode. Defaults to 'IMMEDIATE'. */
  publishMode?: FacebookPublishMode;
  /** ISO 8601 datetime. Required when publishMode is SCHEDULED. */
  scheduledAt?: string;
  context?: TaskContext;
}

export type DirectFacebookPublishResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegateDirectFacebookPublish(
  params: DirectFacebookPublishParams,
): Promise<DirectFacebookPublishResult> {
  const {
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    campaignId,
    captionText,
    headline,
    placement,
    pageTarget = 'PAGE_1',
    contentType = 'TEXT',
    mediaUrl,
    publishMode = 'IMMEDIATE',
    scheduledAt,
    context,
  } = params;

  if (initiatorRole !== 'OWNER' && initiatorRole !== 'ADMIN_OPERATIONS') {
    return { ok: false, error: 'Direct Facebook publish may only be initiated by OWNER or ADMIN_OPERATIONS' };
  }
  if (!ALLOWED_PAGE_TARGETS.has(pageTarget)) {
    return { ok: false, error: `pageTarget '${pageTarget}' is not an authorized Facebook page` };
  }
  if (!campaignId || typeof campaignId !== 'string') {
    return { ok: false, error: 'campaignId must be a non-empty string' };
  }
  if (!captionText || typeof captionText !== 'string') {
    return { ok: false, error: 'captionText must be a non-empty string' };
  }
  if ((contentType === 'IMAGE' || contentType === 'VIDEO') && !mediaUrl) {
    return { ok: false, error: `mediaUrl is required when contentType is ${contentType}` };
  }
  if (publishMode === 'SCHEDULED' && !scheduledAt) {
    return { ok: false, error: 'scheduledAt is required when publishMode is SCHEDULED' };
  }
  if (scheduledAt && isNaN(Date.parse(scheduledAt))) {
    return { ok: false, error: `scheduledAt '${scheduledAt}' is not a valid ISO 8601 date` };
  }

  // 3-step plan — no AI calls in any step:
  //   0: qc.facebook_policy.check  (deterministic, zero AI)
  //   1: facebook.page.publish     (Meta Graph API, zero AI)
  //   2: NOTIFICATION
  const steps = [
    {
      step_index: 0,
      step_type: 'SKILL' as const,
      skill_id: 'qc.facebook_policy.check',
      input: {
        text: captionText,
        ...(headline ? { headline } : {}),
        placement: placement ?? 'feed',
      },
    },
    {
      step_index: 1,
      step_type: 'SKILL' as const,
      skill_id: 'facebook.page.publish',
      input: {
        pageTarget,
        contentType,
        message: captionText,
        ...(mediaUrl ? { mediaUrl } : {}),
        publishMode,
        ...(scheduledAt ? { scheduledAt } : {}),
        campaignId,
      },
    },
    {
      step_index: 2,
      step_type: 'NOTIFICATION' as const,
      input: { event: 'CAMPAIGN_WORKFLOW_COMPLETED', campaignId },
    },
  ];

  const plan = { steps, generated_at: new Date().toISOString() };

  return delegateSubTask({
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    intentType: 'COORDINATE_MARKETING_CAMPAIGN',
    title: `Direct FB publish: ${campaignId}`,
    context: context ?? { campaign_id: campaignId },
    plan,
  });
}
