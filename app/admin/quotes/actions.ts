'use server';

// DR 0043: Server actions for the admin quotes page.
// organizationId always comes from the server-side JWT.

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isAdminRole } from '@/lib/admin/types';
import { sendQuote } from '@/lib/admin/send-quote';
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
