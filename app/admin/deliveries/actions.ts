'use server';

import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createDelivery,
  sendDelivery,
  completeDelivery,
  failDelivery,
  cancelDelivery,
} from '@/lib/admin/deliveries';
import type { AdminRole } from '@/lib/admin/types';

export async function actionCreateDelivery(
  orderId: string,
  assetIds: string[],
): Promise<{ ok: boolean; reason?: string; deliveryId?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  const { role, organizationId, userId } = session;

  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS can create Deliveries' };
  }

  const result = await createDelivery({
    orderId,
    organizationId,
    assetIds,
    actorId: userId,
    actorRole: role as AdminRole,
  });

  if (result.ok) revalidatePath('/admin/deliveries');
  return result.ok ? { ok: true, deliveryId: result.deliveryId } : { ok: false, reason: result.reason };
}

export async function actionSendDelivery(
  deliveryId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  const { role, organizationId, userId } = session;

  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS can send Deliveries' };
  }

  const result = await sendDelivery({
    deliveryId,
    organizationId,
    actorId: userId,
    actorRole: role as AdminRole,
  });

  if (result.ok) revalidatePath('/admin/deliveries');
  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}

export async function actionCompleteDelivery(
  deliveryId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  const { role, organizationId, userId } = session;

  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS can complete Deliveries' };
  }

  const result = await completeDelivery({
    deliveryId,
    organizationId,
    actorId: userId,
    actorRole: role as AdminRole,
  });

  if (result.ok) revalidatePath('/admin/deliveries');
  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}

export async function actionFailDelivery(
  deliveryId: string,
  failureReason: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  const { role, organizationId, userId } = session;

  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS can fail Deliveries' };
  }

  const result = await failDelivery({
    deliveryId,
    organizationId,
    failureReason,
    actorId: userId,
    actorRole: role as AdminRole,
  });

  if (result.ok) revalidatePath('/admin/deliveries');
  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}

export async function actionCancelDelivery(
  deliveryId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  const { role, organizationId, userId } = session;

  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS can cancel Deliveries' };
  }

  const result = await cancelDelivery({
    deliveryId,
    organizationId,
    actorId: userId,
    actorRole: role as AdminRole,
  });

  if (result.ok) revalidatePath('/admin/deliveries');
  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}
