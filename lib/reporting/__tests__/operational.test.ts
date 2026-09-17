import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSelect } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
}));

vi.mock('@/db/index', () => ({ db: { select: mockSelect } }));

vi.mock('@/lib/financial/monitoring', () => ({
  buildFinancialStatusReport: vi.fn(),
}));

import {
  getOrchestrationTaskReport,
  getProductionJobReport,
  getAssetReport,
  getQcReport,
  getOrderReport,
  getOperationalAlerts,
  buildOperationalReport,
} from '../operational';
import { buildFinancialStatusReport } from '@/lib/financial/monitoring';

const mockBuildFinancialStatusReport = vi.mocked(buildFinancialStatusReport);

// Builds a minimal Drizzle-like select chain that resolves to `result`.
function makeSelectChain(result: unknown[]) {
  const asPromise = Promise.resolve(result);
  const terminal: Record<string, unknown> = {
    then: asPromise.then.bind(asPromise),
    catch: asPromise.catch.bind(asPromise),
    finally: asPromise.finally.bind(asPromise),
    orderBy: vi.fn(),
    limit: vi.fn().mockResolvedValue(result),
  };
  (terminal.orderBy as ReturnType<typeof vi.fn>).mockReturnValue(terminal);

  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    where: vi.fn().mockReturnValue(terminal),
    orderBy: vi.fn().mockReturnValue(terminal),
  };
  chain.from.mockReturnValue(chain);
  return chain;
}

const EMPTY_FINANCIAL_REPORT = {
  organizationId: 'org-1',
  generatedAt: '2026-09-17T00:00:00.000Z',
  paymentAlerts: [],
  expiringCredits: [],
  ledgerEntryCount: 0,
  hasAlerts: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── getOrchestrationTaskReport ────────────────────────────────────────────────

describe('getOrchestrationTaskReport', () => {
  it('counts tasks by status', async () => {
    mockSelect
      .mockReturnValueOnce(
        makeSelectChain([{ status: 'EXECUTING' }, { status: 'PENDING' }, { status: 'EXECUTING' }]),
      )
      .mockReturnValueOnce(makeSelectChain([]));

    const report = await getOrchestrationTaskReport('org-1');
    expect(report.tasksByStatus).toEqual({ EXECUTING: 2, PENDING: 1 });
  });

  it('counts pending approvals', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([{ id: 'a1' }, { id: 'a2' }]));

    const report = await getOrchestrationTaskReport('org-1');
    expect(report.pendingApprovalCount).toBe(2);
  });

  it('returns empty counts when no data', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const report = await getOrchestrationTaskReport('org-1');
    expect(report.tasksByStatus).toEqual({});
    expect(report.pendingApprovalCount).toBe(0);
  });
});

// ── getProductionJobReport ────────────────────────────────────────────────────

describe('getProductionJobReport', () => {
  it('counts jobs by status', async () => {
    mockSelect.mockReturnValueOnce(
      makeSelectChain([{ status: 'COMPLETED' }, { status: 'FAILED' }, { status: 'COMPLETED' }]),
    );

    const report = await getProductionJobReport('org-1');
    expect(report.jobsByStatus).toEqual({ COMPLETED: 2, FAILED: 1 });
  });

  it('returns empty object when no jobs', async () => {
    mockSelect.mockReturnValueOnce(makeSelectChain([]));
    const report = await getProductionJobReport('org-1');
    expect(report.jobsByStatus).toEqual({});
  });
});

// ── getAssetReport ────────────────────────────────────────────────────────────

describe('getAssetReport', () => {
  it('counts assets by status', async () => {
    mockSelect.mockReturnValueOnce(
      makeSelectChain([
        { status: 'READY_FOR_QC' },
        { status: 'READY_FOR_QC' },
        { status: 'UPLOADED' },
      ]),
    );

    const report = await getAssetReport('org-1');
    expect(report.assetsByStatus).toEqual({ READY_FOR_QC: 2, UPLOADED: 1 });
    expect(report.pendingQcCount).toBe(2);
  });

  it('pendingQcCount is 0 when no READY_FOR_QC assets', async () => {
    mockSelect.mockReturnValueOnce(makeSelectChain([{ status: 'UPLOADED' }]));
    const report = await getAssetReport('org-1');
    expect(report.pendingQcCount).toBe(0);
  });

  it('returns empty counts when no assets', async () => {
    mockSelect.mockReturnValueOnce(makeSelectChain([]));
    const report = await getAssetReport('org-1');
    expect(report.assetsByStatus).toEqual({});
    expect(report.pendingQcCount).toBe(0);
  });
});

// ── getQcReport ───────────────────────────────────────────────────────────────

describe('getQcReport', () => {
  it('counts verdicts by outcome', async () => {
    mockSelect.mockReturnValueOnce(
      makeSelectChain([{ verdict: 'PASS' }, { verdict: 'FAIL' }, { verdict: 'PASS' }]),
    );

    const report = await getQcReport('org-1');
    expect(report.verdictsByOutcome).toEqual({ PASS: 2, FAIL: 1 });
  });

  it('returns empty object when no QC reviews', async () => {
    mockSelect.mockReturnValueOnce(makeSelectChain([]));
    const report = await getQcReport('org-1');
    expect(report.verdictsByOutcome).toEqual({});
  });
});

// ── getOrderReport ────────────────────────────────────────────────────────────

