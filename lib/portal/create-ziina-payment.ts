// Ziina payment intent creation — DR 0110 / Owner-authorized 2026-09-17.
// organizationId is always caller-supplied from the server-side JWT — never from client input.
// Payment lifecycle: PENDING insert → Ziina API call → PROCESSING update (PENDING→PROCESSING).
// Client redirects do NOT set or confirm payment status — server-side verification required.
// Ziina is an additional provider; Stripe integration is preserved unchanged.

import { db } from '@/db/index';
import { orders, quotes } from '@/db/schema/commercial';
import { payments } from '@/db/schema/financial';
import { auditEvents } from '@/db/schema/system';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { createZiinaPaymentIntent, AED_TO_FILS } from '@/lib/ziina';

export type CreateZiinaPaymentResult =
  | { ok: true; redirectUrl: string; paymentId: string }
  | { ok: false; reason: string };

export async function createZiinaCheckoutSession(params: {
  orderId: string;
  organizationId: string;
  actorId: string;
  baseUrl: string;
}): Promise<CreateZiinaPaymentResult> {
  const { orderId, organizationId, actorId, baseUrl } = params;

  // Step 1: Fetch order (org-scoped)
  const orderRows = await db
    .select({ id: orders.id, quote_id: orders.quote_id, status: orders.status })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.organization_id, organizationId)))
    .limit(1);

  if (orderRows.length === 0) return { ok: false, reason: 'Order not found' };

  const order = orderRows[0];
  if (order.status !== 'ACTIVE') {
    return { ok: false, reason: `Order is not active (status: ${order.status})` };
  }

  // Step 2: Fetch quote for amount (org-scoped)
  const quoteRows = await db
    .select({ total_amount: quotes.total_amount, currency: quotes.currency })
    .from(quotes)
    .where(and(eq(quotes.id, order.quote_id), eq(quotes.organization_id, organizationId)))
    .limit(1);

  if (quoteRows.length === 0) return { ok: false, reason: 'Quote not found for order' };

  const quote = quoteRows[0];

  // Ziina processes AED only (amount in fils = AED × 100)
  const currency = quote.currency ?? 'AED';
  if (currency !== 'AED') {
    return { ok: false, reason: `Ziina requires AED currency (order currency: ${currency})` };
  }

  const amountFils = Math.round(parseFloat(quote.total_amount) * AED_TO_FILS);
  if (amountFils < 200) {
    return { ok: false, reason: `Amount too small for Ziina: minimum is 200 fils (2 AED)` };
  }

  // Step 3: Guard — at most one PAID payment per order (DR 0048 §3.4)
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

  // Step 4: Insert payment as PENDING
  await db.transaction(async (tx) => {
    await tx.insert(payments).values({
      id: paymentId,
      order_id: orderId,
      organization_id: organizationId,
      amount: quote.total_amount,
      currency,
      status: 'PENDING',
      idempotency_key: `ziina_checkout:${paymentId}`,
      provider_name: 'ziina',
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
        currency,
        provider: 'ziina',
        status: 'PENDING',
      },
    });
  });

  // Step 5: Call Ziina API (server-side only — API key never leaves server).
  // success_url carries drex_payment_id so the success page can look up our payment record,
  // retrieve provider_payment_id (Ziina's ID), and call GET /payment_intent/{id} server-side.
  const successUrl = `${baseUrl}/portal/payments/ziina/success?drex_payment_id=${paymentId}`;
  const cancelUrl = `${baseUrl}/portal/payments/ziina/cancel`;

  let ziina: Awaited<ReturnType<typeof createZiinaPaymentIntent>>;
  try {
    ziina = await createZiinaPaymentIntent({
      amount: amountFils,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Ziina API call failed';
    return { ok: false, reason };
  }

  if (!ziina.redirect_url || !ziina.id) {
    return { ok: false, reason: 'Ziina did not return redirect_url or id' };
  }

  // Step 6: Atomic transition PENDING → PROCESSING
  // provider_payment_id = Ziina payment intent ID (used for server-side verification)
  await db.transaction(async (tx) => {
    await tx
      .update(payments)
      .set({ status: 'PROCESSING', provider_payment_id: ziina.id })
      .where(
        and(
          eq(payments.id, paymentId),
          eq(payments.organization_id, organizationId),
        ),
      );

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'payment',
      entity_id: paymentId,
      actor_id: actorId,
      actor_role: 'CLIENT',
      action: 'PENDING_TO_PROCESSING',
      payload: {
        payment_id: paymentId,
        order_id: orderId,
        amount: quote.total_amount,
        currency,
        provider: 'ziina',
        ziina_payment_intent_id: ziina.id,
        status: 'PROCESSING',
      },
    });
  });

  return { ok: true, redirectUrl: ziina.redirect_url, paymentId };
}
