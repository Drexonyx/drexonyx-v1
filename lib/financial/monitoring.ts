// Finance Monitoring — read-only financial intelligence (DR 0116).
//
// ALL queries are org-scoped. Internal financial data (estimated_cost,
// gross_margin, AI cost details, provider rates) is NEVER surfaced here.
// The append-only ledger is never written or modified by this module.
// organizationId MUST come from a server-side session token.

import { and, eq, inArray, isNull, lt, or } from 'drizzle-orm';
import { db } from '@/db/index';
import { financialLedger, payments, expenses, providerCredits, reserves } from '@/db/schema/financial';
import { orderBudgets } from '@/db/schema/commercial';

// ── Payment monitoring ────────────────────────────────────────────────────────

export interface PaymentSummary {
  id: string;
  order_id: string | null;
  status: string;
  currency: string;
  paid_at: Date | null;
  refunded_at: Date | null;
  created_at: Date;
}

export interface PaymentAlert {
  paymentId: string;
  orderId: string | null;
  alertType: 'FAILED' | 'CHARGEBACK' | 'PENDING_OVERDUE' | 'REFUNDED';
  currency: string;
  createdAt: Date;
}

// Returns all payments for an org, status-only (no amounts exposed).
export async function getPaymentStatuses(
  organizationId: string,
): Promise<PaymentSummary[]> {
  return db
    .select({
      id: payments.id,
      order_id: payments.order_id,
      status: payments.status,
      currency: payments.currency,
      paid_at: payments.paid_at,
      refunded_at: payments.refunded_at,
      created_at: payments.created_at,
    })
    .from(payments)
    .where(eq(payments.organization_id, organizationId))
    .orderBy(payments.created_at);
}

// Returns payment alerts: FAILED, CHARGEBACK, REFUNDED, and PENDING/PROCESSING
// older than thresholdMs milliseconds. Does not expose amounts.
export async function getPaymentAlerts(
  organizationId: string,
  pendingThresholdMs = 86_400_000, // 24 h default
): Promise<PaymentAlert[]> {
  const cutoff = new Date(Date.now() - pendingThresholdMs);

  const rows = await db
    .select({
      id: payments.id,
      order_id: payments.order_id,
      status: payments.status,
      currency: payments.currency,
      created_at: payments.created_at,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organization_id, organizationId),
        or(
          inArray(payments.status, ['FAILED', 'CHARGEBACK', 'REFUNDED']),
          and(
            inArray(payments.status, ['PENDING', 'PROCESSING']),
            lt(payments.created_at, cutoff),
          ),
        ),
      ),
    );

  return rows.map((r) => ({
    paymentId: r.id,
    orderId: r.order_id,
    alertType: (['FAILED', 'CHARGEBACK', 'REFUNDED'].includes(r.status)
      ? r.status
      : 'PENDING_OVERDUE') as PaymentAlert['alertType'],
    currency: r.currency,
    createdAt: r.created_at,
  }));
}

// ── Ledger monitoring ─────────────────────────────────────────────────────────

export interface LedgerEntrySummary {
  id: string;
  entry_type: string;
  currency: string;
  reference_entity_type: string | null;
  reference_entity_id: string | null;
  created_at: Date;
}

// Returns recent ledger entries for the org — type/currency/reference only,
// never amounts, to avoid exposing internal financial data.
export async function getRecentLedgerEntries(
  organizationId: string,
  limit = 50,
): Promise<LedgerEntrySummary[]> {
  return db
    .select({
      id: financialLedger.id,
      entry_type: financialLedger.entry_type,
      currency: financialLedger.currency,
      reference_entity_type: financialLedger.reference_entity_type,
      reference_entity_id: financialLedger.reference_entity_id,
      created_at: financialLedger.created_at,
    })
    .from(financialLedger)
    .where(eq(financialLedger.organization_id, organizationId))
    .orderBy(financialLedger.created_at)
    .limit(limit);
}

// ── Budget / expense monitoring ───────────────────────────────────────────────

export interface BudgetStatus {
  order_id: string;
  hasActualAmount: boolean;
  hasEstimatedAmount: boolean;
  created_at: Date;
  updated_at: Date;
}

