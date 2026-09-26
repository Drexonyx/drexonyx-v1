'use server';

// Autonomous Campaign Agent server action (DR 0127).
// organizationId always comes from the server-side JWT.
// The only campaign workflow: brief → preflight → auto-create campaign →
// delegateMarketingCampaign → autoAdvanceTask.

import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createCampaign } from '@/lib/admin/create-campaign';
import type { AdminRole } from '@/lib/admin/types';
import { delegateMarketingCampaign } from '@/lib/agents/marketing-campaign-specialist';
import { runAutonomousCampaignPreflight } from '@/lib/agents/autonomous-campaign';
import { autoAdvanceTask } from '@/lib/orchestration/runner';

// Fully autonomous: brief → strategy → caption → campaign → QC → publish.
// No manual fields — everything is derived from the brief.
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

  const brief = (formData.get('brief') as string | null)?.trim() ?? '';
  const initiatorRole = session.role as Extract<AdminRole, 'OWNER' | 'ADMIN_OPERATIONS'>;

  // ── Step 1: autonomous preflight — parse brief, develop strategy, generate caption ──
  const preflight = await runAutonomousCampaignPreflight({
    brief,
    organizationId: session.organizationId,
    initiatedByUserId: session.userId,
    initiatorRole,
  });

  if (!preflight.ok) {
    return { ok: false, reason: `Campaign Agent failed: ${preflight.error}` };
  }

  // ── Step 2: auto-create campaign from the name the preflight derived ──────────
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

  // ── Step 3: build brand guidelines from strategy output ───────────────────────
  const brandGuidelines =
    preflight.strategyKeyMessages.length > 0
      ? `DREXONYX is a premium video production studio. Key messages: ${preflight.strategyKeyMessages.join(' | ')}. Angles: ${preflight.strategyAngles.slice(0, 2).join(', ')}.`
      : 'DREXONYX is a premium video production studio. Tone: professional, authoritative, and aspirational.';

  // ── Step 4: delegate to marketing-campaign specialist ─────────────────────────
  // Runs: qc.script.review → qc.brand.alignment → qc.facebook_policy.check →
  //       facebook.page.publish → NOTIFICATION
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

  // ── Step 5: advance task to completion ───────────────────────────────────────
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
