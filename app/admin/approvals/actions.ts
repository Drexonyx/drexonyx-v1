'use server';

import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createApproval, cancelApproval } from '@/lib/admin/approvals';
import type { AdminRole } from '@/lib/admin/types';

export async function actionCreateApproval(
  orderId: string,
  targetType: 'ASSET' | 'QUOTE',
  targetId: string,
  expiresAt?: string,
): Promise<{ ok: boolean; reason?: string; approvalId?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  const { role, organizationId, userId } = session;

  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS can create Approvals' };
  }

  const result = await createApproval({
    orderId,
    organizationId,
    targetType,
    targetId,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    actorId: userId,
    actorRole: role as AdminRole,
  });

  if (result.ok) revalidatePath('/admin/approvals');
  return result.ok ? { ok: true, approvalId: result.approvalId } : { ok: false, reason: result.reason };
}

export async function actionCancelApproval(
  approvalId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  const { role, organizationId, userId } = session;

  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS can cancel Approvals' };
  }

  const result = await cancelApproval({
    approvalId,
    organizationId,
    actorId: userId,
    actorRole: role as AdminRole,
  });

  if (result.ok) revalidatePath('/admin/approvals');
  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}
