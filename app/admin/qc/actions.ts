'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isAdminRole } from '@/lib/admin/types';
import { createQcReview } from '@/lib/admin/qc';
import type { AdminRole } from '@/lib/admin/types';

export async function actionCreateQcReview(
  assetId: string,
  verdict: 'PASS' | 'FAIL',
  notes: string,
): Promise<{ ok: boolean; reason?: string; reviewId?: string }> {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');

  const { role, organizationId, userId } = session.user;

  const result = await createQcReview({
    assetId,
    organizationId,
    verdict,
    notes: notes.trim() || undefined,
    actorId: userId,
    actorRole: role as AdminRole,
  });

  if (result.ok) {
    revalidatePath('/admin/qc');
    revalidatePath('/admin/assets');
  }

  return result.ok ? { ok: true, reviewId: result.reviewId } : { ok: false, reason: result.reason };
}
