import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSelect } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
}));

vi.mock('@/db/index', () => ({ db: { select: mockSelect } }));

vi.mock('@/lib/financial/monitoring', () => ({
  buildFinancialStatusReport: vi.fn(),
}));

import {
  getTaskAnalytics,
  getProductionAnalytics,
  getQcAnalytics,
  getAssetAnalytics,
  getCommercialAnalytics,
  detectAnomalies,
  buildIntelligenceReport,
} from '../intelligence';
import { buildFinancialStatusReport } from '@/lib/financial/monitoring';
import type { AnomalyInputs, TaskAnalytics, ProductionAnalytics, QcAnalytics, AssetAnalytics } from '../intelligence';

const mockBuildFinancialStatusReport = vi.mocked(buildFinancialStatusReport);

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

const EMPTY_FINANCIAL = {
  organizationId: 'org-1',
  generatedAt: '2026-09-17T00:00:00.000Z',
  paymentAlerts: [],
  expiringCredits: [],
  ledgerEntryCount: 0,
  hasAlerts: false,
};

beforeEach(() => vi.clearAllMocks());

// ── getTaskAnalytics ──────────────────────────────────────────────────────────

describe('getTaskAnalytics', () => {
  it('counts tasks by status (all-time)', async () => {
    mockSelect
      .mockReturnValueOnce(
        makeSelectChain([{ status: 'COMPLETED' }, { status: 'COMPLETED' }, { status: 'FAILED' }]),
      )
      .mockReturnValueOnce(makeSelectChain([{ status: 'COMPLETED' }]))
      .mockReturnValueOnce(makeSelectChain([]));

    const result = await getTaskAnalytics('org-1');
    expect(result.allTime.byStatus).toEqual({ COMPLETED: 2, FAILED: 1 });
    expect(result.allTime.total).toBe(3);
  });

  it('counts recent tasks in time window', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([{ status: 'COMPLETED' }, { status: 'FAILED' }]))
      .mockReturnValueOnce(makeSelectChain([{ status: 'COMPLETED' }]))
      .mockReturnValueOnce(makeSelectChain([]));

    const result = await getTaskAnalytics('org-1', 7);
    expect(result.recent.total).toBe(1);
    expect(result.recent.windowDays).toBe(7);
  });

  it('computes completion and failure rates', async () => {
    mockSelect
      .mockReturnValueOnce(
        makeSelectChain([
          { status: 'COMPLETED' },
          { status: 'COMPLETED' },
          { status: 'FAILED' },
          { status: 'PENDING' },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const result = await getTaskAnalytics('org-1');
    expect(result.rates.completionRate).toBe(0.5);
    expect(result.rates.failureRate).toBe(0.25);
  });

  it('computes escalation rate', async () => {
    mockSelect
      .mockReturnValueOnce(
        makeSelectChain([{ status: 'ESCALATED' }, { status: 'ESCALATED' }, { status: 'COMPLETED' }, { status: 'COMPLETED' }]),
      )
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const result = await getTaskAnalytics('org-1');
    expect(result.rates.escalationRate).toBe(0.5);
  });

  it('returns null rates when no tasks', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const result = await getTaskAnalytics('org-1');
    expect(result.rates.completionRate).toBeNull();
    expect(result.rates.failureRate).toBeNull();
    expect(result.rates.escalationRate).toBeNull();
  });

  it('counts pending tasks (active statuses only)', async () => {
    mockSelect
      .mockReturnValueOnce(
        makeSelectChain([
          { status: 'PENDING' },
          { status: 'EXECUTING' },
          { status: 'COMPLETED' },
          { status: 'AWAITING_GATE' },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const result = await getTaskAnalytics('org-1');
    expect(result.pendingCount).toBe(3); // PENDING + EXECUTING + AWAITING_GATE
  });

  it('counts pending approvals', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }]));

    const result = await getTaskAnalytics('org-1');
    expect(result.pendingApprovalCount).toBe(3);
  });
});

// ── getProductionAnalytics ────────────────────────────────────────────────────

describe('getProductionAnalytics', () => {
  it('counts production jobs by status', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([{ status: 'COMPLETED' }, { status: 'FAILED' }]))
      .mockReturnValueOnce(makeSelectChain([]));

    const result = await getProductionAnalytics('org-1');
    expect(result.allTime.byStatus).toEqual({ COMPLETED: 1, FAILED: 1 });
    expect(result.rates.completionRate).toBe(0.5);
    expect(result.rates.failureRate).toBe(0.5);
  });

  it('returns null rates when no jobs', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const result = await getProductionAnalytics('org-1');
    expect(result.rates.completionRate).toBeNull();
    expect(result.rates.failureRate).toBeNull();
  });

  it('tracks recent window separately', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([{ status: 'COMPLETED' }, { status: 'COMPLETED' }]))
      .mockReturnValueOnce(makeSelectChain([{ status: 'COMPLETED' }]));

    const result = await getProductionAnalytics('org-1', 7);
    expect(result.allTime.total).toBe(2);
    expect(result.recent.total).toBe(1);
    expect(result.recent.windowDays).toBe(7);
  });
});

