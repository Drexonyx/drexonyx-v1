// Marketing Campaign Specialist Agent — DR 0124
// Coordinates Facebook marketing campaign workflow:
//   content quality check → brand alignment → platform policy check →
//   mandatory human approval gate → completion notification.
//
// CONSTRAINTS (DR 0124):
//   - No Meta/Facebook API calls — human approver performs actual publish
//   - Human approval (OWNER or ADMIN_OPERATIONS) MANDATORY before any publish action
//   - No autonomous publishing under any circumstances
//   - No financial mutations of any kind
//   - No content fabrication, invented metrics, or testimonials
//   - Initiator roles: OWNER, ADMIN_OPERATIONS only

import { delegateSubTask } from '@/lib/orchestration/delegation';
import type { InitiatorRole, TaskContext } from '@/lib/orchestration/types';

export interface MarketingCampaignDelegationParams {
  parentTaskId: string;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: Extract<InitiatorRole, 'OWNER' | 'ADMIN_OPERATIONS'>;
  /** Campaign identifier for tracking and audit. */
  campaignId: string;
  /** The post/ad caption text to be reviewed and approved. */
  captionText: string;
  /** Optional ad headline (validated by facebook_policy.check). */
  headline?: string;
  /** Facebook placement context. Defaults to 'feed'. */
  placement?: 'feed' | 'story' | 'reel' | 'marketplace' | 'search';
  /** Optional brand guidelines for qc.brand.alignment. */
  brandGuidelines?: string;
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

  // DR 0124 §2.2: fixed five-step plan
  // Step 0: SKILL — qc.script.review: content quality (AI, AGENT_ALLOWLIST)
  // Step 1: SKILL — qc.brand.alignment: brand compliance (AI, AGENT_ALLOWLIST)
  // Step 2: SKILL — qc.facebook_policy.check: platform policy (deterministic, AGENT_ALLOWLIST, DR 0124)
  // Step 3: HUMAN_GATE — mandatory publish approval (OWNER or ADMIN_OPERATIONS)
  // Step 4: NOTIFICATION — campaign completion or failure alert
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
          requiredRoles: ['OWNER', 'ADMIN_OPERATIONS'],
          // NOTE: No Meta API integration. The approver performs the actual
          // Facebook publish via native Meta tooling after granting approval.
          publishNote: 'Meta API integration not yet configured. Approver must publish manually via Facebook Business Manager.',
        },
      },
      {
        step_index: 4,
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
