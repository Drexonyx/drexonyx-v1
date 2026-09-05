'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { decideApproval } from '@/lib/portal/approvals';

async function getPortalSession() {
  const session = await auth();
  if (!session || session.user.role !== 'CLIENT') redirect('/portal/login');
  return session;
}

export async function actionDecideApproval(
  approvalId: string,
  decision: 'APPROVED' | 'REJECTED',
): Promise<{ ok: boolean; reason?: string }> {
  const session = await getPortalSession();
  const { organizationId, userId, role } = session.user;

  const result = await decideApproval({
    approvalId,
    organizationId,
    decision,
    actorId: userId,
    actorRole: role,
  });

  if (result.ok) revalidatePath('/portal/approvals');
  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}
