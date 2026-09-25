// DR 0120: Internal production credit economics — cost guard evaluation + audit.
//
// INTERNAL ONLY. Never exposed to customers.
// Evaluates the internal cost guard for a production job, records the result
// in financial.production_credit_events, and returns whether production may proceed.
//
// Caller responsibilities:
//   - organizationId MUST come from a server-side session/token.
//   - creditsConsumed = total credits this production job has consumed so far
//     (i.e. creditCost × attempt count for retries under the same job).
//   - packageCredits = total credits in the customer's credit package tier.
//     Used to derive the AED/credit rate; must come from the DB, never from client input.
//
// The customer credit ledger (financial.customer_credit_ledger) is NOT touched here.
// It is authoritative for customer balances; this module only writes internal audit events.

import { db } from '@/db/index';
import { productionCreditEvents } from '@/db/schema/financial';
import { auditEvents } from '@/db/schema/system';
import { uuidv7 } from 'uuidv7';
import {
  evaluateCostGuard,
  resolvePackageEconomics,
  type CostGuardWarning,
} from './cost-guard';

export type ProductionCreditEventType =
  | 'PRODUCTION_START'
  | 'RETRY'
  | 'QC_FAIL'
  | 'COMPLETION'
  | 'RUNAWAY_REFUSED';

export interface RecordProductionEconomicsParams {
  organizationId: string;
  productionJobId: string;
  /** Total credits consumed by this job at the point of this evaluation. */
  creditsConsumed: number;
  /** Total credits in the customer's credit package (from DB — not from client). */
  packageCredits: number;
  /** What triggered this evaluation. */
  eventType: ProductionCreditEventType;
}

export type RecordProductionEconomicsResult =
  | { ok: true; proceed: boolean; warningLevel: CostGuardWarning; reason: string }
  | { ok: false; reason: string };

/**
 * Evaluates the cost guard for a production job and records the result.
 * Returns { proceed: false } when the runaway limit is reached.
 * All other warning levels allow production to continue.
 */
export async function recordProductionEconomics(
  params: RecordProductionEconomicsParams,
): Promise<RecordProductionEconomicsResult> {
  const { organizationId, productionJobId, creditsConsumed, packageCredits, eventType } = params;

  const economics = resolvePackageEconomics(packageCredits);
  if (!economics) {
    return { ok: false, reason: 'No package economics table configured' };
  }

  const guardResult = evaluateCostGuard(creditsConsumed, economics);

  const finalEventType: ProductionCreditEventType =
    !guardResult.proceed ? 'RUNAWAY_REFUSED' : eventType;

  try {
    await db.transaction(async (tx) => {
      const eventId = uuidv7();

      await tx.insert(productionCreditEvents).values({
        id: eventId,
        organization_id: organizationId,
        production_job_id: productionJobId,
        credits_consumed: creditsConsumed,
        warning_level: guardResult.warningLevel,
        credit_rate_aed: String(guardResult.creditRateAed.toFixed(8)),
        estimated_aed: String(guardResult.estimatedAedConsumed.toFixed(4)),
        cost_target_aed: String(guardResult.costTargetAed.toFixed(4)),
        safety_reserve_aed: String(guardResult.safetyReserveAed.toFixed(4)),
        hard_limit_aed: String(guardResult.hardLimitAed.toFixed(4)),
        event_type: finalEventType,
        proceeded: guardResult.proceed,
        reason: guardResult.reason,
        created_at: new Date(),
      });

      // Write internal audit event — never exposed to customer-facing APIs.
      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'production_credit_event',
        entity_id: eventId,
        actor_id: productionJobId,
        actor_role: 'AGENT',
        action: `CREDIT_ECONOMICS_${finalEventType}`,
        payload: {
          production_job_id: productionJobId,
          credits_consumed: creditsConsumed,
          warning_level: guardResult.warningLevel,
          estimated_aed: guardResult.estimatedAedConsumed,
          cost_target_aed: guardResult.costTargetAed,
          proceeded: guardResult.proceed,
        },
      });
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Failed to record production economics';
    return { ok: false, reason };
  }

  return {
    ok: true,
    proceed: guardResult.proceed,
    warningLevel: guardResult.warningLevel,
    reason: guardResult.reason,
  };
}

// ─── Admin query ───────────────────────────────────────────────────────────────
// Returns internal credit economics events for admin/owner visibility.
// Never call from customer-facing APIs.

import { desc, eq } from 'drizzle-orm';

export interface ProductionCreditEventRow {
  id: string;
  production_job_id: string;
  credits_consumed: number;
  warning_level: string;
  credit_rate_aed: string;
  estimated_aed: string;
  cost_target_aed: string;
  safety_reserve_aed: string;
  hard_limit_aed: string;
  event_type: string;
  proceeded: boolean;
  reason: string | null;
  created_at: Date;
}

export async function getProductionCreditEvents(
  organizationId: string,
  limit = 200,
): Promise<ProductionCreditEventRow[]> {
  return db
    .select({
      id: productionCreditEvents.id,
      production_job_id: productionCreditEvents.production_job_id,
      credits_consumed: productionCreditEvents.credits_consumed,
      warning_level: productionCreditEvents.warning_level,
      credit_rate_aed: productionCreditEvents.credit_rate_aed,
      estimated_aed: productionCreditEvents.estimated_aed,
      cost_target_aed: productionCreditEvents.cost_target_aed,
      safety_reserve_aed: productionCreditEvents.safety_reserve_aed,
      hard_limit_aed: productionCreditEvents.hard_limit_aed,
      event_type: productionCreditEvents.event_type,
      proceeded: productionCreditEvents.proceeded,
      reason: productionCreditEvents.reason,
      created_at: productionCreditEvents.created_at,
    })
    .from(productionCreditEvents)
    .where(eq(productionCreditEvents.organization_id, organizationId))
    .orderBy(desc(productionCreditEvents.created_at))
    .limit(limit);
}

export async function getProductionCreditEventsForJob(
  organizationId: string,
  productionJobId: string,
): Promise<ProductionCreditEventRow[]> {
  return db
    .select({
      id: productionCreditEvents.id,
      production_job_id: productionCreditEvents.production_job_id,
      credits_consumed: productionCreditEvents.credits_consumed,
      warning_level: productionCreditEvents.warning_level,
      credit_rate_aed: productionCreditEvents.credit_rate_aed,
      estimated_aed: productionCreditEvents.estimated_aed,
      cost_target_aed: productionCreditEvents.cost_target_aed,
      safety_reserve_aed: productionCreditEvents.safety_reserve_aed,
      hard_limit_aed: productionCreditEvents.hard_limit_aed,
      event_type: productionCreditEvents.event_type,
      proceeded: productionCreditEvents.proceeded,
      reason: productionCreditEvents.reason,
      created_at: productionCreditEvents.created_at,
    })
    .from(productionCreditEvents)
    .where(
      eq(productionCreditEvents.production_job_id, productionJobId),
    )
    .orderBy(desc(productionCreditEvents.created_at));
}
