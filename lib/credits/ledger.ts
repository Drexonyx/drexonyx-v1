// DR 0120: Customer credit ledger operations — allocate, reserve, release, adjust.
// All operations are idempotent via idempotency_key + ON CONFLICT DO NOTHING.
// Balance is always verified server-side before reservation; never from client input.

import { db } from '@/db/index';
import { customerCreditLedger } from '@/db/schema/financial';
import { auditEvents } from '@/db/schema/system';
import { eq, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

const _SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CreditOperationResult =
  | { ok: true }
  | { ok: false; reason: string };

// ─── allocateCredits ───────────────────────────────────────────────────────────
// Called after a credit purchase is confirmed (COMPLETED).
// Writes a PURCHASE entry (+credits_delta) to the ledger.
// Idempotent: idempotency_key = `credit_purchase:${creditPurchaseId}`.

export async function allocateCredits(params: {
  organizationId: string;
  creditPurchaseId: string;
  credits: number;
  description?: string;
}): Promise<CreditOperationResult> {
  const { organizationId, creditPurchaseId, credits, description } = params;
  const idempKey = `credit_purchase:${creditPurchaseId}`;

  try {
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(customerCreditLedger)
        .values({
          id: uuidv7(),
          organization_id: organizationId,
          entry_type: 'PURCHASE',
          credits_delta: credits,
          reference_entity_type: 'credit_purchase',
          reference_entity_id: creditPurchaseId,
          idempotency_key: idempKey,
          description: description ?? `Credits purchased — ${credits} credits`,
          actor_id: null,
          actor_role: 'SYSTEM',
          created_at: new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: customerCreditLedger.id });

      if (inserted.length > 0) {
        await tx.insert(auditEvents).values({
          id: uuidv7(),
          organization_id: organizationId,
          entity_type: 'customer_credit_ledger',
          entity_id: inserted[0].id,
          actor_id: null,
          actor_role: 'SYSTEM',
          action: 'CREDITS_ALLOCATED',
          payload: {
            credit_purchase_id: creditPurchaseId,
            credits_delta: credits,
            entry_type: 'PURCHASE',
          },
        });
      }
    });

    return { ok: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Credit allocation failed';
    return { ok: false, reason };
  }
}

// ─── reserveCredits ───────────────────────────────────────────────────────────
// Called before a production job starts.
// Checks available balance >= cost, then writes a RESERVATION entry (-credits_delta).
// Returns { ok: false, reason: 'INSUFFICIENT_CREDITS' } if balance is insufficient.
// Idempotent: idempotency_key = `reservation:{productionJobId}`.

export async function reserveCredits(params: {
  organizationId: string;
  productionJobId: string;
  credits: number;
  description?: string;
  actorId?: string | null;
}): Promise<CreditOperationResult> {
  const { organizationId, productionJobId, credits, description, actorId } = params;
  const idempKey = `reservation:${productionJobId}`;

  // Check if already reserved (idempotent check)
  const existing = await db
    .select({ id: customerCreditLedger.id })
    .from(customerCreditLedger)
    .where(eq(customerCreditLedger.idempotency_key, idempKey))
    .limit(1);

  if (existing.length > 0) return { ok: true };

  // Verify sufficient balance (server-side only — DR 0120)
  const balanceRows = await db
    .select({ total: sql<string>`COALESCE(SUM(${customerCreditLedger.credits_delta}), 0)` })
    .from(customerCreditLedger)
    .where(eq(customerCreditLedger.organization_id, organizationId));

  const balance = parseInt(balanceRows[0]?.total ?? '0', 10);
  if (balance < credits) {
    return { ok: false, reason: 'INSUFFICIENT_CREDITS' };
  }

  try {
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(customerCreditLedger)
        .values({
          id: uuidv7(),
          organization_id: organizationId,
          entry_type: 'RESERVATION',
          credits_delta: -credits,
          reference_entity_type: 'production_job',
          reference_entity_id: productionJobId,
          idempotency_key: idempKey,
          description: description ?? `Credits reserved for production job ${productionJobId.slice(0, 8)}`,
          actor_id: actorId ?? null,
          actor_role: actorId ? 'CLIENT' : 'SYSTEM',
          created_at: new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: customerCreditLedger.id });

      if (inserted.length > 0) {
        await tx.insert(auditEvents).values({
          id: uuidv7(),
          organization_id: organizationId,
          entity_type: 'customer_credit_ledger',
          entity_id: inserted[0].id,
          actor_id: actorId ?? null,
          actor_role: actorId ? 'CLIENT' : 'SYSTEM',
          action: 'CREDITS_RESERVED',
          payload: {
            production_job_id: productionJobId,
            credits_delta: -credits,
            balance_before: balance,
            entry_type: 'RESERVATION',
          },
        });
      }
    });

    return { ok: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Credit reservation failed';
    return { ok: false, reason };
  }
}

