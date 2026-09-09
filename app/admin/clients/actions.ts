'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isAdminRole } from '@/lib/admin/types';
import { provisionClient } from '@/lib/admin/provisioning';

async function getAdminSession() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');
  return session;
}

export type ProvisionClientActionResult =
  | { ok: true; organizationId: string; userId: string; temporaryPassword: string }
  | { ok: false; reason: string };

export async function actionProvisionClient(
  formData: FormData,
): Promise<ProvisionClientActionResult> {
  const session = await getAdminSession();
  const { role, organizationId: actorOrganizationId, userId: actorId } = session.user;

  if (role !== 'OWNER' && role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Only OWNER or ADMIN_OPERATIONS may provision clients' };
  }

  const organizationName = (formData.get('organizationName') as string | null) ?? '';
  const organizationSlug = (formData.get('organizationSlug') as string | null) ?? '';
  const userEmail = (formData.get('userEmail') as string | null) ?? '';
  const userDisplayName = (formData.get('userDisplayName') as string | null) ?? '';

  const result = await provisionClient({
    organizationName,
    organizationSlug,
    userEmail,
    userDisplayName,
    actorId,
    actorOrganizationId,
    actorRole: role as 'OWNER' | 'ADMIN_OPERATIONS',
  });

  if (result.ok) {
    revalidatePath('/admin/clients');
  }

  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  return {
    ok: true,
    organizationId: result.organizationId,
    userId: result.userId,
    temporaryPassword: result.temporaryPassword,
  };
}
