'use server';

// Self-service checkout server action.
// organizationId is from DREXONYX_ORG_ID env var — never from client input.
// Amount is from lib/pricing.ts via createSelfServiceOrder — never from client request body.

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSelfServiceOrder } from '@/lib/self-service/create-checkout-order';
import { createZiinaCheckoutSession } from '@/lib/portal/create-ziina-payment';

export async function actionInitiateCheckout(
  pkgId: string,
  contactEmail: string,
): Promise<{ ok: false; reason: string } | never> {
  const organizationId = process.env.DREXONYX_ORG_ID?.trim();
  if (!organizationId) {
    return { ok: false, reason: 'Service configuration error. Please contact us to proceed.' };
  }

  const trimmedEmail = contactEmail.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
    return { ok: false, reason: 'A valid email address is required.' };
  }

  // Step 1: Create Campaign + Quote (AED) + Order atomically — amount from lib/pricing.ts
  const orderResult = await createSelfServiceOrder({
    pkgId,
    contactEmail: trimmedEmail,
    organizationId,
  });

  if (!orderResult.ok) {
    return { ok: false, reason: orderResult.reason };
  }

  // Step 2: Construct base URL from request headers
  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') ?? 'http';
  const baseUrl = `${proto}://${host}`;

  // Step 3: Create Ziina checkout session (amount from DB quote.total_amount)
  const ziina = await createZiinaCheckoutSession({
    orderId: orderResult.orderId,
    organizationId,
    actorId: null,
    baseUrl,
    successPath: '/checkout/success',
    cancelPath: '/checkout/cancel',
  });

  if (!ziina.ok) {
    return { ok: false, reason: ziina.reason };
  }

  redirect(ziina.redirectUrl);
}