// ── getQcAnalytics ────────────────────────────────────────────────────────────

describe('getQcAnalytics', () => {
  it('counts verdicts and computes pass rate', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([{ verdict: 'PASS' }, { verdict: 'PASS' }, { verdict: 'FAIL' }]))
      .mockReturnValueOnce(makeSelectChain([]));

    const result = await getQcAnalytics('org-1');
    expect(result.allTime.byVerdict).toEqual({ PASS: 2, FAIL: 1 });
    expect(result.allTime.total).toBe(3);
    expect(result.passRate).toBeCloseTo(0.6667, 3);
  });

  it('returns null passRate when no reviews', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const result = await getQcAnalytics('org-1');
    expect(result.passRate).toBeNull();
  });

  it('tracks recent reviews separately', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([{ verdict: 'PASS' }, { verdict: 'FAIL' }]))
      .mockReturnValueOnce(makeSelectChain([{ verdict: 'PASS' }]));

    const result = await getQcAnalytics('org-1', 14);
    expect(result.allTime.total).toBe(2);
    expect(result.recent.total).toBe(1);
    expect(result.recent.windowDays).toBe(14);
  });
});

// ── getAssetAnalytics ─────────────────────────────────────────────────────────

describe('getAssetAnalytics', () => {
  it('counts assets by status', async () => {
    mockSelect.mockReturnValueOnce(
      makeSelectChain([
        { status: 'READY_FOR_QC' },
        { status: 'READY_FOR_QC' },
        { status: 'REJECTED' },
        { status: 'UPLOADED' },
      ]),
    );

    const result = await getAssetAnalytics('org-1');
    expect(result.byStatus).toEqual({ READY_FOR_QC: 2, REJECTED: 1, UPLOADED: 1 });
    expect(result.pendingQcCount).toBe(2);
    expect(result.problemAssetCount).toBe(1);
  });

  it('sums REVISION_REQUIRED and REJECTED for problemAssetCount', async () => {
    mockSelect.mockReturnValueOnce(
      makeSelectChain([{ status: 'REVISION_REQUIRED' }, { status: 'REJECTED' }, { status: 'REJECTED' }]),
    );

    const result = await getAssetAnalytics('org-1');
    expect(result.problemAssetCount).toBe(3);
  });

  it('returns zero counts when no assets', async () => {
    mockSelect.mockReturnValueOnce(makeSelectChain([]));
    const result = await getAssetAnalytics('org-1');
    expect(result.pendingQcCount).toBe(0);
    expect(result.problemAssetCount).toBe(0);
  });
});

// ── getCommercialAnalytics ────────────────────────────────────────────────────

describe('getCommercialAnalytics', () => {
  it('counts campaigns by status and computes activeCount', async () => {
    mockSelect
      .mockReturnValueOnce(
        makeSelectChain([{ status: 'IN_PRODUCTION' }, { status: 'DRAFT' }, { status: 'CLOSED' }]),
      )
      .mockReturnValueOnce(makeSelectChain([]));

    const result = await getCommercialAnalytics('org-1');
    expect(result.campaigns.byStatus).toEqual({ IN_PRODUCTION: 1, DRAFT: 1, CLOSED: 1 });
    expect(result.campaigns.activeCount).toBe(1); // only IN_PRODUCTION is active
    expect(result.campaigns.total).toBe(3);
  });

  it('counts active orders', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([{ status: 'ACTIVE' }, { status: 'ACTIVE' }, { status: 'COMPLETED' }]));

    const result = await getCommercialAnalytics('org-1');
    expect(result.orders.byStatus).toEqual({ ACTIVE: 2, COMPLETED: 1 });
    expect(result.orders.activeCount).toBe(2);
  });

  it('returns zero counts when no data', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const result = await getCommercialAnalytics('org-1');
    expect(result.campaigns.total).toBe(0);
    expect(result.campaigns.activeCount).toBe(0);
    expect(result.orders.total).toBe(0);
    expect(result.orders.activeCount).toBe(0);
  });
});

