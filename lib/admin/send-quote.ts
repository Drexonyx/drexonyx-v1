// DR 0041 + DR 0043: DRAFT→SENT transition with Cost Check and Margin Check guard.
// organizationId is always caller-supplied from the server-side JWT — never from
// client input. No Financial Ledger writes. Idempotent via system.idempotency_keys.

import { db } from '@/db/index';
import { quotes, pricingConfigs } from '@/db/schema/commercial';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { runCostCheck, type CostCheckResult } from './cost-check';
import { runMarginCheck, type MarginCheckResult } from './margin-check';
import type { AdminRole } from './types';

export type SendQuoteResult =
  | { ok: true; quoteId: string }
  | { ok: false; reason: string; costCheck?: CostCheckResult; marginCheck?: MarginCheckResult };

export async function sendQuote(params: {
  quoteId: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<SendQuoteResult> {
  const { quoteId, organizationId, actorId, actorRole } = params;
  const idempKey = `DRAFT_TO_SENT:${quoteId}`;

  // Step 1: Fast-path idempotency check
  const existingKey = await db
    .select({ status: idempotencyKeys.status })
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, idempKey),
        eq(idempotencyKeys.organization_id, organizationId),
        eq(idempotencyKeys.operation_type, 'DRAFT_TO_SENT'),
      ),
    )
    .limit(1);

  if (existingKey.length > 0) {
    if (existingKey[0].status === 'COMPLETED') return { ok: true, quoteId };
    if (existingKey[0].status === 'PROCESSING') {
      return { ok: false, reason: 'A send operation for this quote is already in progress' };
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

  // Step 2a: Idempotency — already SENT
  if (quote.status === 'SENT') return { ok: true, quoteId };

  // Step 2b: Must be DRAFT
  if (quote.status !== 'DRAFT') {
    return { ok: false, reason: `Cannot send a quote with status ${quote.status}` };
  }

  // Step 3: Cost Check
  const costCheck = runCostCheck(quote);

  // Step 4: Pricing config + Margin Check
  const configRows = await db
    .select({
      minimum_acceptable_margin_rate: pricingConfigs.minimum_acceptable_margin_rate,
      target_margin_rate: pricingConfigs.target_margin_rate,
    })
    .from(pricingConfigs)
    .where(eq(pricingConfigs.organization_id, organizationId))
    .limit(1);

  const config = configRows[0] ?? null;
  const marginCheck = runMarginCheck(quote, config);

  // Step 5: Guard — write blocked-attempt audit event if either check is not PASS
  if (costCheck.state !== 'PASS' || marginCheck.state !== 'PASS') {
    await db.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'quote',
      entity_id: quoteId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'DRAFT_TO_SENT_BLOCKED',
      payload: {
        quote_id: quoteId,
        quote_status: quote.status,
        cost_check_state: costCheck.state,
        cost_check_reason: costCheck.reason,
        margin_check_state: marginCheck.state,
        margin_check_reason: marginCheck.reason,
        gross_margin_rate: marginCheck.gross_margin_rate,
        minimum_acceptable_margin_rate: marginCheck.minimum_acceptable_margin_rate,
      },
    });

    return {
      ok: false,
      reason: costCheck.state !== 'PASS' ? costCheck.reason : marginCheck.reason,
      costCheck,
      marginCheck,
    };
  }

  // Step 6: Atomic DRAFT→SENT transaction with idempotency key and success audit event
  try {
    await db.transaction(async (tx) => {
      // Insert idempotency key as PROCESSING — ignore conflict from racing request
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'DRAFT_TO_SENT',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      // Update quote status — only succeeds if still DRAFT (atomic guard)
      const updated = await tx
        .update(quotes)
        .set({ status: 'SENT', updated_at: new Date() })
        .where(
          and(
            eq(quotes.id, quoteId),
            eq(quotes.organization_id, organizationId),
            eq(quotes.status, 'DRAFT'),
          ),
        )
        .returning({ id: quotes.id });

      if (updated.length === 0) {
        throw new Error('QUOTE_NOT_DRAFT');
      }

      // Success audit event (DR 0043 §9.1)
      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'quote',
        entity_id: quoteId,
        actor_id: actorId,
        actor_role: actorRole,
        action: 'DRAFT_TO_SENT',
        payload: {
          quote_id: quoteId,
          total_amount: quote.total_amount,
          estimated_cost: costCheck.estimated_cost,
          currency: quote.currency,
          cost_check_state: costCheck.state,
          margin_check_state: marginCheck.state,
          gross_margin_rate: marginCheck.gross_margin_rate,
          minimum_acceptable_margin_rate: marginCheck.minimum_acceptable_margin_rate,
          target_margin_rate: marginCheck.target_margin_rate,
        },
      });

      // Mark idempotency key COMPLETED
      await tx
        .update(idempotencyKeys)
        .set({ status: 'COMPLETED', updated_at: new Date() })
        .where(
          and(
            eq(idempotencyKeys.key, idempKey),
            eq(idempotencyKeys.organization_id, organizationId),
          ),
        );
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'QUOTE_NOT_DRAFT') {
      // Race: quote was already sent by a concurrent request — idempotent success
      return { ok: true, quoteId };
    }
    throw e;
  }

  return { ok: true, quoteId };
}
