// Ziina payment verification — DR 0110 / Owner-authorized 2026-09-17.
// Called server-side from the success page — NEVER from a client-side action alone.
// Payment status transitions require server-side GET /payment_intent/{id} confirmation.
// organizationId comes from the server-side session, never from client input.
// No autonomous refunds. No cross-client funding. Idempotent.

import { db } from '@/db/index';
import { payments } from '@/db/schema/financial';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { getZiinaPaymentIntent, ZIINA_STATUS_SUCCESS, ZIINA_STATUS_FAILED, ZIINA_STATUS_CANCELLED } from '@/lib/ziina';
import { writeLedgerEntry } from './create-payment';
import { createProductionJob } from '@/lib/admin/production-jobs';
import { createManualUploadAsset } from '@/lib/admin/manual-upload';

export type VerifyZiinaPaymentResult =
  | { status: 'PAID'; paymentId: string }
  | { status: 'FAILED'; paymentId: string }
  | { status: 'PENDING'; paymentId: string }
  | { status: 'ALREADY_PAID'; paymentId: string }
  | { status: 'NOT_FOUND' }
  | { status: 'ERROR'; reason: string };

// Looks up an internal payment by drex_payment_id (our UUID), org-scoped, then verifies
// with Ziina's server-side GET /payment_intent/{id}. Applies the correct state transition.
// PENDING: no change. SUCCESS: PROCESSING → PAID + ledger. FAILED/CANCELLED: PROCESSING → FAILED.
export async function verifyZiinaPayment(
  drexPaymentId: string,
  organizationId: string,
): Promise<VerifyZiinaPaymentResult> {
  // Step 1: Fetch our payment record (org-scoped)
  const paymentRows = await db
    .select({
      id: payments.id,
      status: payments.status,
      amount: payments.amount,
      currency: payments.currency,
      order_id: payments.order_id,
      provider_payment_id: payments.provider_payment_id,
    })
    .from(payments)
    .where(
      and(
        eq(payments.id, drexPaymentId),
        eq(payments.organization_id, organizationId),
        eq(payments.provider_name, 'ziina'),
      ),
    )
    .limit(1);

  if (paymentRows.length === 0) return { status: 'NOT_FOUND' };

  const payment = paymentRows[0];

  // Idempotent: already at a terminal state
  if (payment.status === 'PAID') return { status: 'ALREADY_PAID', paymentId: payment.id };
  if (payment.status === 'FAILED') return { status: 'FAILED', paymentId: payment.id };

  // Step 2: Must have a Ziina payment intent ID to verify
  if (!payment.provider_payment_id) {
    return { status: 'ERROR', reason: 'Payment has no Ziina payment intent ID' };
  }

  const idempKey = `ziina_verify:${payment.provider_payment_id}`;

  // Step 3: Check idempotency — skip if already processed
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
    if (payment.status === 'PAID') return { status: 'ALREADY_PAID', paymentId: payment.id };
    return { status: 'FAILED', paymentId: payment.id };
  }

  // Step 4: Server-side verification — call GET /payment_intent/{id}
  let ziina: Awaited<ReturnType<typeof getZiinaPaymentIntent>>;
  try {
    ziina = await getZiinaPaymentIntent(payment.provider_payment_id);
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Ziina verification API call failed';
    return { status: 'ERROR', reason };
  }

  const now = new Date();

  if (ziina.status === ZIINA_STATUS_SUCCESS) {
    // Step 5a: PROCESSING → PAID + ledger entry (atomic).
    // Uses .returning() to detect whether THIS transaction won the race — only the
    // request that actually transitions the payment writes the ledger entry.
    // DB-level guarantee: unique partial index on financial_ledger (migration 0021).
    let paymentTransitioned = false;

    await db.transaction(async (tx) => {
      const updated = await tx
        .update(payments)
        .set({ status: 'PAID', paid_at: now })
        .where(
          and(
            eq(payments.id, payment.id),
            eq(payments.organization_id, organizationId),
            eq(payments.status, 'PROCESSING'),
          ),
        )
        .returning({ id: payments.id });

      if (updated.length > 0) {
        paymentTransitioned = true;

        // DR 0052 §3.2: CLIENT_PAYMENT — exactly once per PAID payment
        await writeLedgerEntry(tx, {
          organizationId,
          entryType: 'CLIENT_PAYMENT',
          amount: payment.amount,
          currency: payment.currency,
          paymentId: payment.id,
          description: `Ziina payment confirmed for order ${payment.order_id.slice(0, 8)}`,
        });

        await tx.insert(auditEvents).values({
          id: uuidv7(),
          organization_id: organizationId,
          entity_type: 'payment',
          entity_id: payment.id,
          actor_id: null,
          actor_role: 'SYSTEM',
          action: 'PROCESSING_TO_PAID',
          payload: {
            payment_id: payment.id,
            order_id: payment.order_id,
            amount: payment.amount,
            currency: payment.currency,
            provider: 'ziina',
            ziina_payment_intent_id: payment.provider_payment_id,
            ziina_status: ziina.status,
            ledger_entry_type: 'CLIENT_PAYMENT',
          },
        });
      }

      // Idempotency key insert is always attempted — ON CONFLICT DO NOTHING handles
      // the case where another concurrent transaction already inserted it.
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'ZIINA_VERIFY',
          status: 'COMPLETED',
          response_payload: { paymentId: payment.id, status: 'PAID' },
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          created_at: now,
          updated_at: now,
        })
        .onConflictDoNothing();
    });

    // Step 5b: Auto-queue production job. Only runs when THIS request owns the PROCESSING→PAID
    // transition (paymentTransitioned=true). Idempotent: a page refresh returns ALREADY_PAID
    // at step 1 above and never reaches this point, so duplicates are structurally impossible.
    if (paymentTransitioned) {
      const jobResult = await createProductionJob({
        orderId: payment.order_id,
        organizationId,
        jobType: 'MANUAL_UPLOAD',
        description: `Auto-queued after Ziina payment confirmed for order ${payment.order_id.slice(0, 8)}`,
        actorId: 'SYSTEM',
        actorRole: 'OWNER',
      });
      if (jobResult.ok) {
        // Auto-create the initial MANUAL_UPLOAD asset at UPLOADED status.
        // Admin will upload the content file and then mark it READY_FOR_QC to start automated QC.
        const assetResult = await createManualUploadAsset({
          productionJobId: jobResult.jobId,
          organizationId,
          actorId: 'SYSTEM',
          actorRole: 'OWNER',
        });
        if (!assetResult.ok) {
          console.error(
            `[verifyZiinaPayment] Asset creation failed for job ${jobResult.jobId}: ${assetResult.reason}`,
          );
        }
      } else {
        // Payment is confirmed — do not fail the response. Job can be created manually.
        console.error(
          `[verifyZiinaPayment] Production job creation failed for order ${payment.order_id}: ${jobResult.reason}`,
        );
      }
    }

    return { status: 'PAID', paymentId: payment.id };
  }

  if (ziina.status === ZIINA_STATUS_FAILED || ziina.status === ZIINA_STATUS_CANCELLED) {
    // Step 5b: PROCESSING → FAILED (no ledger entry for failures — DR 0052 §5).
    // Uses .returning() for consistency — audit event only fires if transition succeeded.
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(payments)
        .set({ status: 'FAILED', failure_reason: `ziina_status:${ziina.status}` })
        .where(
          and(
            eq(payments.id, payment.id),
            eq(payments.organization_id, organizationId),
            eq(payments.status, 'PROCESSING'),
          ),
        )
        .returning({ id: payments.id });

      if (updated.length > 0) {
        await tx.insert(auditEvents).values({
          id: uuidv7(),
          organization_id: organizationId,
          entity_type: 'payment',
          entity_id: payment.id,
          actor_id: null,
          actor_role: 'SYSTEM',
          action: 'PROCESSING_TO_FAILED',
          payload: {
            payment_id: payment.id,
            provider: 'ziina',
            ziina_payment_intent_id: payment.provider_payment_id,
            ziina_status: ziina.status,
            failure_reason: `ziina_status:${ziina.status}`,
          },
        });
      }

      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'ZIINA_VERIFY',
          status: 'COMPLETED',
          response_payload: { paymentId: payment.id, status: 'FAILED' },
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          created_at: now,
          updated_at: now,
        })
        .onConflictDoNothing();
    });

    return { status: 'FAILED', paymentId: payment.id };
  }

  // Ziina payment still PENDING — no state change
  return { status: 'PENDING', paymentId: payment.id };
}
