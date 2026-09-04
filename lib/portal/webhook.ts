// DR 0045 §3.4, DR 0047, DR 0048 §3.5, DR 0052:
// Stripe webhook event processing — authoritative payment state transitions.
// Signature verification is performed by the API route before calling these functions.
// All state mutations require a verified webhook event.
// DREXONYX-initiated refunds are NOT implemented (DR 0050 not approved).

import { db } from '@/db/index';
import { payments } from '@/db/schema/financial';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { writeLedgerEntry } from './create-payment';
import type Stripe from 'stripe';

export type WebhookEventResult =
  | { handled: true; eventType: string }
  | { handled: false; reason: string };

// ─── checkout.session.completed → PROCESSING → PAID ──────────────────────────

export async function handleCheckoutCompleted(
  event: Stripe.Event,
): Promise<WebhookEventResult> {
  const session = event.data.object as Stripe.Checkout.Session;
  const paymentId = session.metadata?.payment_id;
  const organizationId = session.metadata?.organization_id;

  if (!paymentId || !organizationId) {
    return { handled: false, reason: 'Missing metadata: payment_id or organization_id' };
  }

  // Only process if payment was confirmed (payment_status = paid)
  if (session.payment_status !== 'paid') {
    return { handled: false, reason: `Session payment_status is ${session.payment_status}, not paid` };
  }

  const idempKey = `stripe_event:${event.id}`;

  return withIdempotency(idempKey, organizationId, async () => {
    // Fetch payment record (org-scoped)
    const paymentRows = await db
      .select({
        id: payments.id,
        status: payments.status,
        amount: payments.amount,
        currency: payments.currency,
        order_id: payments.order_id,
      })
      .from(payments)
      .where(
        and(
          eq(payments.id, paymentId),
          eq(payments.organization_id, organizationId),
        ),
      )
      .limit(1);

    if (paymentRows.length === 0) {
      throw new Error(`Payment ${paymentId} not found for org ${organizationId}`);
    }

    const payment = paymentRows[0];

    // Idempotent: already PAID
    if (payment.status === 'PAID') return;

    // Must be PROCESSING to transition to PAID (DR 0047 §3.2)
    if (payment.status !== 'PROCESSING') {
      throw new Error(`Cannot transition payment ${paymentId} from ${payment.status} to PAID`);
    }

    const now = new Date();
    // Payment intent ID for future charge event reconciliation
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

    await db.transaction(async (tx) => {
      await tx
        .update(payments)
        .set({
          status: 'PAID',
          paid_at: now,
          // Update provider_payment_id to payment intent ID for charge reconciliation
          ...(paymentIntentId ? { provider_payment_id: paymentIntentId } : {}),
        })
        .where(
          and(
            eq(payments.id, paymentId),
            eq(payments.organization_id, organizationId),
            eq(payments.status, 'PROCESSING'),
          ),
        );

      // DR 0052 §3.2: CLIENT_PAYMENT — exactly once per PAID payment
      await writeLedgerEntry(tx, {
        organizationId,
        entryType: 'CLIENT_PAYMENT',
        amount: payment.amount,
        currency: payment.currency,
        paymentId,
        description: `Payment confirmed for order ${payment.order_id.slice(0, 8)}`,
      });

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'payment',
        entity_id: paymentId,
        actor_id: null,
        actor_role: 'SYSTEM',
        action: 'PROCESSING_TO_PAID',
        payload: {
          payment_id: paymentId,
          order_id: payment.order_id,
          amount: payment.amount,
          currency: payment.currency,
          provider_event_id: event.id,
          provider_session_id: session.id,
          payment_intent_id: paymentIntentId,
          ledger_entry_type: 'CLIENT_PAYMENT',
        },
      });

      await markIdempotencyCompleted(tx, idempKey, organizationId, { paymentId, status: 'PAID' });
    });
  });
}

// ─── checkout.session.expired / async_payment_failed → PROCESSING → FAILED ───

