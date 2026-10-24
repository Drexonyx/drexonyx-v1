'use server';

// Portal credit purchase server action — for authenticated client users.
// organizationId is from server-side session — never from client input.
// Amount is from financial.credit_packages (DB) — never from client request.
// DR 0120.

import { headers } from 'next/headers';
import { auth } from '@/auth';
import { createCreditPurchaseCheckout } from '@/lib/credits/create-credit-purchase';

export async function actionPortalBuyCredits(
  creditPackageId: string,
): Promise<{ ok: true; url: string } | { ok: false; reason: string }> {
  const session = await auth();
  if (!session) return { ok: false, reason: 'Not authenticated' };
  if (session.user.role !== 'CLIENT') return { ok: false, reason: 'Unauthorized' };

  const organizationId = session.user.organizationId;

  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') ?? 'http';
  const baseUrl = `${proto}://${host}`;

  const result = await createCreditPurchaseCheckout({
    creditPackageId,
    organizationId,
    actorId: session.user.id ?? null,
    baseUrl,
    successPath: '/portal/credits/buy/success',
    cancelPath: '/portal/credits/buy',
  });

  if (!result.ok) return { ok: false, reason: result.reason };

  return { ok: true, url: result.redirectUrl };
}
