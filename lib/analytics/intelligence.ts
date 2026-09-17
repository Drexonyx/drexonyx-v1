// Analytics / Intelligence Agent — read-only analytics (DR 0118).
//
// ALL queries are org-scoped. Internal financial data, QC review notes,
// production job metadata, and audit event payloads are NEVER surfaced.
// No LLM calls, no predictions, no invented benchmarks — deterministic only.
// organizationId MUST come from a server-side session token.

import { and, eq, gte, isNull } from 'drizzle-orm';
import { db } from '@/db/index';
import { agentTasks, taskApprovals } from '@/db/schema/orchestration';
import { productionJobs, assets, qcReviews } from '@/db/schema/production';
import { campaigns, orders } from '@/db/schema/commercial';
import { buildFinancialStatusReport } from '@/lib/financial/monitoring';
import type { FinancialStatusReport } from '@/lib/financial/monitoring';

// ── Helpers ───────────────────────────────────────────────────────────────────

function countByField(rows: Array<{ status: string }>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.status] = (result[row.status] ?? 0) + 1;
  }
  return result;
}

function countByVerdict(rows: Array<{ verdict: string }>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.verdict] = (result[row.verdict] ?? 0) + 1;
  }
  return result;
}

function sumCounts(byStatus: Record<string, number>): number {
  return Object.values(byStatus).reduce((acc, n) => acc + n, 0);
}