export async function handleCheckoutFailed(
  event: Stripe.Event,
): Promise<WebhookEventResult> {
  const session = event.data.object as Stripe.Checkout.Session;
  const paymentId = session.metadata?.payment_id;
  const organizationId = session.metadata?.organization_id;

  if (!paymentId || !organizationId) {
    return { handled: false, reason: 'Missing metadata: payment_id or organization_id' };
  }

  const idempKey = `stripe_event:${event.id}`;

  return withIdempotency(idempKey, organizationId, async () => {
    const paymentRows = await db
      .select({ id: payments.id, status: payments.status })
      .from(payments)
      .where(
        and(
          eq(payments.id, paymentId),
          eq(payments.organization_id, organizationId),
        ),
      )
      .limit(1);

    if (paymentRows.length === 0) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    const payment = paymentRows[0];

    // Idempotent: already terminal
    if (payment.status === 'FAILED') return;

    // Must be PROCESSING (DR 0047 §3.2)
    if (payment.status !== 'PROCESSING') {
      throw new Error(`Cannot transition payment ${paymentId} from ${payment.status} to FAILED`);
    }

    const now = new Date();
    const failureReason = event.type === 'checkout.session.expired'
      ? 'checkout_session_expired'
      : 'async_payment_failed';

    await db.transaction(async (tx) => {
      await tx
        .update(payments)
        .set({ status: 'FAILED', failure_reason: failureReason })
        .where(
          and(
            eq(payments.id, paymentId),
            eq(payments.organization_id, organizationId),
            eq(payments.status, 'PROCESSING'),
          ),
        );

      // No Financial Ledger entry for FAILED (DR 0052 §5)
      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'payment',
        entity_id: paymentId,
        actor_id: null,
        actor_role: 'SYSTEM',
        action: 'PROCESSING_TO_FAILED',
        payload: {
          payment_id: paymentId,
          provider_event_id: event.id,
          failure_reason: failureReason,
          event_type: event.type,
        },
      });

      await markIdempotencyCompleted(tx, idempKey, organizationId, { paymentId, status: 'FAILED' });
    });

    void now; // suppress unused variable warning
  });
}

// ─── charge.refunded → PAID → REFUNDED ───────────────────────────────────────
// Webhook-initiated only. DREXONYX-side refund initiation is NOT implemented
// (DR 0050 not approved). Full refunds only in V1 (DR 0052 §3.3).

export async function handleChargeRefunded(
  event: Stripe.Event,
): Promise<WebhookEventResult> {
  const charge = event.data.object as Stripe.Charge;
  const paymentId = charge.metadata?.payment_id;
  const organizationId = charge.metadata?.organization_id;

  if (!paymentId || !organizationId) {
    // Try to look up by payment_intent_id
    const paymentIntentId = typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : null;

    if (!paymentIntentId) {
      return { handled: false, reason: 'Cannot identify payment from charge event' };
    }

    return lookupAndHandleRefund(event, paymentIntentId);
  }

  const idempKey = `stripe_event:${event.id}`;

  return withIdempotency(idempKey, organizationId, async () => {
    await applyRefund(idempKey, event, paymentId, organizationId, charge);
  });
}

async function lookupAndHandleRefund(
  event: Stripe.Event,
  paymentIntentId: string,
): Promise<WebhookEventResult> {
  const charge = event.data.object as Stripe.Charge;

  const paymentRows = await db
    .select({
      id: payments.id,
      organization_id: payments.organization_id,
      status: payments.status,
      amount: payments.amount,
      currency: payments.currency,
      order_id: payments.order_id,
    })
    .from(payments)
    .where(eq(payments.provider_payment_id, paymentIntentId))
    .limit(1);

  if (paymentRows.length === 0) {
    return { handled: false, reason: `No payment found for payment_intent ${paymentIntentId}` };
  }

  const payment = paymentRows[0];
  const idempKey = `stripe_event:${event.id}`;

  return withIdempotency(idempKey, payment.organization_id, async () => {
    await applyRefund(idempKey, event, payment.id, payment.organization_id, charge);
  });
}

