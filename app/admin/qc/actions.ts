'use server';

import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createQcReview } from '@/lib/admin/qc';
import type { AdminRole } from '@/lib/admin/types';

export async function actionCreateQcReview(
  assetId: string,
  verdict: 'PASS' | 'FAIL',
  notes: string,
): Promise<{ ok: boolean; reason?: string; reviewId?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { role, organizationId, userId } = session;

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
