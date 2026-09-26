'use server';

// DR 0106: Server actions for admin campaign creation and Facebook publishing.
// organizationId always comes from the server-side JWT.

import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createCampaign } from '@/lib/admin/create-campaign';
import type { AdminRole } from '@/lib/admin/types';
import { delegateMarketingCampaign } from '@/lib/agents/marketing-campaign-specialist';
import { delegateDirectFacebookPublish } from '@/lib/agents/direct-facebook-publish';
import { runAutonomousCampaignPreflight } from '@/lib/agents/autonomous-campaign';
import { autoAdvanceTask } from '@/lib/orchestration/runner';
import type { FacebookPageTarget, FacebookPublishMode } from '@/lib/skills/facebook/page-publish';

export async function actionCreateCampaign(
  formData: FormData,
): Promise<{ ok: boolean; reason?: string; campaignId?: string }> {
  const session = await getAdminSession();

  if (!session) redirect('/admin/login');

  if (session.role !== 'OWNER' && session.role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS can create campaigns' };
  }

  const name = (formData.get('name') as string | null) ?? '';

  const result = await createCampaign({
    name,
    organizationId: session.organizationId,
    actorId: session.userId,
    actorRole: session.role as AdminRole,
  });

  if (result.ok) {
    revalidatePath('/admin/campaigns');
    return { ok: true, campaignId: result.campaignId };
  }

  return { ok: false, reason: result.reason };
}

// DR 0124 + DR 0126: Launch a DREXONYX-owned Facebook post through the full autonomous
// publish pipeline: QC → brand alignment → Facebook policy check → publish → notification.
// No HUMAN_GATE — content is DREXONYX's own. EXTERNAL content is not accepted here.
export async function actionLaunchFacebookPost(formData: FormData): Promise<{
  ok: boolean;
  taskId?: string;
  outcome?: string;
  stepsRun?: number;
  reason?: string;
}> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  if (session.role !== 'OWNER' && session.role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS can publish campaigns' };
  }

  const campaignId = (formData.get('campaignId') as string | null)?.trim() ?? '';
  const captionText = (formData.get('captionText') as string | null)?.trim() ?? '';
  const pageTarget = ((formData.get('pageTarget') as string | null) || 'PAGE_1') as FacebookPageTarget;
  const placement = ((formData.get('placement') as string | null) || 'feed') as
    | 'feed' | 'story' | 'reel' | 'marketplace' | 'search';
  const publishMode = ((formData.get('publishMode') as string | null) || 'IMMEDIATE') as FacebookPublishMode;
  const scheduledAt = (formData.get('scheduledAt') as string | null)?.trim() || undefined;
  const headline = (formData.get('headline') as string | null)?.trim() || undefined;

  const delegation = await delegateMarketingCampaign({
    parentTaskId: null,
    organizationId: session.organizationId,
    initiatedByUserId: session.userId,
    initiatorRole: session.role as Extract<AdminRole, 'OWNER' | 'ADMIN_OPERATIONS'>,
    contentOwner: 'DREXONYX',
    campaignId,
    captionText,
    pageTarget,
    placement,
    publishMode,
    ...(scheduledAt ? { scheduledAt } : {}),
    ...(headline ? { headline } : {}),
  });

  if (!delegation.ok) {
    return { ok: false, reason: delegation.error };
  }

  const taskId = delegation.subTaskId;

  const run = await autoAdvanceTask({ taskId, organizationId: session.organizationId });

  revalidatePath('/admin/campaigns');

  if (!run.ok) {
    return { ok: false, taskId, reason: run.reason, stepsRun: run.stepsAdvanced };
  }

  return { ok: true, taskId, outcome: run.outcome, stepsRun: run.stepsAdvanced };
}