describe('getOrderReport', () => {
  it('counts campaigns by status', async () => {
    mockSelect
      .mockReturnValueOnce(
        makeSelectChain([{ status: 'IN_PRODUCTION' }, { status: 'DRAFT' }, { status: 'IN_PRODUCTION' }]),
      )
      .mockReturnValueOnce(makeSelectChain([]));

    const report = await getOrderReport('org-1');
    expect(report.campaignsByStatus).toEqual({ IN_PRODUCTION: 2, DRAFT: 1 });
  });

  it('counts orders by status', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([{ status: 'ACTIVE' }, { status: 'COMPLETED' }]));

    const report = await getOrderReport('org-1');
    expect(report.ordersByStatus).toEqual({ ACTIVE: 1, COMPLETED: 1 });
  });

  it('returns empty counts when no data', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const report = await getOrderReport('org-1');
    expect(report.campaignsByStatus).toEqual({});
    expect(report.ordersByStatus).toEqual({});
  });
});

// ── getOperationalAlerts ──────────────────────────────────────────────────────

describe('getOperationalAlerts', () => {
  const now = new Date('2026-09-17T00:00:00.000Z');

  it('returns failed jobs', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([{ id: 'job-1', order_id: 'order-1', created_at: now }]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const alerts = await getOperationalAlerts('org-1');
    expect(alerts.failedJobs).toHaveLength(1);
    expect(alerts.failedJobs[0]).toMatchObject({ jobId: 'job-1', orderId: 'order-1' });
  });

  it('returns failed deliveries with failure reason', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(
        makeSelectChain([{ id: 'del-1', order_id: 'order-2', failure_reason: 'timeout', created_at: now }]),
      )
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const alerts = await getOperationalAlerts('org-1');
    expect(alerts.failedDeliveries).toHaveLength(1);
    expect(alerts.failedDeliveries[0]).toMatchObject({
      deliveryId: 'del-1',
      orderId: 'order-2',
      failureReason: 'timeout',
    });
  });

  it('returns problem assets', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(
        makeSelectChain([{ id: 'asset-1', order_id: 'order-3', status: 'REJECTED', created_at: now }]),
      )
      .mockReturnValueOnce(makeSelectChain([]));

    const alerts = await getOperationalAlerts('org-1');
    expect(alerts.problemAssets).toHaveLength(1);
    expect(alerts.problemAssets[0]).toMatchObject({
      assetId: 'asset-1',
      orderId: 'order-3',
      status: 'REJECTED',
    });
  });

  it('returns escalated tasks', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(
        makeSelectChain([{ id: 'task-1', intent_type: 'COORDINATE_QC_REVIEW', created_at: now }]),
      );

    const alerts = await getOperationalAlerts('org-1');
    expect(alerts.escalatedTasks).toHaveLength(1);
    expect(alerts.escalatedTasks[0]).toMatchObject({
      taskId: 'task-1',
      intentType: 'COORDINATE_QC_REVIEW',
    });
  });

  it('returns empty arrays when no alerts', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const alerts = await getOperationalAlerts('org-1');
    expect(alerts.failedJobs).toHaveLength(0);
    expect(alerts.failedDeliveries).toHaveLength(0);
    expect(alerts.problemAssets).toHaveLength(0);
    expect(alerts.escalatedTasks).toHaveLength(0);
  });
});

// ── buildOperationalReport ────────────────────────────────────────────────────

describe('buildOperationalReport', () => {
  beforeEach(() => {
    // Return empty arrays for all DB calls in the composite report
    mockSelect.mockImplementation(() => makeSelectChain([]));
    mockBuildFinancialStatusReport.mockResolvedValue(EMPTY_FINANCIAL_REPORT);
  });

  it('returns report with expected organizationId', async () => {
    const report = await buildOperationalReport('org-1');
    expect(report.organizationId).toBe('org-1');
  });

  it('returns generatedAt as ISO string', async () => {
    const report = await buildOperationalReport('org-1');
    expect(typeof report.generatedAt).toBe('string');
    expect(() => new Date(report.generatedAt)).not.toThrow();
  });

  it('hasAlerts is false when no alerts and no financial alerts', async () => {
    const report = await buildOperationalReport('org-1');
    expect(report.hasAlerts).toBe(false);
  });

  it('hasAlerts is true when financial report has alerts', async () => {
    mockBuildFinancialStatusReport.mockResolvedValue({
      ...EMPTY_FINANCIAL_REPORT,
      hasAlerts: true,
    });

    const report = await buildOperationalReport('org-1');
    expect(report.hasAlerts).toBe(true);
  });

  it('hasAlerts is true when financial hasAlerts is true', async () => {
    mockBuildFinancialStatusReport.mockResolvedValue({
      ...EMPTY_FINANCIAL_REPORT,
      hasAlerts: true,
    });

    const report = await buildOperationalReport('org-1');
    expect(report.hasAlerts).toBe(true);
  });

  it('report includes all sections', async () => {
    const report = await buildOperationalReport('org-1');
    expect(report).toHaveProperty('orchestration');
    expect(report).toHaveProperty('production');
    expect(report).toHaveProperty('assets');
    expect(report).toHaveProperty('qc');
    expect(report).toHaveProperty('orders');
    expect(report).toHaveProperty('alerts');
    expect(report).toHaveProperty('financial');
  });

  it('financial section is the result of buildFinancialStatusReport', async () => {
    const report = await buildOperationalReport('org-1');
    expect(report.financial).toEqual(EMPTY_FINANCIAL_REPORT);
  });

  it('does not expose financial amounts or margin data', async () => {
    const report = await buildOperationalReport('org-1');
    const reportStr = JSON.stringify(report);
    expect(reportStr).not.toContain('estimated_cost');
    expect(reportStr).not.toContain('total_amount');
    expect(reportStr).not.toContain('actual_amount');
    expect(reportStr).not.toContain('planned_amount');
    expect(reportStr).not.toContain('margin_rate');
  });
});
