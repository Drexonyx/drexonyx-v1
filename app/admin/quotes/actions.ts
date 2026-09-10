'use server';

// DR 0043: Server actions for the admin quotes page.
// DR 0106: actionCreateQuote added for admin quote creation.
// organizationId always comes from the server-side JWT.

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isAdminRole } from '@/lib/admin/types';
import { sendQuote } from '@/lib/admin/send-quote';
import { createQuote } from '@/lib/admin/create-quote';
import type { AdminRole } from '@/lib/admin/types';

export async function actionSendQuote(
  quoteId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await auth();

  if (!session || !isAdminRole(session.user.role)) {
    redirect('/admin/login');
  }

  // OWNER and ADMIN_OPERATIONS only (DR 0043 §5.5)
  if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS can send quotes' };
  }

  const result = await sendQuote({
    quoteId,
    organizationId: session.user.organizationId,
    actorId: session.user.userId,
    actorRole: session.user.role as AdminRole,
  });

  if (result.ok) {
    revalidatePath('/admin/quotes');
  }

  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}

export async function actionCreateQuote(
  formData: FormData,
): Promise<{ ok: boolean; reason?: string; quoteId?: string }> {
  const session = await auth();

  if (!session || !isAdminRole(session.user.role)) {
    redirect('/admin/login');
  }

  if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN_OPERATIONS') {
    return { ok: false, reason: 'Forbidden: only OWNER or ADMIN_OPERATIONS can create quotes' };
  }

  const campaignId = (formData.get('campaignId') as string | null) ?? '';
  const totalAmount = (formData.get('totalAmount') as string | null) ?? '';
  const estimatedCost = (formData.get('estimatedCost') as string | null) ?? '';

  const result = await createQuote({
    campaignId,
    totalAmount,
    estimatedCost: estimatedCost.trim() !== '' ? estimatedCost : undefined,
    organizationId: session.user.organizationId,
    actorId: session.user.userId,
    actorRole: session.user.role as AdminRole,
  });

  if (result.ok) {
    revalidatePath('/admin/quotes');
    return { ok: true, quoteId: result.quoteId };
  }

  return { ok: false, reason: result.reason };
}
