'use server';

import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createProductionJob, cancelProductionJob } from '@/lib/admin/production-jobs';
import { createManualUploadAsset, markManualAssetReadyForQc, completeManualUploadJob } from '@/lib/admin/manual-upload';
import { createRevisionJob } from '@/lib/admin/revisions';
import { runGenerationDriver } from '@/lib/agent/driver';
import type { AdminRole } from '@/lib/admin/types';

export async function actionCreateProductionJob(
  orderId: string,
  jobType: 'AI_GENERATION' | 'MANUAL_UPLOAD',
  description: string,
): Promise<{ ok: boolean; reason?: string; jobId?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  const { role, organizationId, userId } = session;

  // DR 0053 §5: OWNER, ADMIN_OPERATIONS, CREATIVE_PRODUCTION may create
  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS' && role !== 'CREATIVE_PRODUCTION') {
    return { ok: false, reason: 'Forbidden: insufficient authority to create ProductionJob' };
  }

  const result = await createProductionJob({
    orderId,
    organizationId,
    jobType,
    description: description.trim() || undefined,
    actorId: userId,
    actorRole: role as AdminRole,
  });

  if (result.ok) revalidatePath('/admin/production');
  return result.ok ? { ok: true, jobId: result.jobId } : { ok: false, reason: result.reason };
}

export async function actionCancelProductionJob(
  jobId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  const { role, organizationId, userId } = session;

  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS can cancel ProductionJobs' };
  }

  const result = await cancelProductionJob({
    jobId,
    organizationId,
    actorId: userId,
    actorRole: role as AdminRole,
  });

  if (result.ok) revalidatePath('/admin/production');
  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}

// DR 0091: Create an Asset at UPLOADED status for a MANUAL_UPLOAD ProductionJob.
export async function actionCreateManualUploadAsset(
  productionJobId: string,
  name?: string,
): Promise<{ ok: boolean; reason?: string; assetId?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  const { role, organizationId, userId } = session;

  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS' && role !== 'CREATIVE_PRODUCTION') {
    return { ok: false, reason: 'Forbidden: insufficient authority to create MANUAL_UPLOAD asset' };
  }

  const result = await createManualUploadAsset({
    productionJobId,
    organizationId,
    actorId: userId,
    actorRole: role as AdminRole,
    name: name?.trim() || undefined,
  });

  if (result.ok) {
    revalidatePath('/admin/production');
    revalidatePath('/admin/assets');
  }

  return result.ok ? { ok: true, assetId: result.assetId } : { ok: false, reason: result.reason };
}

// DR 0087: Advance a MANUAL_UPLOAD asset from UPLOADED → READY_FOR_QC, then complete the job.
export async function actionMarkManualAssetReadyForQc(
  assetId: string,
  productionJobId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  const { role, organizationId, userId } = session;

  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS' && role !== 'CREATIVE_PRODUCTION') {
    return { ok: false, reason: 'Forbidden: insufficient authority' };
  }

  const markResult = await markManualAssetReadyForQc({
    assetId,
    organizationId,
    actorId: userId,
    actorRole: role as AdminRole,
  });

  if (!markResult.ok) {
    return { ok: false, reason: markResult.reason };
  }

  const completeResult = await completeManualUploadJob({
    productionJobId,
    organizationId,
    actorId: userId,
    actorRole: role as AdminRole,
  });

  if (markResult.ok) {
    revalidatePath('/admin/production');
    revalidatePath('/admin/qc');
    revalidatePath('/admin/assets');
  }
  return completeResult.ok ? { ok: true } : { ok: false, reason: completeResult.reason };
}

// DR 0088: Initiate a revision job for a REVISION_REQUIRED asset.
export async function actionCreateRevisionJob(
  originalAssetId: string,
  orderId: string,
  jobType: 'AI_GENERATION' | 'MANUAL_UPLOAD',
  description?: string,
): Promise<{ ok: boolean; reason?: string; newProductionJobId?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  const { role, organizationId, userId } = session;

  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS' && role !== 'CREATIVE_PRODUCTION') {
    return { ok: false, reason: 'Forbidden: insufficient authority' };
  }

  const result = await createRevisionJob({
    originalAssetId,
    orderId,
    organizationId,
    jobType,
    description: description?.trim() || undefined,
    actorId: userId,
    actorRole: role as AdminRole,
  });

  if (result.ok) {
    revalidatePath('/admin/production');
    revalidatePath('/admin/assets');
  }
  return result.ok
    ? { ok: true, newProductionJobId: result.newProductionJobId }
    : { ok: false, reason: result.reason };
}

// DR 0058: Trigger the async generation driver for a QUEUED AI_GENERATION ProductionJob.
// OWNER and ADMIN_OPERATIONS only — same authority as cancel.
export async function actionRunGenerationDriver(
  jobId: string,
): Promise<{ ok: boolean; reason?: string; providerJobId?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  const { role, organizationId } = session;

  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS may trigger generation' };
  }

  const result = await runGenerationDriver({ productionJobId: jobId, organizationId });

  if (result.ok) revalidatePath('/admin/production');
  return result.ok ? { ok: true, providerJobId: result.providerJobId } : { ok: false, reason: result.reason };
}
