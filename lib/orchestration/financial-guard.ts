// Financial guard for AGENT_TASK step dispatch (Architecture v2 §11).
// SERIALIZABLE isolation + SELECT FOR UPDATE on order_budgets.
// Append-only. No autonomous refunds. No settlements. No price mutations.
// Missing cost → audit COST_DATA_ABSENT; do not invent a cost.

import { db } from '@/db/index';
import { auditEvents } from '@/db/schema/system';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { runCostCheck } from '@/lib/admin/cost-check';
import { runMarginCheck } from '@/lib/admin/margin-check';

const ENTITY_TYPE = 'AGENT_TASK';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FinancialGuardState = 'PASS' | 'FAIL' | 'NOT_READY';

export type FinancialGuardResult =
  | { ok: true }
  | { ok: false; state: Exclude<FinancialGuardState, 'PASS'>; reason: string };

// ── Internal tx-scoped audit writer ──────────────────────────────────────────
// Writes inside the transaction so the FOR UPDATE lock is held through the
// read → decision → audit write sequence (Architecture v2 §11).

type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function txAudit(
  tx: TxClient,
  organizationId: string,
  taskId: string,
  action: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await tx.insert(auditEvents).values({
    id: uuidv7(),
    organization_id: organizationId,
    entity_type: ENTITY_TYPE,
    entity_id: taskId,
    actor_id: null,
    actor_role: 'AGENT',
    action,
    payload,
  });
}

// ── runFinancialGuard ─────────────────────────────────────────────────────────

export async function runFinancialGuard(params: {
  organizationId: string;
  taskId: string;
  stepIndex: number;
  orderId: string;
  provider: string;
  quote: {
    estimated_cost: string | null;
    total_amount: string;
  };
  pricingConfig: {
    minimum_acceptable_margin_rate: string;
    target_margin_rate: string | null;
  } | null;
}): Promise<FinancialGuardResult> {
  return db.transaction(
    async (tx) => {
      // ── 1. Lock the order_budgets row (org-scoped WHERE prevents cross-client access) ──
      const locked = await tx.execute(
        sql`SELECT id, organization_id, planned_amount, estimated_amount, actual_amount
            FROM "commercial"."order_budgets"
            WHERE order_id = ${params.orderId}
              AND organization_id = ${params.organizationId}
            FOR UPDATE`,
      );

      if (locked.length === 0) {
        await txAudit(tx, params.organizationId, params.taskId, 'FINANCIAL_GUARD_RUN', {
          task_id: params.taskId,
          check_type: 'BUDGET_ROW_LOOKUP',
          result: 'NOT_READY',
        });
        return {
          ok: false,
          state: 'NOT_READY' as const,
          reason: 'No order budget found for this order and organization',
        };
      }

      const budget = locked[0] as {
        id: string;
        organization_id: string;
        planned_amount: string;
        estimated_amount: string | null;
        actual_amount: string | null;
      };

      // Defense-in-depth: WHERE already enforces org scope; belt-and-suspenders check.
      if (budget.organization_id !== params.organizationId) {
        await txAudit(tx, params.organizationId, params.taskId, 'BOUNDARY_VIOLATION', {
          task_id: params.taskId,
          attempted_action: 'FINANCIAL_GUARD_CROSS_CLIENT',
          block_reason: 'organization_id mismatch on order_budgets: cross-client funding blocked',
        });
        return {
          ok: false,
          state: 'FAIL' as const,
          reason: 'Cross-client funding blocked',
        };
      }

      // ── 2. Cost check (cost-before-dispatch) ──────────────────────────────────
      const costResult = runCostCheck(params.quote);

      if (costResult.state === 'NOT_READY') {
        // Missing cost data (e.g. Higgsfield quote not yet received) — audit; do not invent.
        await txAudit(tx, params.organizationId, params.taskId, 'COST_DATA_ABSENT', {
          task_id: params.taskId,
          step_index: params.stepIndex,
          provider: params.provider,
        });
        await txAudit(tx, params.organizationId, params.taskId, 'FINANCIAL_GUARD_RUN', {
          task_id: params.taskId,
          check_type: 'COST_CHECK',
          result: 'NOT_READY',
        });
        return { ok: false, state: 'NOT_READY' as const, reason: costResult.reason };
      }

      if (costResult.state === 'FAIL') {
        await txAudit(tx, params.organizationId, params.taskId, 'FINANCIAL_GUARD_RUN', {
          task_id: params.taskId,
          check_type: 'COST_CHECK',
          result: 'FAIL',
        });
        return { ok: false, state: 'FAIL' as const, reason: costResult.reason };
      }

      // ── 3. Margin check ───────────────────────────────────────────────────────
      const marginResult = runMarginCheck(params.quote, params.pricingConfig);

      if (marginResult.state !== 'PASS') {
        await txAudit(tx, params.organizationId, params.taskId, 'FINANCIAL_GUARD_RUN', {
          task_id: params.taskId,
          check_type: 'MARGIN_CHECK',
          result: marginResult.state,
        });
        return {
          ok: false,
          state: marginResult.state as Exclude<FinancialGuardState, 'PASS'>,
          reason: marginResult.reason,
        };
      }

      // ── 4. Budget exhaustion check ────────────────────────────────────────────
      const planned = parseFloat(budget.planned_amount);
      const actual = budget.actual_amount !== null ? parseFloat(budget.actual_amount) : 0;
      const estimatedCost = parseFloat(costResult.estimated_cost!);

      if (actual + estimatedCost > planned) {
        await txAudit(tx, params.organizationId, params.taskId, 'FINANCIAL_GUARD_RUN', {
          task_id: params.taskId,
          check_type: 'BUDGET_EXHAUSTION',
          result: 'FAIL',
        });
        return {
          ok: false,
          state: 'FAIL' as const,
          reason: 'Dispatching this step would exceed the order planned budget',
        };
      }

      // ── 5. All checks passed ──────────────────────────────────────────────────
      await txAudit(tx, params.organizationId, params.taskId, 'FINANCIAL_GUARD_RUN', {
        task_id: params.taskId,
        check_type: 'ALL_CHECKS',
        result: 'PASS',
      });

      return { ok: true };
    },
    { isolationLevel: 'serializable' },
  );
}
