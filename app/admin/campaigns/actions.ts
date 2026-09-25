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
