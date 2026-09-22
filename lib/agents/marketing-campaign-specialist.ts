// Marketing Campaign Specialist Agent — DR 0124 + DR 0126
// Coordinates Facebook marketing campaign workflow:
//   content quality check → brand alignment → platform policy check →
//   mandatory human approval gate → facebook.page.publish → completion notification.
//
// CONSTRAINTS (DR 0124 / DR 0126):
//   - facebook.page.publish executes ONLY after HUMAN_GATE approval
//   - Human approval (OWNER or ADMIN_OPERATIONS) MANDATORY before publish step
//   - No autonomous publishing under any circumstances
//   - No financial mutations of any kind
//   - No content fabrication, invented metrics, or testimonials
//   - Initiator roles: OWNER, ADMIN_OPERATIONS only
//   - mediaUrl MUST originate from project R2 storage (enforced in skill)
//   - Two-page allowlist enforced at skill runtime (META_PAGE_ID_1 / META_PAGE_ID_2)
//   - Zero paid ads, boosts, or Ads Manager calls — organic only

import { delegateSubTask } from '@/lib/orchestration/delegation';
import type { InitiatorRole, TaskContext } from '@/lib/orchestration/types';
import type { FacebookPageTarget, FacebookContentType, FacebookPublishMode } from '@/lib/skills/facebook/page-publish';

export interface MarketingCampaignDelegationParams {
  parentTaskId: string;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: Extract<InitiatorRole, 'OWNER' | 'ADMIN_OPERATIONS'>;
  /** Campaign identifier for tracking and audit. */
  campaignId: string;
  /** The post caption text to be reviewed and approved. Posted verbatim. */
  captionText: string;
  /** Optional ad headline (validated by facebook_policy.check). */
  headline?: string;
  /** Facebook placement context for policy check. Defaults to 'feed'. */
  placement?: 'feed' | 'story' | 'reel' | 'marketplace' | 'search';
  /** Optional brand guidelines for qc.brand.alignment. */
  brandGuidelines?: string;
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

export type MarketingCampaignDelegationResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegateMarketingCampaign(
  params: MarketingCampaignDelegationParams,
): Promise<MarketingCampaignDelegationResult> {
  const {
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    campaignId,
    captionText,
    headline,
    placement,
    brandGuidelines,
    pageTarget = 'PAGE_1',
    contentType = 'TEXT',
    mediaUrl,
    publishMode = 'IMMEDIATE',
    scheduledAt,
    context,
  } = params;

  if (initiatorRole !== 'OWNER' && initiatorRole !== 'ADMIN_OPERATIONS') {
    return { ok: false, error: 'Marketing campaign may only be initiated by OWNER or ADMIN_OPERATIONS' };
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

  // DR 0124 + DR 0126: fixed six-step plan
  // Step 0: SKILL — qc.script.review: content quality (AI, AGENT_ALLOWLIST)
  // Step 1: SKILL — qc.brand.alignment: brand compliance (AI, AGENT_ALLOWLIST)
  // Step 2: SKILL — qc.facebook_policy.check: platform policy (deterministic, AGENT_ALLOWLIST)
  // Step 3: HUMAN_GATE — mandatory publish approval (OWNER or ADMIN_OPERATIONS)
  // Step 4: SKILL — facebook.page.publish: organic Graph API publish (post-gate, DR 0126)
  // Step 5: NOTIFICATION — campaign completion or failure alert
  const plan = {
    steps: [
      {
        step_index: 0,
        step_type: 'SKILL' as const,
        skill_id: 'qc.script.review',
        input: {
          script: captionText,
          ...(brandGuidelines ? { brandGuidelines } : {}),
          objectives: `Facebook ${placement ?? 'feed'} campaign: ${campaignId}`,
        },
      },
      {
        step_index: 1,
        step_type: 'SKILL' as const,
        skill_id: 'qc.brand.alignment',
        input: {
          content: captionText,
          ...(brandGuidelines ? { brandGuidelines } : {}),
          campaignId,
        },
      },
      {
        step_index: 2,
        step_type: 'SKILL' as const,
        skill_id: 'qc.facebook_policy.check',
        input: {
          text: captionText,
          ...(headline ? { headline } : {}),
          placement: placement ?? 'feed',
        },
      },
      {
        step_index: 3,
        step_type: 'HUMAN_GATE' as const,
        input: {
          gate: 'CAMPAIGN_PUBLISH_APPROVAL',
          campaignId,
          pageTarget,
          contentType,
          publishMode,
          ...(scheduledAt ? { scheduledAt } : {}),
          ...(mediaUrl ? { mediaUrl } : {}),
          requiredRoles: ['OWNER', 'ADMIN_OPERATIONS'],
        },
      },
      {
        step_index: 4,
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
        step_index: 5,
        step_type: 'NOTIFICATION' as const,
        input: { event: 'CAMPAIGN_WORKFLOW_COMPLETED', campaignId },
      },
    ],
    generated_at: new Date().toISOString(),
  };

  const result = await delegateSubTask({
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    intentType: 'COORDINATE_MARKETING_CAMPAIGN',
    title: `Marketing campaign review: ${campaignId}`,
    context: context ?? { campaign_id: campaignId },
    plan,
  });

  return result;
}
