'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requestRevision } from '@/lib/portal/revisions';

async function getPortalSession() {
  const session = await auth();
  if (!session || session.user.role !== 'CLIENT') redirect('/portal/login');
  return session;
}

export async function actionRequestRevision(
  assetId: string,
  notes?: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await getPortalSession();
  const { organizationId, userId, role } = session.user;

  const result = await requestRevision({
    assetId,
    organizationId,
    actorId: userId,
    actorRole: role,
    notes,
  });

  if (result.ok) revalidatePath('/portal/revisions');
  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}
