// DR 0083: AI Cost Governance — financial service boundary for recording AI generation cost.
// DR 0060 §2.1, §2.5: Runtime does NOT write financial records directly.
// DR 0067 §2.3: Only authoritative provider cost data may be recorded.
// DR 0060 §2.8 / DR 0067 §2.6: Higgsfield V2 does NOT expose per-generation cost in
//   dispatch, polling, or webhook responses. Cost recording remains DEFERRED until
//   authoritative data is available.
// DR 0067 §2.4: Idempotency via system.idempotency_keys; exactly once per AiGeneration.

import { db } from '@/db/index';
import { financialLedger, expenses } from '@/db/schema/financial';
import { idempotencyKeys } from '@/db/schema/system';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

// Authoritative cost data as supplied by the provider.
// Only amounts confirmed by the provider's own response are accepted.
export interface ProviderCost {
  amount: string;    // decimal string, e.g. "0.0250"
  currency: string;  // ISO 4217, e.g. "USD"
}

export type CostRecordingResult =
  | { ok: true; recorded: true; expenseId: string }
  | { ok: true; recorded: false; reason: 'no_authoritative_cost' | 'already_recorded' }
  | { ok: false; error: string };

// Records AI generation cost atomically in financial.expenses + financial.financial_ledger.
// Called ONLY by the financial service boundary, never by the runtime driver directly (DR 0060 §2.1).
//
// When providerCost is undefined, returns recorded=false — this is the expected outcome
// for Higgsfield V2, which does not expose per-generation cost in any API response.
// No fabricated, estimated, or approximated cost values are ever written (DR 0067 §2.3).
//
// Parameters:
//   aiGenerationId  — the SUCCEEDED AiGeneration UUID (DR 0067 §2.5: SUCCEEDED only)
//   organizationId  — from internal state only, never caller input (DR 0060 §2.5)
//   orderBudgetId   — from the order associated with the production job
//   providerCost    — authoritative cost from provider; undefined when unavailable
export async function recordAiGenerationCost(params: {
  aiGenerationId: string;
  organizationId: string;
  orderBudgetId: string;
  providerCost?: ProviderCost;
}): Promise<CostRecordingResult> {
  const { aiGenerationId, organizationId, orderBudgetId, providerCost } = params;

  // DR 0060 §2.8 / DR 0067 §2.3 / DR 0067 §2.6:
  // If no authoritative cost data is available, do not record.
  // Higgsfield V2 dispatch, polling, and webhook responses carry no cost field.
  if (!providerCost) {
    return { ok: true, recorded: false, reason: 'no_authoritative_cost' };
  }

  // DR 0067 §2.4: Idempotency key scoped to aiGenerationId.
  const idempKey = `AI_GENERATION_COST_RECORDED:${aiGenerationId}`;

  const existingIdemp = await db
    .select({ status: idempotencyKeys.status })
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)))
    .limit(1);

  if (existingIdemp.length > 0 && existingIdemp[0].status === 'COMPLETED') {
    return { ok: true, recorded: false, reason: 'already_recorded' };
  }

  const expenseId = uuidv7();

  try {
    // DR 0067 §2.2: Atomic transaction — both writes succeed or both roll back.
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'AI_GENERATION_COST_RECORDED',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      // DR 0067 §2.2 (1): expense record
      await tx.insert(expenses).values({
        id: expenseId,
        order_budget_id: orderBudgetId,
        organization_id: organizationId,
        amount: providerCost.amount,
        currency: providerCost.currency,
        expense_type: 'AI_GENERATION',
        description: `AI generation cost for generation ${aiGenerationId}`,
      });

      // DR 0067 §2.2 (2): financial ledger entry (DR 0060 §2.3: AI_GENERATION_EXPENSE type)
      await tx.insert(financialLedger).values({
        id: uuidv7(),
        organization_id: organizationId,
        entry_type: 'AI_GENERATION_EXPENSE',
        amount: providerCost.amount,
        currency: providerCost.currency,
        reference_entity_type: 'ai_generation',
        reference_entity_id: aiGenerationId,
        description: `AI generation expense for generation ${aiGenerationId}`,
      });

      await tx
        .update(idempotencyKeys)
        .set({ status: 'COMPLETED', updated_at: new Date() })
        .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)));
    });

    return { ok: true, recorded: true, expenseId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Cost recording failed: ${msg}` };
  }
}
