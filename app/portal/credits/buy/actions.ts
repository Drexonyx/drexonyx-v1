'use server';

// Portal credit purchase server action — for authenticated client users.
// organizationId is from server-side session — never from client input.
// Amount is from financial.credit_packages (DB) — never from client request.
// DR 0120.
//
// Payment URL stored in httpOnly cookie, never returned to client.
// Client navigates to /portal/credits/buy/pay which serves a meta-refresh
// page — bypasses Android App Links interception of pay.ziina.com.

import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { createCreditPurchaseCheckout } from '@/lib/credits/create-credit-purchase';

export async function actionPortalBuyCredits(
  creditPackageId: string,
): Promise<{ ok: false; reason: string } | { ok: true }> {
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

  // Store URL in httpOnly cookie — client only sees the /pay path on our domain
  const cookieStore = await cookies();
  cookieStore.set('_drex_pay', result.redirectUrl, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  });

  return { ok: true };
}