async function applyRefund(
  idempKey: string,
  event: Stripe.Event,
  paymentId: string,
  organizationId: string,
  charge: Stripe.Charge,
): Promise<void> {
  const paymentRows = await db
    .select({
      id: payments.id,
      status: payments.status,
      amount: payments.amount,
      currency: payments.currency,
      order_id: payments.order_id,
    })
    .from(payments)
    .where(
      and(
        eq(payments.id, paymentId),
        eq(payments.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (paymentRows.length === 0) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  const payment = paymentRows[0];

  if (payment.status === 'REFUNDED') return; // idempotent
  if (payment.status !== 'PAID') {
    throw new Error(`Cannot refund payment ${paymentId} with status ${payment.status}`);
  }

  const now = new Date();
  // V1: full refund amount = original payment amount (DR 0052 §3.3)
  const refundedAmount = payment.amount;

  await db.transaction(async (tx) => {
    await tx
      .update(payments)
      .set({ status: 'REFUNDED', refunded_at: now })
      .where(
        and(
          eq(payments.id, paymentId),
          eq(payments.organization_id, organizationId),
          eq(payments.status, 'PAID'),
        ),
      );

    // DR 0052 §3.3: PAYMENT_REFUND — exactly once per REFUNDED payment
    await writeLedgerEntry(tx, {
      organizationId,
      entryType: 'PAYMENT_REFUND',
      amount: refundedAmount,
      currency: payment.currency,
      paymentId,
      description: `Refund for order ${payment.order_id.slice(0, 8)}`,
    });

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'payment',
      entity_id: paymentId,
      actor_id: null,
      actor_role: 'SYSTEM',
      action: 'PAID_TO_REFUNDED',
      payload: {
        payment_id: paymentId,
        order_id: payment.order_id,
        refunded_amount: refundedAmount,
        currency: payment.currency,
        provider_event_id: event.id,
        charge_id: charge.id,
        ledger_entry_type: 'PAYMENT_REFUND',
      },
    });

    await markIdempotencyCompleted(tx, idempKey, organizationId, { paymentId, status: 'REFUNDED' });
  });
}

// ─── charge.dispute.created → PAID → CHARGEBACK ──────────────────────────────

export async function handleChargeDisputed(
  event: Stripe.Event,
): Promise<WebhookEventResult> {
  const dispute = event.data.object as Stripe.Dispute;
  const paymentIntentId = typeof dispute.payment_intent === 'string'
    ? dispute.payment_intent
    : null;

  if (!paymentIntentId) {
    return { handled: false, reason: 'Dispute event missing payment_intent reference' };
  }

  // Look up payment by payment_intent_id stored in provider_payment_id
  const paymentRows = await db
    .select({
      id: payments.id,
      organization_id: payments.organization_id,
      status: payments.status,
      amount: payments.amount,
      currency: payments.currency,
      order_id: payments.order_id,
    })
    .from(payments)
    .where(eq(payments.provider_payment_id, paymentIntentId))
    .limit(1);

  if (paymentRows.length === 0) {
    return { handled: false, reason: `No payment found for payment_intent ${paymentIntentId}` };
  }

  const payment = paymentRows[0];
  const idempKey = `stripe_event:${event.id}`;

  return withIdempotency(idempKey, payment.organization_id, async () => {
    if (payment.status === 'CHARGEBACK') return; // idempotent
    if (payment.status !== 'PAID') {
      throw new Error(`Cannot chargeback payment ${payment.id} with status ${payment.status}`);
    }

    const now = new Date();
    const chargebackAmount = payment.amount;

    await db.transaction(async (tx) => {
      await tx
        .update(payments)
        .set({ status: 'CHARGEBACK' })
        .where(
          and(
            eq(payments.id, payment.id),
            eq(payments.organization_id, payment.organization_id),
            eq(payments.status, 'PAID'),
          ),
        );

      // DR 0052 §3.4: PAYMENT_CHARGEBACK — exactly once per CHARGEBACK payment
      await writeLedgerEntry(tx, {
        organizationId: payment.organization_id,
        entryType: 'PAYMENT_CHARGEBACK',
        amount: chargebackAmount,
        currency: payment.currency,
        paymentId: payment.id,
        description: `Chargeback for order ${payment.order_id.slice(0, 8)}`,
      });

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: payment.organization_id,
        entity_type: 'payment',
        entity_id: payment.id,
        actor_id: null,
        actor_role: 'SYSTEM',
        action: 'PAID_TO_CHARGEBACK',
        payload: {
          payment_id: payment.id,
          order_id: payment.order_id,
          chargeback_amount: chargebackAmount,
          currency: payment.currency,
          provider_event_id: event.id,
          dispute_id: dispute.id,
          payment_intent_id: paymentIntentId,
          ledger_entry_type: 'PAYMENT_CHARGEBACK',
        },
      });

      await markIdempotencyCompleted(tx, idempKey, payment.organization_id, {
        paymentId: payment.id,
        status: 'CHARGEBACK',
      });
    });

    void now;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function withIdempotency(
  idempKey: string,
  organizationId: string,
  handler: () => Promise<void>,
): Promise<WebhookEventResult> {
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
    return { handled: true, eventType: idempKey };
  }

  await handler();
  return { handled: true, eventType: idempKey };
}

async function markIdempotencyCompleted(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  idempKey: string,
  organizationId: string,
  responsePayload: Record<string, unknown>,
): Promise<void> {
  const now = new Date();
  await tx
    .insert(idempotencyKeys)
    .values({
      id: uuidv7(),
      key: idempKey,
      organization_id: organizationId,
      operation_type: 'STRIPE_WEBHOOK',
      status: 'COMPLETED',
      response_payload: responsePayload,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      created_at: now,
      updated_at: now,
    })
    .onConflictDoNothing();
}
