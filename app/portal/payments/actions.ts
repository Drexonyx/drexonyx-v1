'use server';

// DR 0045, DR 0047: CLIENT role only. organizationId is from server-side session — never from client input.
// Return URL is server-constructed (DR 0045 §4.3).

import { auth } from '@/auth';
import { createCheckoutSession } from '@/lib/portal/create-payment';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export async function actionCreateCheckout(
  orderId: string,
): Promise<{ ok: false; reason: string } | never> {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') ?? 'http';
  const baseUrl = `${proto}://${host}` as string;

  const result = await createCheckoutSession({
    orderId,
    organizationId: session.user.organizationId,
    actorId: session.user.id ?? '',
    baseUrl,
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  redirect(result.checkoutUrl);
}
