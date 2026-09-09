'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isAdminRole } from '@/lib/admin/types';
import { completeOrder, cancelOrder } from '@/lib/admin/orders';

async function getAdminSession() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');
  return session;
}

export async function actionCompleteOrder(
  orderId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await getAdminSession();
  const { role, organizationId, userId } = session.user;

  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Only OWNER or ADMIN_OPERATIONS may complete orders' };
  }

  const result = await completeOrder({
    orderId,
    organizationId,
    actorId: userId,
    actorRole: role as 'OWNER' | 'ADMIN_OPERATIONS',
  });

  if (result.ok) revalidatePath('/admin/orders');
  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}

export async function actionCancelOrder(
  orderId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await getAdminSession();
  const { role, organizationId, userId } = session.user;

  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Only OWNER or ADMIN_OPERATIONS may cancel orders' };
  }

  const result = await cancelOrder({
    orderId,
    organizationId,
    actorId: userId,
    actorRole: role as 'OWNER' | 'ADMIN_OPERATIONS',
  });

  if (result.ok) revalidatePath('/admin/orders');
  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}
