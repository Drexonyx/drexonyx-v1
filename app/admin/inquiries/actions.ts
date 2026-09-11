'use server';

import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { markInquiryReviewed, markInquiryDismissed } from '@/lib/admin/update-inquiry';
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
