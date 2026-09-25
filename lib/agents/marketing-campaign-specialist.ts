// Marketing Campaign Specialist Agent — DR 0124 + DR 0126
// Coordinates Facebook marketing campaign workflow.
//
// DREXONYX content (contentOwner: 'DREXONYX') — 5-step autonomous plan:
//   content QC → brand alignment → platform policy → facebook.page.publish → notification
//   Autonomous publish: no HUMAN_GATE required after all automated checks pass.
//
// EXTERNAL content (contentOwner: 'EXTERNAL') — 6-step gated plan:
//   content QC → brand alignment → platform policy → HUMAN_GATE → facebook.page.publish → notification
//   OWNER or ADMIN_OPERATIONS approval required before publish.
//
// CONSTRAINTS (DR 0124 / DR 0126):
//   - EXTERNAL: facebook.page.publish executes ONLY after HUMAN_GATE approval
//   - DREXONYX: autonomous publish allowed after all QC and policy checks pass
//   - No financial mutations of any kind
//   - No content fabrication, invented metrics, or testimonials
//   - Initiator roles: OWNER, ADMIN_OPERATIONS only
//   - mediaUrl MUST originate from project R2 storage (enforced in skill)
//   - pageTarget must be PAGE_1 or PAGE_2 (validated at delegation layer and skill runtime)
//   - Zero paid ads, boosts, or Ads Manager calls — organic only

import { delegateSubTask } from '@/lib/orchestration/delegation';
import type { InitiatorRole, TaskContext } from '@/lib/orchestration/types';
import type { FacebookPageTarget, FacebookContentType, FacebookPublishMode } from '@/lib/skills/facebook/page-publish';

// Runtime allowlist mirrors the two authorized DREXONYX Facebook Pages.
const ALLOWED_PAGE_TARGETS: ReadonlySet<string> = new Set(['PAGE_1', 'PAGE_2']);

export interface MarketingCampaignDelegationParams {
  parentTaskId: string;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: Extract<InitiatorRole, 'OWNER' | 'ADMIN_OPERATIONS'>;
  /**
   * Content ownership determines the publish authorization path.
   * 'DREXONYX' — own company content; autonomous publish after all QC/policy checks pass.
   * 'EXTERNAL' — client or third-party content; HUMAN_GATE required before publish.
   */
  contentOwner: 'DREXONYX' | 'EXTERNAL';
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
    contentOwner,
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
  if (contentOwner !== 'DREXONYX' && contentOwner !== 'EXTERNAL') {
    return { ok: false, error: "contentOwner must be 'DREXONYX' or 'EXTERNAL'" };
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

  // Steps 0–2 are identical for both content ownership paths.
  const qcSteps = [
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
  ] as const;

  const publishInput = {
    pageTarget,
    contentType,
    message: captionText,
    ...(mediaUrl ? { mediaUrl } : {}),
    publishMode,
    ...(scheduledAt ? { scheduledAt } : {}),
    campaignId,
  };

  const notificationStep = {
    step_type: 'NOTIFICATION' as const,
    input: { event: 'CAMPAIGN_WORKFLOW_COMPLETED', campaignId },
  };

  // DR 0124 + DR 0126: plan shape depends on content ownership.
  // DREXONYX — 5-step autonomous plan (no HUMAN_GATE):
  //   0: qc.script.review  1: qc.brand.alignment  2: qc.facebook_policy.check
  //   3: facebook.page.publish  4: NOTIFICATION
  // EXTERNAL — 6-step gated plan:
  //   0: qc.script.review  1: qc.brand.alignment  2: qc.facebook_policy.check
  //   3: HUMAN_GATE  4: facebook.page.publish  5: NOTIFICATION
  const steps =
    contentOwner === 'DREXONYX'
      ? [
          ...qcSteps,
          { step_index: 3, step_type: 'SKILL' as const, skill_id: 'facebook.page.publish', input: publishInput },
          { step_index: 4, ...notificationStep },
        ]
      : [
          ...qcSteps,
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
          { step_index: 4, step_type: 'SKILL' as const, skill_id: 'facebook.page.publish', input: publishInput },
          { step_index: 5, ...notificationStep },
        ];

  const plan = { steps, generated_at: new Date().toISOString() };

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