// ── detectAnomalies ───────────────────────────────────────────────────────────

function makeBaseInputs(): AnomalyInputs {
  const tasks: TaskAnalytics = {
    allTime: { total: 10, byStatus: { COMPLETED: 8, FAILED: 1, ESCALATED: 1 } },
    recent: { total: 3, byStatus: { COMPLETED: 3 }, windowDays: 30 },
    rates: { completionRate: 0.8, failureRate: 0.1, escalationRate: 0.1 },
    pendingCount: 0,
    pendingApprovalCount: 0,
  };
  const production: ProductionAnalytics = {
    allTime: { total: 5, byStatus: { COMPLETED: 4, FAILED: 1 } },
    recent: { total: 2, byStatus: { COMPLETED: 2 }, windowDays: 30 },
    rates: { completionRate: 0.8, failureRate: 0.2 },
  };
  const qc: QcAnalytics = {
    allTime: { total: 6, byVerdict: { PASS: 5, FAIL: 1 } },
    recent: { total: 2, byVerdict: { PASS: 2 }, windowDays: 30 },
    passRate: 0.8333,
  };
  const assets: AssetAnalytics = { byStatus: {}, pendingQcCount: 0, problemAssetCount: 0 };
  return { tasks, production, qc, assets, financial: EMPTY_FINANCIAL };
}

describe('detectAnomalies', () => {
  it('returns no anomalies when all indicators are healthy', () => {
    const anomalies = detectAnomalies(makeBaseInputs());
    expect(anomalies).toHaveLength(0);
  });

  it('detects HIGH_ESCALATION_RATE above 10% with sample ≥ 5', () => {
    const inputs = makeBaseInputs();
    inputs.tasks.rates.escalationRate = 0.15;
    inputs.tasks.allTime = { total: 10, byStatus: { COMPLETED: 8, FAILED: 1, ESCALATED: 2 } };

    const anomalies = detectAnomalies(inputs);
    expect(anomalies.some((a) => a.type === 'HIGH_ESCALATION_RATE')).toBe(true);
  });

  it('HIGH_ESCALATION_RATE is CRITICAL when rate > 25%', () => {
    const inputs = makeBaseInputs();
    inputs.tasks.rates.escalationRate = 0.3;
    inputs.tasks.allTime = { total: 10, byStatus: { ESCALATED: 3, COMPLETED: 7 } };

    const [a] = detectAnomalies(inputs).filter((x) => x.type === 'HIGH_ESCALATION_RATE');
    expect(a.severity).toBe('CRITICAL');
  });

  it('does not fire HIGH_ESCALATION_RATE with fewer than 5 tasks', () => {
    const inputs = makeBaseInputs();
    inputs.tasks.rates.escalationRate = 0.5;
    inputs.tasks.allTime = { total: 2, byStatus: { ESCALATED: 1, COMPLETED: 1 } };

    const anomalies = detectAnomalies(inputs);
    expect(anomalies.some((a) => a.type === 'HIGH_ESCALATION_RATE')).toBe(false);
  });

  it('detects HIGH_QC_FAILURE_RATE when pass rate < 50% with sample ≥ 5', () => {
    const inputs = makeBaseInputs();
    inputs.qc.passRate = 0.4;
    inputs.qc.allTime = { total: 5, byVerdict: { PASS: 2, FAIL: 3 } };

    const anomalies = detectAnomalies(inputs);
    expect(anomalies.some((a) => a.type === 'HIGH_QC_FAILURE_RATE')).toBe(true);
  });

  it('HIGH_QC_FAILURE_RATE is CRITICAL when pass rate < 25%', () => {
    const inputs = makeBaseInputs();
    inputs.qc.passRate = 0.2;
    inputs.qc.allTime = { total: 10, byVerdict: { PASS: 2, FAIL: 8 } };

    const [a] = detectAnomalies(inputs).filter((x) => x.type === 'HIGH_QC_FAILURE_RATE');
    expect(a.severity).toBe('CRITICAL');
  });

  it('detects HIGH_JOB_FAILURE_RATE above 30% with sample ≥ 3', () => {
    const inputs = makeBaseInputs();
    inputs.production.rates.failureRate = 0.4;
    inputs.production.allTime = { total: 5, byStatus: { FAILED: 2, COMPLETED: 3 } };

    const anomalies = detectAnomalies(inputs);
    expect(anomalies.some((a) => a.type === 'HIGH_JOB_FAILURE_RATE')).toBe(true);
  });

  it('detects PENDING_APPROVAL_BACKLOG when count ≥ 5', () => {
    const inputs = makeBaseInputs();
    inputs.tasks.pendingApprovalCount = 5;

    const anomalies = detectAnomalies(inputs);
    expect(anomalies.some((a) => a.type === 'PENDING_APPROVAL_BACKLOG')).toBe(true);
  });

  it('PENDING_APPROVAL_BACKLOG is CRITICAL when count ≥ 10', () => {
    const inputs = makeBaseInputs();
    inputs.tasks.pendingApprovalCount = 10;

    const [a] = detectAnomalies(inputs).filter((x) => x.type === 'PENDING_APPROVAL_BACKLOG');
    expect(a.severity).toBe('CRITICAL');
  });

  it('detects PAYMENT_ALERTS when financial report has alerts', () => {
    const inputs = makeBaseInputs();
    inputs.financial = {
      ...EMPTY_FINANCIAL,
      hasAlerts: true,
      paymentAlerts: [
        { paymentId: 'p1', orderId: null, alertType: 'PENDING_OVERDUE', currency: 'USD', createdAt: new Date() },
      ],
    };

    const anomalies = detectAnomalies(inputs);
    expect(anomalies.some((a) => a.type === 'PAYMENT_ALERTS')).toBe(true);
  });

  it('PAYMENT_ALERTS is CRITICAL for FAILED or CHARGEBACK', () => {
    const inputs = makeBaseInputs();
    inputs.financial = {
      ...EMPTY_FINANCIAL,
      hasAlerts: true,
      paymentAlerts: [
        { paymentId: 'p1', orderId: null, alertType: 'CHARGEBACK', currency: 'USD', createdAt: new Date() },
      ],
    };

    const [a] = detectAnomalies(inputs).filter((x) => x.type === 'PAYMENT_ALERTS');
    expect(a.severity).toBe('CRITICAL');
  });

  it('detects PROBLEM_ASSET_BACKLOG when count ≥ 5', () => {
    const inputs = makeBaseInputs();
    inputs.assets.problemAssetCount = 5;

    const anomalies = detectAnomalies(inputs);
    expect(anomalies.some((a) => a.type === 'PROBLEM_ASSET_BACKLOG')).toBe(true);
  });

  it('PROBLEM_ASSET_BACKLOG is CRITICAL when count ≥ 10', () => {
    const inputs = makeBaseInputs();
    inputs.assets.problemAssetCount = 12;

    const [a] = detectAnomalies(inputs).filter((x) => x.type === 'PROBLEM_ASSET_BACKLOG');
    expect(a.severity).toBe('CRITICAL');
  });
});

