'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isAdminRole } from '@/lib/admin/types';
import { createProductionJob, cancelProductionJob } from '@/lib/admin/production-jobs';
import { runGenerationDriver } from '@/lib/agent/driver';
import type { AdminRole } from '@/lib/admin/types';

async function getAdminSession() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');
  return session;
}

export async function actionCreateProductionJob(
  orderId: string,
  jobType: 'AI_GENERATION' | 'MANUAL_UPLOAD',
  description: string,
): Promise<{ ok: boolean; reason?: string; jobId?: string }> {
  const session = await getAdminSession();
  const { role, organizationId, userId } = session.user;

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
  const { role, organizationId, userId } = session.user;

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

// DR 0058: Trigger the async generation driver for a QUEUED AI_GENERATION ProductionJob.
// OWNER and ADMIN_OPERATIONS only — same authority as cancel.
export async function actionRunGenerationDriver(
  jobId: string,
): Promise<{ ok: boolean; reason?: string; providerJobId?: string }> {
  const session = await getAdminSession();
  const { role, organizationId } = session.user;

  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS may trigger generation' };
  }

  const result = await runGenerationDriver({ productionJobId: jobId, organizationId });

  if (result.ok) revalidatePath('/admin/production');
  return result.ok ? { ok: true, providerJobId: result.providerJobId } : { ok: false, reason: result.reason };
}
