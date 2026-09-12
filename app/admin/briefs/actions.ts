'use server';

import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createBrief } from '@/lib/admin/create-brief';
import {
  submitBrief,
  approveBrief,
  requestBriefRevision,
  returnBriefToDraft,
} from '@/lib/admin/update-brief';
import type { AdminRole } from '@/lib/admin/types';

export async function actionCreateBrief(
  formData: FormData,
): Promise<{ ok: boolean; reason?: string; briefId?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  if (session.role !== 'OWNER' && session.role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden' };
  }

  const campaignId = (formData.get('campaign_id') as string | null) ?? '';
  const briefText = (formData.get('brief_text') as string | null) || null;
  const deliverables = (formData.get('deliverables') as string | null) || null;
  const targetAudience = (formData.get('target_audience') as string | null) || null;
  const timelineNotes = (formData.get('timeline_notes') as string | null) || null;
  const additionalNotes = (formData.get('additional_notes') as string | null) || null;

  const result = await createBrief({
    campaignId,
    organizationId: session.organizationId,
    actorId: session.userId,
    actorRole: session.role as AdminRole,
    briefText,
    deliverables,
    targetAudience,
    timelineNotes,
    additionalNotes,
  });

  if (result.ok) {
    revalidatePath('/admin/briefs');
    return { ok: true, briefId: result.briefId };
  }

  return { ok: false, reason: result.reason };
}

export async function actionSubmitBrief(briefId: string): Promise<{ ok: boolean; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const result = await submitBrief({
    briefId,
    organizationId: session.organizationId,
    actorId: session.userId,
    actorRole: session.role as AdminRole,
  });

  if (result.ok) revalidatePath('/admin/briefs');
  return result;
}

export async function actionApproveBrief(briefId: string): Promise<{ ok: boolean; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const result = await approveBrief({
    briefId,
    organizationId: session.organizationId,
    actorId: session.userId,
    actorRole: session.role as AdminRole,
  });

  if (result.ok) revalidatePath('/admin/briefs');
  return result;
}

export async function actionRequestBriefRevision(briefId: string): Promise<{ ok: boolean; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const result = await requestBriefRevision({
    briefId,
    organizationId: session.organizationId,
    actorId: session.userId,
    actorRole: session.role as AdminRole,
  });

  if (result.ok) revalidatePath('/admin/briefs');
  return result;
}

export async function actionReturnBriefToDraft(briefId: string): Promise<{ ok: boolean; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const result = await returnBriefToDraft({
    briefId,
    organizationId: session.organizationId,
    actorId: session.userId,
    actorRole: session.role as AdminRole,
  });

  if (result.ok) revalidatePath('/admin/briefs');
  return result;
}
