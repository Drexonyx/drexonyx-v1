'use server';

// Admin credit adjustment server action — requires admin session.
// Only OWNER and ADMIN_OPERATIONS roles may adjust credits.
// Amount comes from admin input; idempotency key is admin-supplied.

import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin/session';
import { adjustCredits } from '@/lib/credits/ledger';
import { uuidv7 } from 'uuidv7';

const ADJUST_ROLES = ['OWNER', 'ADMIN_OPERATIONS'] as const;

export async function actionAdjustCredits(
  formData: FormData,
): Promise<{ ok: false; reason: string } | never> {
  const session = await getAdminSession();
  if (!session) return { ok: false, reason: 'Not authenticated' };
  if (!ADJUST_ROLES.includes(session.role as (typeof ADJUST_ROLES)[number])) {
    return { ok: false, reason: 'Unauthorized — OWNER or ADMIN_OPERATIONS required' };
  }

  const deltaRaw = formData.get('creditsDelta');
  const reason = (formData.get('reason') as string | null)?.trim() ?? '';

  if (!deltaRaw || !reason) {
    return { ok: false, reason: 'creditsDelta and reason are required' };
  }

  const creditsDelta = Number(deltaRaw);
  if (!Number.isInteger(creditsDelta) || creditsDelta === 0) {
    return { ok: false, reason: 'creditsDelta must be a non-zero integer' };
  }
  if (Math.abs(creditsDelta) > 1_000_000) {
    return { ok: false, reason: 'creditsDelta exceeds maximum single-adjustment limit (1,000,000)' };
  }

  const result = await adjustCredits({
    organizationId: session.organizationId,
    creditsDelta,
    actorId: session.userId,
    actorRole: session.role,
    reason,
    idempotencyKey: uuidv7(),
  });

  if (!result.ok) return { ok: false, reason: result.reason };

  redirect('/admin/credits');
}
