'use server';

// DR 0106: Server actions for admin campaign creation.
// organizationId always comes from the server-side JWT.

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isAdminRole } from '@/lib/admin/types';
import { createCampaign } from '@/lib/admin/create-campaign';
import type { AdminRole } from '@/lib/admin/types';

export async function actionCreateCampaign(
  formData: FormData,
): Promise<{ ok: boolean; reason?: string; campaignId?: string }> {
  const session = await auth();

  if (!session || !isAdminRole(session.user.role)) {
    redirect('/admin/login');
  }

  if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS can create campaigns' };
  }

  const name = (formData.get('name') as string | null) ?? '';

  const result = await createCampaign({
    name,
    organizationId: session.user.organizationId,
    actorId: session.user.userId,
    actorRole: session.user.role as AdminRole,
  });

  if (result.ok) {
    revalidatePath('/admin/campaigns');
    return { ok: true, campaignId: result.campaignId };
  }

  return { ok: false, reason: result.reason };
}
