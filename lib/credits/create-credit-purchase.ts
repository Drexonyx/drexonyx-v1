// DR 0120: Credit package checkout — creates a credit_purchase record + Ziina session.
// organizationId is always from server-side session or DREXONYX_ORG_ID — never from client.
// Amount is from credit_packages.price_aed (DB-authoritative) — never from client request.

import { db } from '@/db/index';
import { creditPackages, creditPurchases } from '@/db/schema/financial';
import { auditEvents } from '@/db/schema/system';
import { eq, and } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { createZiinaPaymentIntent, AED_TO_FILS } from '@/lib/ziina';

export type CreateCreditPurchaseResult =
  | { ok: true; redirectUrl: string; creditPurchaseId: string }
  | { ok: false; reason: string };

export async function createCreditPurchaseCheckout(params: {
  creditPackageId: string;
  organizationId: string;
  actorId: string | null;
  baseUrl: string;
  successPath?: string;
  cancelPath?: string;
}): Promise<CreateCreditPurchaseResult> {
  const { creditPackageId, organizationId, actorId, baseUrl } = params;
  const successPath = params.successPath ?? '/checkout/credit-success';
  const cancelPath = params.cancelPath ?? '/checkout/cancel';

  // Step 1: Fetch credit package — amount comes from DB only (DR 0120)
  const pkgRows = await db
    .select({
      id: creditPackages.id,
      name: creditPackages.name,
      credits: creditPackages.credits,
      price_aed: creditPackages.price_aed,
      is_active: creditPackages.is_active,
    })
    .from(creditPackages)
    .where(eq(creditPackages.id, creditPackageId))
    .limit(1);

  if (pkgRows.length === 0) return { ok: false, reason: 'Credit package not found' };

  const pkg = pkgRows[0];
  if (!pkg.is_active) return { ok: false, reason: 'Credit package is not currently available' };

  const amountFils = Math.round(parseFloat(pkg.price_aed) * AED_TO_FILS);
  if (amountFils < 200) {
    return { ok: false, reason: 'Credit package amount too small for Ziina' };
  }

  const creditPurchaseId = uuidv7();
  const now = new Date();

  // Step 2: Insert credit_purchase as PENDING
  await db.transaction(async (tx) => {
    await tx.insert(creditPurchases).values({
      id: creditPurchaseId,
      organization_id: organizationId,
      credit_package_id: creditPackageId,
      credits: pkg.credits,
      amount_aed: pkg.price_aed,
      status: 'PENDING',
      provider_name: 'ziina',
      idempotency_key: `credit_purchase_init:${creditPurchaseId}`,
      created_at: now,
      updated_at: now,
    });

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'credit_purchase',
      entity_id: creditPurchaseId,
      actor_id: actorId,
      actor_role: actorId ? 'CLIENT' : 'SYSTEM',
      action: 'CREDIT_PURCHASE_INITIATED',
      payload: {
        credit_purchase_id: creditPurchaseId,
        credit_package_id: creditPackageId,
        credits: pkg.credits,
        amount_aed: pkg.price_aed,
        provider: 'ziina',
      },
    });
  });

  // Step 3: Call Ziina API (server-side only — API key never leaves server)
  const successUrl = `${baseUrl}${successPath}?drex_credit_purchase_id=${creditPurchaseId}`;
  const cancelUrl = `${baseUrl}${cancelPath}?drex_credit_purchase_id=${creditPurchaseId}`;

  let ziina: Awaited<ReturnType<typeof createZiinaPaymentIntent>>;
  try {
    ziina = await createZiinaPaymentIntent({
      amount: amountFils,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Ziina API call failed';
    await db.transaction(async (tx) => {
      await tx
        .update(creditPurchases)
        .set({ status: 'FAILED', failure_reason: 'ziina_api_error', updated_at: new Date() })
        .where(
          and(
            eq(creditPurchases.id, creditPurchaseId),
            eq(creditPurchases.organization_id, organizationId),
            eq(creditPurchases.status, 'PENDING'),
          ),
        );
      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'credit_purchase',
        entity_id: creditPurchaseId,
        actor_id: null,
        actor_role: 'SYSTEM',
        action: 'CREDIT_PURCHASE_FAILED',
        payload: { credit_purchase_id: creditPurchaseId, failure_reason: 'ziina_api_error' },
      });
    }).catch(() => {});
    return { ok: false, reason };
  }

  if (!ziina.redirect_url || !ziina.id) {
    return { ok: false, reason: 'Ziina did not return redirect_url or id' };
  }

  // Step 4: PENDING → PROCESSING, store Ziina payment intent ID
  await db.transaction(async (tx) => {
    await tx
      .update(creditPurchases)
      .set({
        status: 'PROCESSING',
        provider_payment_id: ziina.id,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(creditPurchases.id, creditPurchaseId),
          eq(creditPurchases.organization_id, organizationId),
        ),
      );

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'credit_purchase',
      entity_id: creditPurchaseId,
      actor_id: actorId,
      actor_role: actorId ? 'CLIENT' : 'SYSTEM',
      action: 'CREDIT_PURCHASE_PROCESSING',
      payload: {
        credit_purchase_id: creditPurchaseId,
        ziina_payment_intent_id: ziina.id,
        status: 'PROCESSING',
      },
    });
  });

  return { ok: true, redirectUrl: ziina.redirect_url, creditPurchaseId };
}
