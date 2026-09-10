'use server';

// DR 0106: Server actions for admin campaign creation.
// organizationId always comes from the server-side JWT.

import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createCampaign } from '@/lib/admin/create-campaign';
import type { AdminRole } from '@/lib/admin/types';

export async function actionCreateCampaign(
  formData: FormData,
): Promise<{ ok: boolean; reason?: string; campaignId?: string }> {
  const session = await getAdminSession();

  if (!session) redirect('/admin/login');

  if (session.role !== 'OWNER' && session.role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS can create campaigns' };
  }

  const name = (formData.get('name') as string | null) ?? '';

  const result = await createCampaign({
    name,
    organizationId: session.organizationId,
    actorId: session.userId,
    actorRole: session.role as AdminRole,
  });

  if (result.ok) {
    revalidatePath('/admin/campaigns');
    return { ok: true, campaignId: result.campaignId };
  }

  return { ok: false, reason: result.reason };
}