// Agent-first campaign run.
// 'full-qc'  → fully autonomous: brief → preflight (strategy + caption) → auto-create campaign
//              → delegateMarketingCampaign (script QC → brand alignment → policy → publish)
// 'direct'   → delegateDirectFacebookPublish (policy + publish, zero AI QC, manual caption)
export async function actionAgentCampaignRun(formData: FormData): Promise<{
  ok: boolean;
  taskId?: string;
  campaignId?: string;
  outcome?: string;
  stepsRun?: number;
  reason?: string;
  generatedCaption?: string;
  generatedCampaignName?: string;
}> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  if (session.role !== 'OWNER' && session.role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS can run campaigns' };
  }

  const agentPath = (formData.get('agentPath') as string | null) ?? 'full-qc';
  const initiatorRole = session.role as Extract<AdminRole, 'OWNER' | 'ADMIN_OPERATIONS'>;

  // ── Full-QC path: fully autonomous ──────────────────────────────────────────
  // No campaign selection — campaign is always auto-created from the brief.
  if (agentPath === 'full-qc') {
    const brief = (formData.get('brief') as string | null)?.trim() ?? '';

    const preflight = await runAutonomousCampaignPreflight({
      brief,
      organizationId: session.organizationId,
      initiatedByUserId: session.userId,
      initiatorRole,
    });

    if (!preflight.ok) {
      return { ok: false, reason: `Campaign Agent failed: ${preflight.error}` };
    }

    const created = await createCampaign({
      name: preflight.campaignNameSuggestion,
      organizationId: session.organizationId,
      actorId: session.userId,
      actorRole: session.role as AdminRole,
    });
    if (!created.ok) {
      return { ok: false, reason: created.reason };
    }
    const campaignId = created.campaignId;

    const brandGuidelines =
      preflight.strategyKeyMessages.length > 0
        ? `DREXONYX is a premium video production studio. Key messages for this campaign: ${preflight.strategyKeyMessages.join(' | ')}. Campaign angles: ${preflight.strategyAngles.slice(0, 2).join(', ')}.`
        : 'DREXONYX is a premium video production studio. Tone: professional, authoritative, and aspirational.';

    const delegation = await delegateMarketingCampaign({
      parentTaskId: null,
      organizationId: session.organizationId,
      initiatedByUserId: session.userId,
      initiatorRole,
      contentOwner: 'DREXONYX',
      campaignId,
      captionText: preflight.captionText,
      pageTarget: preflight.pageTarget,
      placement: preflight.placement,
      publishMode: preflight.publishMode,
      brandGuidelines,
      ...(preflight.scheduledAt ? { scheduledAt: preflight.scheduledAt } : {}),
      ...(preflight.headline ? { headline: preflight.headline } : {}),
    });

    if (!delegation.ok) {
      return { ok: false, campaignId, reason: delegation.error };
    }

    const taskId = delegation.subTaskId;
    const run = await autoAdvanceTask({ taskId, organizationId: session.organizationId });

    revalidatePath('/admin/campaigns');

    if (!run.ok) {
      return { ok: false, taskId, campaignId, reason: run.reason, stepsRun: run.stepsAdvanced };
    }

    return {
      ok: true,
      taskId,
      campaignId,
      outcome: run.outcome,
      stepsRun: run.stepsAdvanced,
      generatedCaption: preflight.captionText,
      generatedCampaignName: preflight.campaignNameSuggestion,
    };
  }

  // ── Direct path: manual caption, explicit controls ───────────────────────────
  const campaignMode = (formData.get('campaignMode') as string | null) ?? 'existing';
  const newCampaignName = (formData.get('newCampaignName') as string | null)?.trim() ?? '';
  const existingCampaignId = (formData.get('campaignId') as string | null)?.trim() ?? '';

  let campaignId = existingCampaignId;

  if (campaignMode === 'new') {
    const created = await createCampaign({
      name: newCampaignName,
      organizationId: session.organizationId,
      actorId: session.userId,
      actorRole: session.role as AdminRole,
    });
    if (!created.ok) {
      return { ok: false, reason: created.reason };
    }
    campaignId = created.campaignId;
  }

  const directCaptionText = (formData.get('captionText') as string | null)?.trim() ?? '';
  const directPageTarget = ((formData.get('pageTarget') as string | null) || 'PAGE_1') as FacebookPageTarget;
  const directPlacement = ((formData.get('placement') as string | null) || 'feed') as
    | 'feed' | 'story' | 'reel' | 'marketplace' | 'search';
  const directPublishMode = ((formData.get('publishMode') as string | null) || 'IMMEDIATE') as FacebookPublishMode;
  const directScheduledAt = (formData.get('scheduledAt') as string | null)?.trim() || undefined;
  const directHeadline = (formData.get('headline') as string | null)?.trim() || undefined;

  const delegation = await delegateDirectFacebookPublish({
    parentTaskId: null,
    organizationId: session.organizationId,
    initiatedByUserId: session.userId,
    initiatorRole,
    campaignId,
    captionText: directCaptionText,
    pageTarget: directPageTarget,
    placement: directPlacement,
    publishMode: directPublishMode,
    ...(directScheduledAt ? { scheduledAt: directScheduledAt } : {}),
    ...(directHeadline ? { headline: directHeadline } : {}),
  });

  if (!delegation.ok) {
    return { ok: false, campaignId, reason: delegation.error };
  }

  const taskId = delegation.subTaskId;
  const run = await autoAdvanceTask({ taskId, organizationId: session.organizationId });

  revalidatePath('/admin/campaigns');

  if (!run.ok) {
    return { ok: false, taskId, campaignId, reason: run.reason, stepsRun: run.stepsAdvanced };
  }

  return { ok: true, taskId, campaignId, outcome: run.outcome, stepsRun: run.stepsAdvanced };
}

