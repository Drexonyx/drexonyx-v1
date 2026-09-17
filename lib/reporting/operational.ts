// Reporting Agent — read-only operational reporting (DR 0117).
//
// ALL queries are org-scoped. Internal financial data, QC review notes,
// production job metadata, and audit event payloads are NEVER surfaced.
// organizationId MUST come from a server-side session token.

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db/index';
import { agentTasks, taskApprovals } from '@/db/schema/orchestration';
import { productionJobs, assets, qcReviews, deliveries } from '@/db/schema/production';
import { campaigns, orders } from '@/db/schema/commercial';
import { buildFinancialStatusReport } from '@/lib/financial/monitoring';
import type { FinancialStatusReport } from '@/lib/financial/monitoring';

// ── Helpers ───────────────────────────────────────────────────────────────────

function countByStatus(rows: Array<{ status: string }>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.status] = (result[row.status] ?? 0) + 1;
  }
  return result;
}

// ── Orchestration task report ─────────────────────────────────────────────────

export interface OrchestrationTaskReport {
  tasksByStatus: Record<string, number>;
  pendingApprovalCount: number;
}

export async function getOrchestrationTaskReport(
  organizationId: string,
): Promise<OrchestrationTaskReport> {
  const [taskRows, approvalRows] = await Promise.all([
    db
      .select({ status: agentTasks.status })
      .from(agentTasks)
      .where(
        and(
          eq(agentTasks.organization_id, organizationId),
          isNull(agentTasks.archived_at),
        ),
      ),
    db
      .select({ id: taskApprovals.id })
      .from(taskApprovals)
      .where(
        and(
          eq(taskApprovals.organization_id, organizationId),
          eq(taskApprovals.status, 'PENDING'),
        ),
      ),
  ]);

  return {
    tasksByStatus: countByStatus(taskRows),
    pendingApprovalCount: approvalRows.length,
  };
}

// ── Production job report ─────────────────────────────────────────────────────

export interface ProductionJobReport {
  jobsByStatus: Record<string, number>;
}

export async function getProductionJobReport(
  organizationId: string,
): Promise<ProductionJobReport> {
  const rows = await db
    .select({ status: productionJobs.status })
    .from(productionJobs)
    .where(
      and(
        eq(productionJobs.organization_id, organizationId),
        isNull(productionJobs.archived_at),
      ),
    );

  return { jobsByStatus: countByStatus(rows) };
}

// ── Asset report ──────────────────────────────────────────────────────────────

export interface AssetReport {
  assetsByStatus: Record<string, number>;
  pendingQcCount: number;
}

export async function getAssetReport(
  organizationId: string,
): Promise<AssetReport> {
  const rows = await db
    .select({ status: assets.status })
    .from(assets)
    .where(
      and(
        eq(assets.organization_id, organizationId),
        isNull(assets.archived_at),
      ),
    );

  const assetsByStatus = countByStatus(rows);
  return {
    assetsByStatus,
    pendingQcCount: assetsByStatus['READY_FOR_QC'] ?? 0,
  };
}

// ── QC report ─────────────────────────────────────────────────────────────────

export interface QcReport {
  verdictsByOutcome: Record<string, number>;
}

export async function getQcReport(
  organizationId: string,
): Promise<QcReport> {
  const rows = await db
    .select({ verdict: qcReviews.verdict })
    .from(qcReviews)
    .where(eq(qcReviews.organization_id, organizationId));

  const verdictsByOutcome: Record<string, number> = {};
  for (const row of rows) {
    verdictsByOutcome[row.verdict] = (verdictsByOutcome[row.verdict] ?? 0) + 1;
  }

  return { verdictsByOutcome };
}

// ── Order report ──────────────────────────────────────────────────────────────

export interface OrderReport {
  campaignsByStatus: Record<string, number>;
  ordersByStatus: Record<string, number>;
}

export async function getOrderReport(
  organizationId: string,
): Promise<OrderReport> {
  const [campaignRows, orderRows] = await Promise.all([
    db
      .select({ status: campaigns.status })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.organization_id, organizationId),
          isNull(campaigns.archived_at),
        ),
      ),
    db
      .select({ status: orders.status })
      .from(orders)
      .where(
        and(
          eq(orders.organization_id, organizationId),
          isNull(orders.archived_at),
        ),
      ),
  ]);

  return {
    campaignsByStatus: countByStatus(campaignRows),
    ordersByStatus: countByStatus(orderRows),
  };
}

// ── Operational alerts ────────────────────────────────────────────────────────

export interface FailedJobAlert {
  jobId: string;
  orderId: string;
  createdAt: Date;
}

