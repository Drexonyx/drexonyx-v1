// DR 0046: SENT→ACCEPTED transition, atomic Order + OrderBudget creation.
// organizationId is always caller-supplied from the server-side JWT — never from client input.
// No Financial Ledger writes on Quote acceptance (DR 0046 §6).
// CLIENT role only. OWNER and ADMIN_OPERATIONS are NOT authorized (DR 0046 §3.1).

import { db } from '@/db/index';
import { quotes, orders, orderBudgets } from '@/db/schema/commercial';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

export type AcceptQuoteResult =
  | { ok: true; quoteId: string; orderId: string }
  | { ok: false; reason: string };

export async function acceptQuote(params: {
  quoteId: string;
  organizationId: string;
  actorId: string;
}): Promise<AcceptQuoteResult> {
  const { quoteId, organizationId, actorId } = params;
  const idempKey = `SENT_TO_ACCEPTED:${quoteId}`;

  // Step 1: Fast-path idempotency check (DR 0046 §3.6)
  const existingKey = await db
    .select({ status: idempotencyKeys.status, response_payload: idempotencyKeys.response_payload })
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, idempKey),
        eq(idempotencyKeys.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (existingKey.length > 0) {
    if (existingKey[0].status === 'COMPLETED') {
      const payload = existingKey[0].response_payload as { orderId: string } | null;
      return { ok: true, quoteId, orderId: payload?.orderId ?? '' };
    }
    if (existingKey[0].status === 'PROCESSING') {
      return { ok: false, reason: 'A quote acceptance operation is already in progress' };
    }
  }

  // Step 2: Fetch the quote (org-scoped, non-archived)
  const quoteRows = await db
    .select({
      id: quotes.id,
      status: quotes.status,
      total_amount: quotes.total_amount,
      estimated_cost: quotes.estimated_cost,
      currency: quotes.currency,
      campaign_id: quotes.campaign_id,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.id, quoteId),
        eq(quotes.organization_id, organizationId),
        isNull(quotes.archived_at),
      ),
    )
    .limit(1);

  if (quoteRows.length === 0) {
    return { ok: false, reason: 'Quote not found' };
  }

  const quote = quoteRows[0];

  // Idempotency — already ACCEPTED: find existing order
  if (quote.status === 'ACCEPTED') {
    const existingOrder = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.quote_id, quoteId),
          eq(orders.organization_id, organizationId),
        ),
      )
      .limit(1);
    return { ok: true, quoteId, orderId: existingOrder[0]?.id ?? '' };
  }

  // Must be SENT (DR 0046 §3.1)
  if (quote.status !== 'SENT') {
    return { ok: false, reason: `Cannot accept a quote with status ${quote.status}` };
  }

  const orderId = uuidv7();
  const orderBudgetId = uuidv7();
  const now = new Date();

  // Step 3: Atomic transaction (DR 0046 §3.5)
  // 1. Idempotency key (PROCESSING)
  // 2. Quote status → ACCEPTED, accepted_at = now()
  // 3. Order creation (ACTIVE)
  // 4. Order Budget initialization
  // 5. Audit event
  // 6. Idempotency key → COMPLETED
  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'SENT_TO_ACCEPTED',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      const updated = await tx
        .update(quotes)
        .set({ status: 'ACCEPTED', accepted_at: now, updated_at: now })
        .where(
          and(
            eq(quotes.id, quoteId),
            eq(quotes.organization_id, organizationId),
            eq(quotes.status, 'SENT'),
          ),
        )
        .returning({ id: quotes.id });

      if (updated.length === 0) {
        throw new Error('QUOTE_NOT_SENT');
      }

      await tx.insert(orders).values({
        id: orderId,
        campaign_id: quote.campaign_id,
        quote_id: quoteId,
        organization_id: organizationId,
        status: 'ACTIVE',
        created_at: now,
        updated_at: now,
      });

      // DR 0046 §3.4: planned_amount = quote.total_amount,
      // estimated_amount = quote.estimated_cost (may be null), actual_amount = null.
      await tx.insert(orderBudgets).values({
        id: orderBudgetId,
        order_id: orderId,
        organization_id: organizationId,
        planned_amount: quote.total_amount,
        estimated_amount: quote.estimated_cost ?? null,
        created_at: now,
        updated_at: now,
      });

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'quote',
        entity_id: quoteId,
        actor_id: actorId,
        actor_role: 'CLIENT',
        action: 'SENT_TO_ACCEPTED',
        payload: {
          previous_status: 'SENT',
          new_status: 'ACCEPTED',
          quote_id: quoteId,
          total_amount: quote.total_amount,
          estimated_cost: quote.estimated_cost,
          order_id: orderId,
          order_budget_planned_amount: quote.total_amount,
          order_budget_estimated_amount: quote.estimated_cost,
          idempotency_key: idempKey,
        },
      });

      await tx
        .update(idempotencyKeys)
        .set({ status: 'COMPLETED', response_payload: { orderId }, updated_at: now })
        .where(
          and(
            eq(idempotencyKeys.key, idempKey),
            eq(idempotencyKeys.organization_id, organizationId),
          ),
        );
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'QUOTE_NOT_SENT') {
      // Concurrent acceptance — find the committed order
      const existingOrder = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.quote_id, quoteId),
            eq(orders.organization_id, organizationId),
          ),
        )
        .limit(1);
      return { ok: true, quoteId, orderId: existingOrder[0]?.id ?? '' };
    }
    throw e;
  }

  return { ok: true, quoteId, orderId };
}