// Direct Facebook publish — no AI calls (qc.script.review and qc.brand.alignment are skipped).
// Runs qc.facebook_policy.check (deterministic) then facebook.page.publish directly.
// Use when Anthropic credit is unavailable or AI review is not required for DREXONYX content.
export async function actionDirectFacebookPublish(formData: FormData): Promise<{
  ok: boolean;
  taskId?: string;
  outcome?: string;
  stepsRun?: number;
  reason?: string;
}> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  if (session.role !== 'OWNER' && session.role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS can publish campaigns' };
  }

  const campaignId = (formData.get('campaignId') as string | null)?.trim() ?? '';
  const captionText = (formData.get('captionText') as string | null)?.trim() ?? '';
  const pageTarget = ((formData.get('pageTarget') as string | null) || 'PAGE_1') as FacebookPageTarget;
  const placement = ((formData.get('placement') as string | null) || 'feed') as
    | 'feed' | 'story' | 'reel' | 'marketplace' | 'search';
  const publishMode = ((formData.get('publishMode') as string | null) || 'IMMEDIATE') as FacebookPublishMode;
  const scheduledAt = (formData.get('scheduledAt') as string | null)?.trim() || undefined;
  const headline = (formData.get('headline') as string | null)?.trim() || undefined;

  const delegation = await delegateDirectFacebookPublish({
    parentTaskId: null,
    organizationId: session.organizationId,
    initiatedByUserId: session.userId,
    initiatorRole: session.role as Extract<AdminRole, 'OWNER' | 'ADMIN_OPERATIONS'>,
    campaignId,
    captionText,
    pageTarget,
    placement,
    publishMode,
    ...(scheduledAt ? { scheduledAt } : {}),
    ...(headline ? { headline } : {}),
  });

  if (!delegation.ok) {
    return { ok: false, reason: delegation.error };
  }

  const taskId = delegation.subTaskId;
  const run = await autoAdvanceTask({ taskId, organizationId: session.organizationId });

  revalidatePath('/admin/campaigns');

  if (!run.ok) {
    return { ok: false, taskId, reason: run.reason, stepsRun: run.stepsAdvanced };
  }

  return { ok: true, taskId, outcome: run.outcome, stepsRun: run.stepsAdvanced };
}