export interface FailedDeliveryAlert {
  deliveryId: string;
  orderId: string;
  failureReason: string | null;
  createdAt: Date;
}

export interface ProblemAssetAlert {
  assetId: string;
  orderId: string;
  status: 'REVISION_REQUIRED' | 'REJECTED';
  createdAt: Date;
}

export interface EscalatedTaskAlert {
  taskId: string;
  intentType: string;
  createdAt: Date;
}

export interface OperationalAlerts {
  failedJobs: FailedJobAlert[];
  failedDeliveries: FailedDeliveryAlert[];
  problemAssets: ProblemAssetAlert[];
  escalatedTasks: EscalatedTaskAlert[];
}

export async function getOperationalAlerts(
  organizationId: string,
): Promise<OperationalAlerts> {
  const [failedJobRows, failedDeliveryRows, problemAssetRows, escalatedTaskRows] =
    await Promise.all([
      db
        .select({
          id: productionJobs.id,
          order_id: productionJobs.order_id,
          created_at: productionJobs.created_at,
        })
        .from(productionJobs)
        .where(
          and(
            eq(productionJobs.organization_id, organizationId),
            eq(productionJobs.status, 'FAILED'),
            isNull(productionJobs.archived_at),
          ),
        ),
      db
        .select({
          id: deliveries.id,
          order_id: deliveries.order_id,
          failure_reason: deliveries.failure_reason,
          created_at: deliveries.created_at,
        })
        .from(deliveries)
        .where(
          and(
            eq(deliveries.organization_id, organizationId),
            eq(deliveries.status, 'FAILED'),
            isNull(deliveries.archived_at),
          ),
        ),
      db
        .select({
          id: assets.id,
          order_id: assets.order_id,
          status: assets.status,
          created_at: assets.created_at,
        })
        .from(assets)
        .where(
          and(
            eq(assets.organization_id, organizationId),
            inArray(assets.status, ['REVISION_REQUIRED', 'REJECTED']),
            isNull(assets.archived_at),
          ),
        ),
      db
        .select({
          id: agentTasks.id,
          intent_type: agentTasks.intent_type,
          created_at: agentTasks.created_at,
        })
        .from(agentTasks)
        .where(
          and(
            eq(agentTasks.organization_id, organizationId),
            eq(agentTasks.status, 'ESCALATED'),
            isNull(agentTasks.archived_at),
          ),
        ),
    ]);

  return {
    failedJobs: failedJobRows.map((r) => ({
      jobId: r.id,
      orderId: r.order_id,
      createdAt: r.created_at,
    })),
    failedDeliveries: failedDeliveryRows.map((r) => ({
      deliveryId: r.id,
      orderId: r.order_id,
      failureReason: r.failure_reason,
      createdAt: r.created_at,
    })),
    problemAssets: problemAssetRows.map((r) => ({
      assetId: r.id,
      orderId: r.order_id,
      status: r.status as 'REVISION_REQUIRED' | 'REJECTED',
      createdAt: r.created_at,
    })),
    escalatedTasks: escalatedTaskRows.map((r) => ({
      taskId: r.id,
      intentType: r.intent_type,
      createdAt: r.created_at,
    })),
  };
}

// ── Composite operational report ──────────────────────────────────────────────

export interface OperationalReport {
  organizationId: string;
  generatedAt: string;
  orchestration: OrchestrationTaskReport;
  production: ProductionJobReport;
  assets: AssetReport;
  qc: QcReport;
  orders: OrderReport;
  alerts: OperationalAlerts;
  financial: FinancialStatusReport;
  hasAlerts: boolean;
}

export async function buildOperationalReport(
  organizationId: string,
): Promise<OperationalReport> {
  const [orchestration, production, assetReport, qc, ordersReport, alerts, financial] =
    await Promise.all([
      getOrchestrationTaskReport(organizationId),
      getProductionJobReport(organizationId),
      getAssetReport(organizationId),
      getQcReport(organizationId),
      getOrderReport(organizationId),
      getOperationalAlerts(organizationId),
      buildFinancialStatusReport(organizationId),
    ]);

  const hasAlerts =
    alerts.failedJobs.length > 0 ||
    alerts.failedDeliveries.length > 0 ||
    alerts.problemAssets.length > 0 ||
    alerts.escalatedTasks.length > 0 ||
    financial.hasAlerts;

  return {
    organizationId,
    generatedAt: new Date().toISOString(),
    orchestration,
    production,
    assets: assetReport,
    qc,
    orders: ordersReport,
    alerts,
    financial,
    hasAlerts,
  };
}
