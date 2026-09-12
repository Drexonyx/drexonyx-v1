'use server';

import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { markInquiryReviewed, markInquiryDismissed } from '@/lib/admin/update-inquiry';
import { convertInquiry } from '@/lib/admin/convert-inquiry';
import type { AdminRole } from '@/lib/admin/types';

export async function actionMarkInquiryReviewed(
  inquiryId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const result = await markInquiryReviewed({
    inquiryId,
    actorId: session.userId,
    actorRole: session.role as AdminRole,
    actorOrganizationId: session.organizationId,
  });

  if (result.ok) revalidatePath('/admin/inquiries');
  return result;
}

export async function actionMarkInquiryDismissed(
  inquiryId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const result = await markInquiryDismissed({
    inquiryId,
    actorId: session.userId,
    actorRole: session.role as AdminRole,
    actorOrganizationId: session.organizationId,
  });

  if (result.ok) revalidatePath('/admin/inquiries');
  return result;
}

export async function actionConvertInquiry(
  formData: FormData,
): Promise<{
  ok: boolean;
  reason?: string;
  campaignId?: string;
  organizationId?: string;
  temporaryPassword?: string;
}> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  if (session.role !== 'OWNER' && session.role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden' };
  }

  const inquiryId = (formData.get('inquiry_id') as string | null) ?? '';
  const organizationName = (formData.get('organization_name') as string | null) ?? '';
  const organizationSlug = (formData.get('organization_slug') as string | null) ?? '';
  const userEmail = (formData.get('user_email') as string | null) ?? '';
  const userDisplayName = (formData.get('user_display_name') as string | null) ?? '';

  const result = await convertInquiry({
    inquiryId,
    organizationName,
    organizationSlug,
    userEmail,
    userDisplayName,
    actorId: session.userId,
    actorOrganizationId: session.organizationId,
    actorRole: session.role as AdminRole,
  });

  if (result.ok) {
    revalidatePath('/admin/inquiries');
    revalidatePath('/admin/campaigns');
    revalidatePath('/admin/briefs');
    return {
      ok: true,
      campaignId: result.campaignId,
      organizationId: result.organizationId,
      temporaryPassword: result.temporaryPassword,
    };
  }

  return { ok: false, reason: result.reason };
}