function safeRate(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

function windowCutoff(windowDays: number): Date {
  return new Date(Date.now() - windowDays * 86_400_000);
}

// ── Task analytics ────────────────────────────────────────────────────────────

export interface TaskRates {
  completionRate: number | null;
  failureRate: number | null;
  escalationRate: number | null;
}

export interface TaskAnalytics {
  allTime: { total: number; byStatus: Record<string, number> };
  recent: { total: number; byStatus: Record<string, number>; windowDays: number };
  rates: TaskRates;
  pendingCount: number;
  pendingApprovalCount: number;
}

const TASK_ACTIVE_STATUSES = ['PENDING', 'PLAN_READY', 'EXECUTING', 'AWAITING_GATE'] as const;

export async function getTaskAnalytics(
  organizationId: string,
  windowDays = 30,
): Promise<TaskAnalytics> {
  const cutoff = windowCutoff(windowDays);

  const [allRows, recentRows, approvalRows] = await Promise.all([
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
      .select({ status: agentTasks.status })
      .from(agentTasks)
      .where(
        and(
          eq(agentTasks.organization_id, organizationId),
          isNull(agentTasks.archived_at),
          gte(agentTasks.created_at, cutoff),
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

  const allByStatus = countByField(allRows);
  const total = sumCounts(allByStatus);
  const recentByStatus = countByField(recentRows);
  const pendingCount = TASK_ACTIVE_STATUSES.reduce(
    (acc, s) => acc + (allByStatus[s] ?? 0),
    0,
  );

  return {
    allTime: { total, byStatus: allByStatus },
    recent: { total: sumCounts(recentByStatus), byStatus: recentByStatus, windowDays },
    rates: {
      completionRate: safeRate(allByStatus['COMPLETED'] ?? 0, total),
      failureRate: safeRate(allByStatus['FAILED'] ?? 0, total),
      escalationRate: safeRate(allByStatus['ESCALATED'] ?? 0, total),
    },
    pendingCount,
    pendingApprovalCount: approvalRows.length,
  };
}

// ── Production analytics ──────────────────────────────────────────────────────

export interface ProductionRates {
  completionRate: number | null;
  failureRate: number | null;
}

export interface ProductionAnalytics {
  allTime: { total: number; byStatus: Record<string, number> };
  recent: { total: number; byStatus: Record<string, number>; windowDays: number };
  rates: ProductionRates;
}

export async function getProductionAnalytics(
  organizationId: string,
  windowDays = 30,
): Promise<ProductionAnalytics> {
  const cutoff = windowCutoff(windowDays);

  const [allRows, recentRows] = await Promise.all([
    db
      .select({ status: productionJobs.status })
      .from(productionJobs)
      .where(
        and(
          eq(productionJobs.organization_id, organizationId),
          isNull(productionJobs.archived_at),
        ),
      ),
    db
      .select({ status: productionJobs.status })
      .from(productionJobs)
      .where(
        and(
          eq(productionJobs.organization_id, organizationId),
          isNull(productionJobs.archived_at),
          gte(productionJobs.created_at, cutoff),
        ),
      ),
  ]);

  const allByStatus = countByField(allRows);
  const total = sumCounts(allByStatus);
  const recentByStatus = countByField(recentRows);

  return {
    allTime: { total, byStatus: allByStatus },
    recent: { total: sumCounts(recentByStatus), byStatus: recentByStatus, windowDays },
    rates: {
      completionRate: safeRate(allByStatus['COMPLETED'] ?? 0, total),
      failureRate: safeRate(allByStatus['FAILED'] ?? 0, total),
    },
  };
}

// ── QC analytics ──────────────────────────────────────────────────────────────

export interface QcAnalytics {
  allTime: { total: number; byVerdict: Record<string, number> };
  recent: { total: number; byVerdict: Record<string, number>; windowDays: number };
  passRate: number | null;
}

export async function getQcAnalytics(
  organizationId: string,
  windowDays = 30,
): Promise<QcAnalytics> {
  const cutoff = windowCutoff(windowDays);

  const [allRows, recentRows] = await Promise.all([
    db
      .select({ verdict: qcReviews.verdict })
      .from(qcReviews)
      .where(eq(qcReviews.organization_id, organizationId)),
    db
      .select({ verdict: qcReviews.verdict })
      .from(qcReviews)
      .where(
        and(
          eq(qcReviews.organization_id, organizationId),
          gte(qcReviews.created_at, cutoff),
        ),
      ),
  ]);

  const allByVerdict = countByVerdict(allRows);
  const total = sumCounts(allByVerdict);
  const recentByVerdict = countByVerdict(recentRows);

  return {
    allTime: { total, byVerdict: allByVerdict },
    recent: { total: sumCounts(recentByVerdict), byVerdict: recentByVerdict, windowDays },
    passRate: safeRate(allByVerdict['PASS'] ?? 0, total),
  };
}

// ── Asset analytics ───────────────────────────────────────────────────────────

export interface AssetAnalytics {
  byStatus: Record<string, number>;
  pendingQcCount: number;
  problemAssetCount: number;
}

export async function getAssetAnalytics(
  organizationId: string,
): Promise<AssetAnalytics> {
  const rows = await db
    .select({ status: assets.status })
    .from(assets)
    .where(
      and(
        eq(assets.organization_id, organizationId),
        isNull(assets.archived_at),
      ),
    );

  const byStatus = countByField(rows);
  return {
    byStatus,
    pendingQcCount: byStatus['READY_FOR_QC'] ?? 0,
    problemAssetCount: (byStatus['REVISION_REQUIRED'] ?? 0) + (byStatus['REJECTED'] ?? 0),
  };
}

// ── Commercial analytics ──────────────────────────────────────────────────────

const CAMPAIGN_ACTIVE_STATUSES = [
  'BRIEFING', 'PRE_FLIGHT', 'STRATEGY', 'QUOTE_PENDING', 'APPROVAL_PENDING',
  'ORDERED', 'IN_PRODUCTION', 'QC', 'CLIENT_PREVIEW', 'REVISION',
  'FINAL_APPROVAL', 'DELIVERY',
] as const;

export interface CommercialAnalytics {
  campaigns: {
    total: number;
    byStatus: Record<string, number>;
    activeCount: number;
  };
  orders: {
    total: number;
    byStatus: Record<string, number>;
    activeCount: number;
  };
}

export async function getCommercialAnalytics(
  organizationId: string,
): Promise<CommercialAnalytics> {
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

  const campaignByStatus = countByField(campaignRows);
  const orderByStatus = countByField(orderRows);
  const campaignActiveCount = CAMPAIGN_ACTIVE_STATUSES.reduce(
    (acc, s) => acc + (campaignByStatus[s] ?? 0),
    0,
  );

  return {
    campaigns: {
      total: sumCounts(campaignByStatus),
      byStatus: campaignByStatus,
      activeCount: campaignActiveCount,
    },
    orders: {
      total: sumCounts(orderByStatus),
      byStatus: orderByStatus,
      activeCount: orderByStatus['ACTIVE'] ?? 0,
    },
  };
}

// ── Anomaly detection (deterministic rules only) ──────────────────────────────

export type AnomalyType =
  | 'HIGH_ESCALATION_RATE'
  | 'HIGH_QC_FAILURE_RATE'
  | 'HIGH_JOB_FAILURE_RATE'
  | 'PENDING_APPROVAL_BACKLOG'
  | 'PAYMENT_ALERTS'
  | 'PROBLEM_ASSET_BACKLOG';

export type AnomalySeverity = 'WARNING' | 'CRITICAL';

export interface OperationalAnomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  detail: string;
}

export interface AnomalyInputs {
  tasks: TaskAnalytics;
  production: ProductionAnalytics;
  qc: QcAnalytics;
  assets: AssetAnalytics;
  financial: FinancialStatusReport;
}

// Pure deterministic function — no DB access. Applies threshold rules only.
export function detectAnomalies(inputs: AnomalyInputs): OperationalAnomaly[] {
  const anomalies: OperationalAnomaly[] = [];
  const { tasks, production, qc, assets, financial } = inputs;

  // Rule 1: High escalation rate among all tasks
  const escalationRate = tasks.rates.escalationRate;
  if (escalationRate !== null && escalationRate > 0.1 && tasks.allTime.total >= 5) {
    anomalies.push({
      type: 'HIGH_ESCALATION_RATE',
      severity: escalationRate > 0.25 ? 'CRITICAL' : 'WARNING',
      detail: `Task escalation rate is ${(escalationRate * 100).toFixed(1)}% (${tasks.allTime.byStatus['ESCALATED'] ?? 0} of ${tasks.allTime.total} tasks)`,
    });
  }

  // Rule 2: High QC failure rate
  const passRate = qc.passRate;
  if (passRate !== null && passRate < 0.5 && qc.allTime.total >= 5) {
    anomalies.push({
      type: 'HIGH_QC_FAILURE_RATE',
      severity: passRate < 0.25 ? 'CRITICAL' : 'WARNING',
      detail: `QC pass rate is ${(passRate * 100).toFixed(1)}% (${qc.allTime.byVerdict['PASS'] ?? 0} of ${qc.allTime.total} reviews)`,
    });
  }

  // Rule 3: High production job failure rate
  const jobFailureRate = production.rates.failureRate;
  if (jobFailureRate !== null && jobFailureRate > 0.3 && production.allTime.total >= 3) {
    anomalies.push({
      type: 'HIGH_JOB_FAILURE_RATE',
      severity: jobFailureRate > 0.5 ? 'CRITICAL' : 'WARNING',
      detail: `Production job failure rate is ${(jobFailureRate * 100).toFixed(1)}% (${production.allTime.byStatus['FAILED'] ?? 0} of ${production.allTime.total} jobs)`,
    });
  }

  // Rule 4: Pending approval backlog
  if (tasks.pendingApprovalCount >= 5) {
    anomalies.push({
      type: 'PENDING_APPROVAL_BACKLOG',
      severity: tasks.pendingApprovalCount >= 10 ? 'CRITICAL' : 'WARNING',
      detail: `${tasks.pendingApprovalCount} orchestration approvals are pending`,
    });
  }

  // Rule 5: Payment alerts from financial report
  if (financial.paymentAlerts.length > 0) {
    const hasCritical = financial.paymentAlerts.some(
      (a) => a.alertType === 'FAILED' || a.alertType === 'CHARGEBACK',
    );
    anomalies.push({
      type: 'PAYMENT_ALERTS',
      severity: hasCritical ? 'CRITICAL' : 'WARNING',
      detail: `${financial.paymentAlerts.length} payment alert(s) require attention`,
    });
  }

  // Rule 6: Problem asset backlog
  if (assets.problemAssetCount >= 5) {
    anomalies.push({
      type: 'PROBLEM_ASSET_BACKLOG',
      severity: assets.problemAssetCount >= 10 ? 'CRITICAL' : 'WARNING',
      detail: `${assets.problemAssetCount} assets are in REVISION_REQUIRED or REJECTED state`,
    });
  }

  return anomalies;
}

// ── Composite intelligence report ─────────────────────────────────────────────

export interface IntelligenceReport {
  organizationId: string;
  generatedAt: string;
  windowDays: number;
  tasks: TaskAnalytics;
  production: ProductionAnalytics;
  qc: QcAnalytics;
  assets: AssetAnalytics;
  commercial: CommercialAnalytics;
  financial: FinancialStatusReport;
  anomalies: OperationalAnomaly[];
  hasAnomalies: boolean;
}

export async function buildIntelligenceReport(
  organizationId: string,
  windowDays = 30,
): Promise<IntelligenceReport> {
  const [tasks, production, qc, assetReport, commercial, financial] = await Promise.all([
    getTaskAnalytics(organizationId, windowDays),
    getProductionAnalytics(organizationId, windowDays),
    getQcAnalytics(organizationId, windowDays),
    getAssetAnalytics(organizationId),
    getCommercialAnalytics(organizationId),
    buildFinancialStatusReport(organizationId),
  ]);

  const anomalies = detectAnomalies({ tasks, production, qc, assets: assetReport, financial });

  return {
    organizationId,
    generatedAt: new Date().toISOString(),
    windowDays,
    tasks,
    production,
    qc,
    assets: assetReport,
    commercial,
    financial,
    anomalies,
    hasAnomalies: anomalies.length > 0,
  };
}
