'use server';

// Self-service checkout server action.
// organizationId is from DREXONYX_ORG_ID env var — never from client input.
// Amount is from lib/pricing.ts via createSelfServiceOrder — never from client request body.
// Idempotency: exactly one checkout per (orgId, pkgId, email) at a time, enforced at the DB level.

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '@/db/index';
import { idempotencyKeys } from '@/db/schema/system';
import { createSelfServiceOrder } from '@/lib/self-service/create-checkout-order';
import { createZiinaCheckoutSession } from '@/lib/portal/create-ziina-payment';

// RFC 5321-compatible: non-empty local part, @, domain with at least one dot and 2+ char TLD
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export async function actionInitiateCheckout(
  pkgId: string,
  contactEmail: string,
): Promise<{ ok: false; reason: string } | never> {
  const organizationId = process.env.DREXONYX_ORG_ID?.trim();
  if (!organizationId) {
    return { ok: false, reason: 'Service configuration error. Please contact us to proceed.' };
  }

  const trimmedEmail = contactEmail.trim().toLowerCase();
  if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
    return { ok: false, reason: 'A valid email address is required.' };
  }

  const now = new Date();
  const idempKey = `checkout_initiate:${organizationId}:${pkgId}:${trimmedEmail}`;
  const ttl = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2-hour checkout window

  // Step 1: Atomically claim the checkout slot — only one concurrent request succeeds.
  // ON CONFLICT DO NOTHING + RETURNING: if RETURNING is empty, another request holds the slot.
  const claimed = await db
    .insert(idempotencyKeys)
    .values({
      id: uuidv7(),
      key: idempKey,
      organization_id: organizationId,
      operation_type: 'CHECKOUT_INITIATE',
      status: 'PENDING',
      expires_at: ttl,
      created_at: now,
      updated_at: now,
    })
    .onConflictDoNothing()
    .returning({ id: idempotencyKeys.id });

  if (claimed.length === 0) {
    // Another checkout for this (org, pkg, email) already has the slot — read its state.
    const existing = await db
      .select({
        status: idempotencyKeys.status,
        response_payload: idempotencyKeys.response_payload,
      })
      .from(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.key, idempKey),
          eq(idempotencyKeys.organization_id, organizationId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const ex = existing[0];

      // Re-use an in-progress checkout that already has a Ziina redirect URL.
      if (ex.status === 'PROCESSING' && ex.response_payload) {
        const payload = ex.response_payload as { redirectUrl?: string };
        if (payload.redirectUrl) {
          redirect(payload.redirectUrl);
        }
      }

      // Previous checkout failed — attempt to reset so this request can proceed.
      // Conditional UPDATE (WHERE status='FAILED') is race-safe: only one concurrent
      // request can win the reset; the other sees 0 rows and gets an error.
      if (ex.status === 'FAILED') {
        const reset = await db
          .update(idempotencyKeys)
          .set({ status: 'PENDING', response_payload: null, updated_at: now })
          .where(
            and(
              eq(idempotencyKeys.key, idempKey),
              eq(idempotencyKeys.organization_id, organizationId),
              eq(idempotencyKeys.status, 'FAILED'),
            ),
          )
          .returning({ id: idempotencyKeys.id });

        if (reset.length === 0) {
          // Concurrent request already claimed the reset — ask user to retry.
          return { ok: false, reason: 'Checkout session conflict. Please try again.' };
        }
        // Fall through — we now own the slot (key is PENDING again).
      } else {
        // PENDING: another request is between the slot claim and the Ziina API call.
        return {
          ok: false,
          reason:
            'A checkout is already in progress for this package. Please complete it or try again shortly.',
        };
      }
    }
  }

  // Step 2: Create Campaign + Quote (AED) + Order atomically — amount from lib/pricing.ts
  const orderResult = await createSelfServiceOrder({
    pkgId,
    contactEmail: trimmedEmail,
    organizationId,
  });

  if (!orderResult.ok) {
    await db
      .update(idempotencyKeys)
      .set({ status: 'FAILED', updated_at: new Date() })
      .where(
        and(
          eq(idempotencyKeys.key, idempKey),
          eq(idempotencyKeys.organization_id, organizationId),
        ),
      );
    return { ok: false, reason: orderResult.reason };
  }

  // Step 3: Construct base URL from request headers
  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') ?? 'http';
  const baseUrl = `${proto}://${host}`;

  // Step 4: Create Ziina checkout session (amount from DB quote.total_amount)
  const ziina = await createZiinaCheckoutSession({
    orderId: orderResult.orderId,
    organizationId,
    actorId: null,
    baseUrl,
    successPath: '/checkout/success',
    cancelPath: '/checkout/cancel',
  });

  if (!ziina.ok) {
    await db
      .update(idempotencyKeys)
      .set({ status: 'FAILED', updated_at: new Date() })
      .where(
        and(
          eq(idempotencyKeys.key, idempKey),
          eq(idempotencyKeys.organization_id, organizationId),
        ),
      );
    return { ok: false, reason: ziina.reason };
  }

  // Step 5: Store redirect URL so a duplicate request within the TTL reuses this checkout.
  await db
    .update(idempotencyKeys)
    .set({
      status: 'PROCESSING',
      response_payload: {
        orderId: orderResult.orderId,
        paymentId: ziina.paymentId,
        redirectUrl: ziina.redirectUrl,
      },
      updated_at: new Date(),
    })
    .where(
      and(
        eq(idempotencyKeys.key, idempKey),
        eq(idempotencyKeys.organization_id, organizationId),
      ),
    );

  redirect(ziina.redirectUrl);
}
