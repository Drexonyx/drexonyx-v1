// DR 0120: Credit purchase verification — server-side Ziina confirmation + credit allocation.
// Called from credit success page. organizationId from DREXONYX_ORG_ID or session — never URL.
// Idempotent: safe to call multiple times for the same creditPurchaseId.

import { db } from '@/db/index';
import { creditPurchases } from '@/db/schema/financial';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { getZiinaPaymentIntent, ZIINA_STATUS_SUCCESS, ZIINA_STATUS_FAILED, ZIINA_STATUS_CANCELLED } from '@/lib/ziina';
import { allocateCredits } from './ledger';

export type VerifyCreditPurchaseResult =
  | { status: 'COMPLETED'; creditPurchaseId: string; credits: number }
  | { status: 'ALREADY_COMPLETED'; creditPurchaseId: string; credits: number }
  | { status: 'FAILED'; creditPurchaseId: string }
  | { status: 'PENDING'; creditPurchaseId: string }
  | { status: 'NOT_FOUND' }
  | { status: 'ERROR'; reason: string };

export async function verifyCreditPurchase(
  creditPurchaseId: string,
  organizationId: string,
): Promise<VerifyCreditPurchaseResult> {
  // Step 1: Fetch credit_purchase record (org-scoped)
  const rows = await db
    .select({
      id: creditPurchases.id,
      status: creditPurchases.status,
      credits: creditPurchases.credits,
      amount_aed: creditPurchases.amount_aed,
      provider_payment_id: creditPurchases.provider_payment_id,
    })
    .from(creditPurchases)
    .where(
      and(
        eq(creditPurchases.id, creditPurchaseId),
        eq(creditPurchases.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (rows.length === 0) return { status: 'NOT_FOUND' };

  const purchase = rows[0];

  if (purchase.status === 'COMPLETED') {
    return { status: 'ALREADY_COMPLETED', creditPurchaseId: purchase.id, credits: purchase.credits };
  }
  if (purchase.status === 'FAILED') {
    return { status: 'FAILED', creditPurchaseId: purchase.id };
  }

  if (!purchase.provider_payment_id) {
    return { status: 'ERROR', reason: 'Credit purchase has no Ziina payment intent ID' };
  }

  const idempKey = `ziina_credit_verify:${purchase.provider_payment_id}`;

  // Step 2: Idempotency check
  const existing = await db
    .select({ status: idempotencyKeys.status })
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, idempKey),
        eq(idempotencyKeys.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (existing.length > 0 && existing[0].status === 'COMPLETED') {
    if (purchase.status === 'COMPLETED') {
      return { status: 'ALREADY_COMPLETED', creditPurchaseId: purchase.id, credits: purchase.credits };
    }
    return { status: 'FAILED', creditPurchaseId: purchase.id };
  }

  // Step 3: Server-side Ziina verification
  let ziina: Awaited<ReturnType<typeof getZiinaPaymentIntent>>;
  try {
    ziina = await getZiinaPaymentIntent(purchase.provider_payment_id);
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Ziina verification failed';
    return { status: 'ERROR', reason };
  }

  const now = new Date();

  if (ziina.status === ZIINA_STATUS_SUCCESS) {
    let transitioned = false;

    await db.transaction(async (tx) => {
      const updated = await tx
        .update(creditPurchases)
        .set({ status: 'COMPLETED', paid_at: now, updated_at: now })
        .where(
          and(
            eq(creditPurchases.id, purchase.id),
            eq(creditPurchases.organization_id, organizationId),
            eq(creditPurchases.status, 'PROCESSING'),
          ),
        )
        .returning({ id: creditPurchases.id });

      if (updated.length > 0) {
        transitioned = true;

        await tx.insert(auditEvents).values({
          id: uuidv7(),
          organization_id: organizationId,
          entity_type: 'credit_purchase',
          entity_id: purchase.id,
          actor_id: null,
          actor_role: 'SYSTEM',
          action: 'CREDIT_PURCHASE_COMPLETED',
          payload: {
            credit_purchase_id: purchase.id,
            credits: purchase.credits,
            amount_aed: purchase.amount_aed,
            ziina_payment_intent_id: purchase.provider_payment_id,
          },
        });
      }

      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'ZIINA_CREDIT_VERIFY',
          status: 'COMPLETED',
          response_payload: { creditPurchaseId: purchase.id, status: 'COMPLETED' },
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          created_at: now,
          updated_at: now,
        })
        .onConflictDoNothing();
    });

    // Step 4: Allocate credits after PROCESSING → COMPLETED transition
    if (transitioned) {
      const allocationResult = await allocateCredits({
        organizationId,
        creditPurchaseId: purchase.id,
        credits: purchase.credits,
        description: `${purchase.credits} credits purchased`,
      });

      if (!allocationResult.ok) {
        // Payment confirmed — log but do not fail response. Credits will be recoverable.
        console.error(
          `[verifyCreditPurchase] allocateCredits failed for purchase ${purchase.id}:`,
          allocationResult.reason,
        );
      }
    }

    return { status: 'COMPLETED', creditPurchaseId: purchase.id, credits: purchase.credits };
  }

  if (ziina.status === ZIINA_STATUS_FAILED || ziina.status === ZIINA_STATUS_CANCELLED) {
    await db.transaction(async (tx) => {
      await tx
        .update(creditPurchases)
        .set({ status: 'FAILED', failure_reason: `ziina_status:${ziina.status}`, updated_at: now })
        .where(
          and(
            eq(creditPurchases.id, purchase.id),
            eq(creditPurchases.organization_id, organizationId),
            eq(creditPurchases.status, 'PROCESSING'),
          ),
        );

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'credit_purchase',
        entity_id: purchase.id,
        actor_id: null,
        actor_role: 'SYSTEM',
        action: 'CREDIT_PURCHASE_FAILED',
        payload: {
          credit_purchase_id: purchase.id,
          ziina_status: ziina.status,
          failure_reason: `ziina_status:${ziina.status}`,
        },
      });

      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'ZIINA_CREDIT_VERIFY',
          status: 'COMPLETED',
          response_payload: { creditPurchaseId: purchase.id, status: 'FAILED' },
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          created_at: now,
          updated_at: now,
        })
        .onConflictDoNothing();
    });

    return { status: 'FAILED', creditPurchaseId: purchase.id };
  }

  return { status: 'PENDING', creditPurchaseId: purchase.id };
}