// Returns budget existence status per order, not raw amounts.
// Internal amounts (estimated_cost, actual_amount) are never exposed.
export async function getOrderBudgetStatuses(
  organizationId: string,
): Promise<BudgetStatus[]> {
  const rows = await db
    .select({
      order_id: orderBudgets.order_id,
      estimated_amount: orderBudgets.estimated_amount,
      actual_amount: orderBudgets.actual_amount,
      created_at: orderBudgets.created_at,
      updated_at: orderBudgets.updated_at,
    })
    .from(orderBudgets)
    .where(eq(orderBudgets.organization_id, organizationId));

  return rows.map((r) => ({
    order_id: r.order_id,
    hasActualAmount: r.actual_amount !== null,
    hasEstimatedAmount: r.estimated_amount !== null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export interface ExpenseSummary {
  id: string;
  order_budget_id: string;
  currency: string;
  expense_type: string;
  created_at: Date;
}

// Returns expense records for the org — type/currency only, not amounts.
export async function getExpenseSummaries(
  organizationId: string,
): Promise<ExpenseSummary[]> {
  return db
    .select({
      id: expenses.id,
      order_budget_id: expenses.order_budget_id,
      currency: expenses.currency,
      expense_type: expenses.expense_type,
      created_at: expenses.created_at,
    })
    .from(expenses)
    .where(eq(expenses.organization_id, organizationId))
    .orderBy(expenses.created_at);
}

// ── Provider credit monitoring ────────────────────────────────────────────────

export interface ProviderCreditStatus {
  id: string;
  provider: string;
  currency: string;
  status: string;
  expires_at: Date | null;
  isExpiringSoon: boolean;
  created_at: Date;
}

// Returns provider credit statuses and expiry alerts. Amount not exposed.
export async function getProviderCreditStatuses(
  organizationId: string,
  expiryAlertWindowMs = 7 * 86_400_000, // 7 days default
): Promise<ProviderCreditStatus[]> {
  const alertCutoff = new Date(Date.now() + expiryAlertWindowMs);

  const rows = await db
    .select({
      id: providerCredits.id,
      provider: providerCredits.provider,
      currency: providerCredits.currency,
      status: providerCredits.status,
      expires_at: providerCredits.expires_at,
      archived_at: providerCredits.archived_at,
      created_at: providerCredits.created_at,
    })
    .from(providerCredits)
    .where(
      and(
        eq(providerCredits.organization_id, organizationId),
        isNull(providerCredits.archived_at),
      ),
    );

  return rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    currency: r.currency,
    status: r.status,
    expires_at: r.expires_at,
    isExpiringSoon:
      r.status === 'ACTIVE' &&
      r.expires_at !== null &&
      r.expires_at < alertCutoff,
    created_at: r.created_at,
  }));
}

// ── Reserve monitoring ────────────────────────────────────────────────────────

export interface ReserveStatus {
  id: string;
  currency: string;
  reserve_type: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

// Returns reserve statuses — no amounts exposed.
export async function getReserveStatuses(
  organizationId: string,
): Promise<ReserveStatus[]> {
  const rows = await db
    .select({
      id: reserves.id,
      currency: reserves.currency,
      reserve_type: reserves.reserve_type,
      status: reserves.status,
      archived_at: reserves.archived_at,
      created_at: reserves.created_at,
      updated_at: reserves.updated_at,
    })
    .from(reserves)
    .where(
      and(
        eq(reserves.organization_id, organizationId),
        isNull(reserves.archived_at),
      ),
    );

  return rows.map((r) => ({
    id: r.id,
    currency: r.currency,
    reserve_type: r.reserve_type,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

// ── Composite financial status report ─────────────────────────────────────────

export interface FinancialStatusReport {
  organizationId: string;
  generatedAt: string;
  paymentAlerts: PaymentAlert[];
  expiringCredits: ProviderCreditStatus[];
  ledgerEntryCount: number;
  hasAlerts: boolean;
}

// Composite read for the FINANCIAL_CHECK step — returns structured status report.
// No internal amounts, no margin, no cost details are included.
export async function buildFinancialStatusReport(
  organizationId: string,
): Promise<FinancialStatusReport> {
  const [paymentAlerts, creditStatuses, ledgerEntries] = await Promise.all([
    getPaymentAlerts(organizationId),
    getProviderCreditStatuses(organizationId),
    getRecentLedgerEntries(organizationId, 100),
  ]);

  const expiringCredits = creditStatuses.filter((c) => c.isExpiringSoon);

  return {
    organizationId,
    generatedAt: new Date().toISOString(),
    paymentAlerts,
    expiringCredits,
    ledgerEntryCount: ledgerEntries.length,
    hasAlerts: paymentAlerts.length > 0 || expiringCredits.length > 0,
  };
}