// ── buildIntelligenceReport ───────────────────────────────────────────────────

describe('buildIntelligenceReport', () => {
  beforeEach(() => {
    mockSelect.mockImplementation(() => makeSelectChain([]));
    mockBuildFinancialStatusReport.mockResolvedValue(EMPTY_FINANCIAL);
  });

  it('returns report with expected organizationId and windowDays', async () => {
    const report = await buildIntelligenceReport('org-1', 14);
    expect(report.organizationId).toBe('org-1');
    expect(report.windowDays).toBe(14);
  });

  it('returns generatedAt as valid ISO string', async () => {
    const report = await buildIntelligenceReport('org-1');
    expect(typeof report.generatedAt).toBe('string');
    expect(() => new Date(report.generatedAt)).not.toThrow();
  });

  it('has no anomalies when all indicators are healthy', async () => {
    const report = await buildIntelligenceReport('org-1');
    expect(report.hasAnomalies).toBe(false);
    expect(report.anomalies).toHaveLength(0);
  });

  it('includes all required sections', async () => {
    const report = await buildIntelligenceReport('org-1');
    expect(report).toHaveProperty('tasks');
    expect(report).toHaveProperty('production');
    expect(report).toHaveProperty('qc');
    expect(report).toHaveProperty('assets');
    expect(report).toHaveProperty('commercial');
    expect(report).toHaveProperty('financial');
    expect(report).toHaveProperty('anomalies');
  });

  it('financial section is from buildFinancialStatusReport', async () => {
    const report = await buildIntelligenceReport('org-1');
    expect(report.financial).toEqual(EMPTY_FINANCIAL);
  });

  it('does not expose financial amounts or margin data', async () => {
    const reportStr = JSON.stringify(await buildIntelligenceReport('org-1'));
    expect(reportStr).not.toContain('estimated_cost');
    expect(reportStr).not.toContain('total_amount');
    expect(reportStr).not.toContain('actual_amount');
    expect(reportStr).not.toContain('planned_amount');
    expect(reportStr).not.toContain('margin_rate');
  });
});
