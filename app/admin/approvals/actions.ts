'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isAdminRole } from '@/lib/admin/types';
import { createApproval, cancelApproval } from '@/lib/admin/approvals';
import type { AdminRole } from '@/lib/admin/types';

async function getAdminSession() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');
  return session;
}

export async function actionCreateApproval(
  orderId: string,
  targetType: 'ASSET' | 'QUOTE',
  targetId: string,
  expiresAt?: string,
): Promise<{ ok: boolean; reason?: string; approvalId?: string }> {
  const session = await getAdminSession();
  const { role, organizationId, userId } = session.user;

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
  const { role, organizationId, userId } = session.user;

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