// ─── releaseCredits ───────────────────────────────────────────────────────────
// Called when a production job fails or QC fails.
// Writes a RELEASE entry (+credits_delta) to restore the reserved credits.
// Idempotent: idempotency_key = `release:{productionJobId}`.

export async function releaseCredits(params: {
  organizationId: string;
  productionJobId: string;
  credits: number;
  description?: string;
}): Promise<CreditOperationResult> {
  const { organizationId, productionJobId, credits, description } = params;
  const idempKey = `release:${productionJobId}`;

  try {
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(customerCreditLedger)
        .values({
          id: uuidv7(),
          organization_id: organizationId,
          entry_type: 'RELEASE',
          credits_delta: credits,
          reference_entity_type: 'production_job',
          reference_entity_id: productionJobId,
          idempotency_key: idempKey,
          description: description ?? `Credits released — production job ${productionJobId.slice(0, 8)} failed`,
          actor_id: null,
          actor_role: 'SYSTEM',
          created_at: new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: customerCreditLedger.id });

      if (inserted.length > 0) {
        await tx.insert(auditEvents).values({
          id: uuidv7(),
          organization_id: organizationId,
          entity_type: 'customer_credit_ledger',
          entity_id: inserted[0].id,
          actor_id: null,
          actor_role: 'SYSTEM',
          action: 'CREDITS_RELEASED',
          payload: {
            production_job_id: productionJobId,
            credits_delta: credits,
            entry_type: 'RELEASE',
          },
        });
      }
    });

    return { ok: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Credit release failed';
    return { ok: false, reason };
  }
}

// ─── adjustCredits ────────────────────────────────────────────────────────────
// Admin-only: manual credit adjustment with full audit trail.
// creditsDelta can be positive (add) or negative (deduct).
// Admin must supply a reason; the actor_id and actor_role are recorded.

export async function adjustCredits(params: {
  organizationId: string;
  creditsDelta: number;
  actorId: string;
  actorRole: string;
  reason: string;
  idempotencyKey: string;
}): Promise<CreditOperationResult> {
  const { organizationId, creditsDelta, actorId, actorRole, reason, idempotencyKey } = params;

  if (creditsDelta === 0) {
    return { ok: false, reason: 'Adjustment delta cannot be zero' };
  }

  try {
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(customerCreditLedger)
        .values({
          id: uuidv7(),
          organization_id: organizationId,
          entry_type: 'ADJUSTMENT',
          credits_delta: creditsDelta,
          reference_entity_type: 'admin_adjustment',
          reference_entity_id: null,
          idempotency_key: idempotencyKey,
          description: reason,
          actor_id: actorId,
          actor_role: actorRole,
          created_at: new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: customerCreditLedger.id });

      if (inserted.length > 0) {
        await tx.insert(auditEvents).values({
          id: uuidv7(),
          organization_id: organizationId,
          entity_type: 'customer_credit_ledger',
          entity_id: inserted[0].id,
          actor_id: actorId,
          actor_role: actorRole,
          action: 'CREDITS_ADJUSTED',
          payload: {
            credits_delta: creditsDelta,
            reason,
            entry_type: 'ADJUSTMENT',
          },
        });
      }
    });

    return { ok: true };
  } catch (err) {
    const reason2 = err instanceof Error ? err.message : 'Credit adjustment failed';
    return { ok: false, reason: reason2 };
  }
}

// ─── refundCredits ────────────────────────────────────────────────────────────
// Called when a credit purchase is refunded.
// Writes a REFUND entry (-credits_delta) to claw back the allocated credits.
// Idempotent: idempotency_key = `refund_credit_purchase:{creditPurchaseId}`.

export async function refundCredits(params: {
  organizationId: string;
  creditPurchaseId: string;
  credits: number;
  description?: string;
}): Promise<CreditOperationResult> {
  const { organizationId, creditPurchaseId, credits, description } = params;
  const idempKey = `refund_credit_purchase:${creditPurchaseId}`;

  try {
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(customerCreditLedger)
        .values({
          id: uuidv7(),
          organization_id: organizationId,
          entry_type: 'REFUND',
          credits_delta: -credits,
          reference_entity_type: 'credit_purchase',
          reference_entity_id: creditPurchaseId,
          idempotency_key: idempKey,
          description: description ?? `Credits refunded — purchase ${creditPurchaseId.slice(0, 8)}`,
          actor_id: null,
          actor_role: 'SYSTEM',
          created_at: new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: customerCreditLedger.id });

      if (inserted.length > 0) {
        await tx.insert(auditEvents).values({
          id: uuidv7(),
          organization_id: organizationId,
          entity_type: 'customer_credit_ledger',
          entity_id: inserted[0].id,
          actor_id: null,
          actor_role: 'SYSTEM',
          action: 'CREDITS_REFUNDED',
          payload: {
            credit_purchase_id: creditPurchaseId,
            credits_delta: -credits,
            entry_type: 'REFUND',
          },
        });
      }
    });

    return { ok: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Credit refund failed';
    return { ok: false, reason };
  }
}
