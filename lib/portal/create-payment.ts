// DR 0045, DR 0047, DR 0048: Create a Stripe Checkout Session and payment record.
// organizationId is always caller-supplied from the server-side JWT — never from client input.
// Payment status PROCESSING is set at Stripe Checkout Session creation time (DR 0047 §3.4).
// Client redirects do NOT set or confirm payment status (DR 0045 §3.3).

import { db } from '@/db/index';
import { orders, quotes } from '@/db/schema/commercial';
import { payments, financialLedger } from '@/db/schema/financial';
import { auditEvents } from '@/db/schema/system';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { stripe } from '@/lib/stripe';

export type CreatePaymentResult =
  | { ok: true; checkoutUrl: string; paymentId: string }
  | { ok: false; reason: string };

export async function createCheckoutSession(params: {
  orderId: string;
  organizationId: string;
  actorId: string;
  baseUrl: string;
}): Promise<CreatePaymentResult> {
  const { orderId, organizationId, actorId, baseUrl } = params;

  // Step 1: Fetch order (org-scoped) — DR 0002 D1 tenant isolation
  const orderRows = await db
    .select({
      id: orders.id,
      quote_id: orders.quote_id,
      status: orders.status,
    })
    .from(orders)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (orderRows.length === 0) {
    return { ok: false, reason: 'Order not found' };
  }

  const order = orderRows[0];

  if (order.status !== 'ACTIVE') {
    return { ok: false, reason: `Order is not active (status: ${order.status})` };
  }

  // Step 2: Fetch quote for amount (org-scoped)
  const quoteRows = await db
    .select({
      total_amount: quotes.total_amount,
      currency: quotes.currency,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.id, order.quote_id),
        eq(quotes.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (quoteRows.length === 0) {
    return { ok: false, reason: 'Quote not found for order' };
  }

  const quote = quoteRows[0];

  // Step 3: Guard — at most one PAID payment per Order (DR 0048 §3.4)
  const existingPaid = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.order_id, orderId),
        eq(payments.organization_id, organizationId),
        eq(payments.status, 'PAID'),
      ),
    )
    .limit(1);

  if (existingPaid.length > 0) {
    return { ok: false, reason: 'This order already has a completed payment' };
  }

  const paymentId = uuidv7();
  const now = new Date();

  // Amount in cents — Stripe requires integers
  const amountCents = Math.round(parseFloat(quote.total_amount) * 100);
  const currency = (quote.currency ?? 'USD').toLowerCase();

  // Step 4: Create Stripe Checkout Session (server-side only, DR 0045 §3.1, §5.1)
  // Return URLs are server-constructed — never client-controlled (DR 0045 §4.3).
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: {
            name: 'DREXONYX Production Order',
            description: `Order ${orderId.slice(0, 8)}`,
          },
        },
        quantity: 1,
      },
    ],
    // Server-constructed return URLs (DR 0045 §4.3)
    success_url: `${baseUrl}/portal/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/portal/payments/cancel`,
    // Metadata on session for checkout events
    metadata: {
      payment_id: paymentId,
      order_id: orderId,
      organization_id: organizationId,
    },
    // Metadata on payment intent so charges carry it (for refund/chargeback webhooks)
    payment_intent_data: {
      metadata: {
        payment_id: paymentId,
        order_id: orderId,
        organization_id: organizationId,
      },
    },
  });

  if (!session.url) {
    return { ok: false, reason: 'Stripe did not return a checkout URL' };
  }

  // Step 5: Atomic transaction — record payment as PROCESSING (DR 0047 §3.4)
  await db.transaction(async (tx) => {
    await tx.insert(payments).values({
      id: paymentId,
      order_id: orderId,
      organization_id: organizationId,
      amount: quote.total_amount,
      currency: quote.currency ?? 'USD',
      // PROCESSING: checkout session created, awaiting webhook (DR 0047 §3.3)
      status: 'PROCESSING',
      idempotency_key: `checkout:${paymentId}`,
      provider_name: 'stripe',
      // Store checkout session ID for webhook reconciliation
      provider_payment_id: session.id,
      created_at: now,
    });

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'payment',
      entity_id: paymentId,
      actor_id: actorId,
      actor_role: 'CLIENT',
      action: 'PAYMENT_CHECKOUT_CREATED',
      payload: {
        payment_id: paymentId,
        order_id: orderId,
        amount: quote.total_amount,
        currency: quote.currency,
        provider: 'stripe',
        provider_session_id: session.id,
        status: 'PROCESSING',
      },
    });
  });

  return { ok: true, checkoutUrl: session.url, paymentId };
}

// ─── Financial Ledger write helpers ───────────────────────────────────────────
// DR 0052: exactly one ledger entry per payment status transition.
// Written in the same atomic transaction as the status update.

export async function writeLedgerEntry(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  params: {
    organizationId: string;
    entryType: 'CLIENT_PAYMENT' | 'PAYMENT_REFUND' | 'PAYMENT_CHARGEBACK';
    amount: string;
    currency: string;
    paymentId: string;
    description?: string;
  },
): Promise<void> {
  await tx.insert(financialLedger).values({
    id: uuidv7(),
    organization_id: params.organizationId,
    entry_type: params.entryType,
    amount: params.amount,
    currency: params.currency,
    reference_entity_type: 'payment',
    reference_entity_id: params.paymentId,
    description: params.description ?? null,
    created_at: new Date(),
  });
}
