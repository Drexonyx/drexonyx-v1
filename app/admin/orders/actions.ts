'use server';

import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { completeOrder, cancelOrder } from '@/lib/admin/orders';

export async function actionCompleteOrder(
  orderId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  const { role, organizationId, userId } = session;

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
  if (!session) redirect('/admin/login');
  const { role, organizationId, userId } = session;

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
