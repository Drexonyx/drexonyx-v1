'use server';

// Self-service credit package checkout server action.
// organizationId is from DREXONYX_ORG_ID env var — never from client input.
// Amount is from financial.credit_packages (DB-authoritative) — never from client request body.
// Idempotency: exactly one checkout per (orgId, pkgId) at a time, enforced at the DB level.
// DR 0120: Customer pays AED → receives credits → uses credits to start productions in portal.

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '@/db/index';
import { idempotencyKeys } from '@/db/schema/system';
import { createCreditPurchaseCheckout } from '@/lib/credits/create-credit-purchase';

export async function actionInitiateCheckout(
  creditPackageId: string,
): Promise<{ ok: false; reason: string } | never> {
  const organizationId = process.env.DREXONYX_ORG_ID?.trim();
  if (!organizationId) {
    return { ok: false, reason: 'Service configuration error. Please contact us to proceed.' };
  }

  const now = new Date();
  const idempKey = `credit_checkout_initiate:${organizationId}:${creditPackageId}`;
  const ttl = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2-hour checkout window

  // Step 1: Atomically claim the checkout slot — only one concurrent request succeeds.
  const claimed = await db
    .insert(idempotencyKeys)
    .values({
      id: uuidv7(),
      key: idempKey,
      organization_id: organizationId,
      operation_type: 'CREDIT_CHECKOUT_INITIATE',
      status: 'PENDING',
      expires_at: ttl,
      created_at: now,
      updated_at: now,
    })
    .onConflictDoNothing()
    .returning({ id: idempotencyKeys.id });

  if (claimed.length === 0) {
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

      if (ex.status === 'PROCESSING' && ex.response_payload) {
        const payload = ex.response_payload as { redirectUrl?: string };
        if (payload.redirectUrl) redirect(payload.redirectUrl);
      }

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
          return { ok: false, reason: 'Checkout session conflict. Please try again.' };
        }
      } else {
        return {
          ok: false,
          reason: 'A checkout is already in progress. Please complete it or try again shortly.',
        };
      }
    }
  }

  // Step 2: Construct base URL from request headers
  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') ?? 'http';
  const baseUrl = `${proto}://${host}`;

  // Step 3: Create credit purchase + Ziina session (amount from DB — never client)
  const result = await createCreditPurchaseCheckout({
    creditPackageId,
    organizationId,
    actorId: null,
    baseUrl,
    successPath: '/checkout/credit-success',
    cancelPath: '/checkout/cancel',
  });

  if (!result.ok) {
    await db
      .update(idempotencyKeys)
      .set({ status: 'FAILED', updated_at: new Date() })
      .where(
        and(
          eq(idempotencyKeys.key, idempKey),
          eq(idempotencyKeys.organization_id, organizationId),
        ),
      );
    return { ok: false, reason: result.reason };
  }

  // Step 4: Store redirect URL for deduplication within TTL
  await db
    .update(idempotencyKeys)
    .set({
      status: 'PROCESSING',
      response_payload: {
        creditPurchaseId: result.creditPurchaseId,
        redirectUrl: result.redirectUrl,
      },
      updated_at: new Date(),
    })
    .where(
      and(
        eq(idempotencyKeys.key, idempKey),
        eq(idempotencyKeys.organization_id, organizationId),
      ),
    );

  redirect(result.redirectUrl);
}
