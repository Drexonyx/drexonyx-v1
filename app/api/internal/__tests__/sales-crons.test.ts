import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Shared mocks ──────────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockUpdate } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate },
}));

const { mockAutoAdvanceTask } = vi.hoisted(() => ({
  mockAutoAdvanceTask: vi.fn(),
}));

vi.mock('@/lib/orchestration/runner', () => ({
  autoAdvanceTask: mockAutoAdvanceTask,
}));

const { mockGetOverdueFollowUps, mockBuildSalesDailyReport } = vi.hoisted(() => ({
  mockGetOverdueFollowUps: vi.fn(),
  mockBuildSalesDailyReport: vi.fn(),
}));

vi.mock('@/lib/sales/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/sales/queries')>();
  return {
    ...actual,
    getOverdueFollowUps: mockGetOverdueFollowUps,
    buildSalesDailyReport: mockBuildSalesDailyReport,
  };
});

const { mockEmailsSend } = vi.hoisted(() => ({
  mockEmailsSend: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: vi.fn(function () {
    return { emails: { send: mockEmailsSend } };
  }),
}));

// ── Route imports (after mocks are declared) ──────────────────────────────────

import { GET as discoveryGET } from '../sales-discovery/route';
import { GET as followupsGET } from '../sales-followups/route';
import { GET as dailyReportGET } from '../sales-daily-report/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

const CRON_SECRET = 'test-cron-secret';
const ORG_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

function makeRequest(url: string, hasAuth = true, secret = CRON_SECRET): NextRequest {
  const headers = new Headers();
  if (hasAuth) headers.set('authorization', `Bearer ${secret}`);
  return new NextRequest(url, { headers });
}

function makeSelectChain(result: unknown[]) {
  const asPromise = Promise.resolve(result);
  const terminal = {
    then: asPromise.then.bind(asPromise),
    catch: asPromise.catch.bind(asPromise),
    finally: asPromise.finally.bind(asPromise),
  };
  const limitFn = vi.fn().mockReturnValue(terminal);
  const whereFn = vi.fn().mockReturnValue({ limit: limitFn, ...terminal });
  const fromFn = vi.fn().mockReturnValue({ where: whereFn, limit: limitFn, ...terminal });
  return fromFn;
}

function makeInsertChain() {
  const asPromise = Promise.resolve([]);
  const terminal = {
    then: asPromise.then.bind(asPromise),
    catch: asPromise.catch.bind(asPromise),
    finally: asPromise.finally.bind(asPromise),
  };
  const onConflictDoNothingFn = vi.fn().mockReturnValue(terminal);
  const valuesFn = vi.fn().mockReturnValue({ onConflictDoNothing: onConflictDoNothingFn, ...terminal });
  return valuesFn;
}

function makeUpdateChain() {
  const asPromise = Promise.resolve([]);
  const terminal = {
    then: asPromise.then.bind(asPromise),
    catch: asPromise.catch.bind(asPromise),
    finally: asPromise.finally.bind(asPromise),
  };
  const whereFn = vi.fn().mockReturnValue(terminal);
  const setFn = vi.fn().mockReturnValue({ where: whereFn, ...terminal });
  return setFn;
}

function makeReportFixture() {
  return {
    generatedAt: new Date().toISOString(),
    reportingEmail: 'Irenfold@gmail.com',
    periodStart: new Date(Date.now() - 86_400_000).toISOString(),
    periodEnd: new Date().toISOString(),
    summary: {
      newLeads: 3, qualifiedLeads: 1, hotLeads: 2, warmLeads: 4,
      emailsSent: 5, repliesReceived: 1, followUpsDue: 2,
      followUpsSent: 1, pendingApprovals: 0, wonClients: 0,
    },
    topOpportunities: [],
    activity: [],
    issues: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = CRON_SECRET;
  process.env.DREXONYX_ORG_ID = ORG_ID;
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.RESEND_FROM_ADDRESS = 'noreply@drexonyx.com';
});

// ── 1. Cron authentication ────────────────────────────────────────────────────

describe('cron authentication', () => {
  it('returns 401 when CRON_SECRET env is not set', async () => {
    delete process.env.CRON_SECRET;
    const req = makeRequest('http://localhost/api/internal/sales-discovery', false);
    const res = await discoveryGET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const req = makeRequest('http://localhost/api/internal/sales-discovery', false);
    const res = await discoveryGET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when Authorization header has wrong secret', async () => {
    const req = makeRequest('http://localhost/api/internal/sales-discovery', true, 'wrong-secret');
    const res = await discoveryGET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 for sales-followups with missing auth', async () => {
    const req = makeRequest('http://localhost/api/internal/sales-followups', false);
    const res = await followupsGET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 for sales-daily-report with missing auth', async () => {
    const req = makeRequest('http://localhost/api/internal/sales-daily-report', false);
    const res = await dailyReportGET(req);
    expect(res.status).toBe(401);
  });
});

// ── 2. Discovery execution ────────────────────────────────────────────────────

describe('GET /api/internal/sales-discovery — execution', () => {
  it('calls autoAdvanceTask for each PLAN_READY task', async () => {
    const tasks = [
      { id: 'task-1', organization_id: ORG_ID },
      { id: 'task-2', organization_id: ORG_ID },
    ];
    mockSelect.mockReturnValue({ from: makeSelectChain(tasks) });
    mockAutoAdvanceTask.mockResolvedValue({ ok: true, outcome: 'TASK_COMPLETED', stepsAdvanced: 4 });

    const req = makeRequest('http://localhost/api/internal/sales-discovery');
    const res = await discoveryGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.dispatched).toBe(2);
    expect(body.completed).toBe(2);
    expect(mockAutoAdvanceTask).toHaveBeenCalledTimes(2);
    expect(mockAutoAdvanceTask).toHaveBeenCalledWith({ taskId: 'task-1', organizationId: ORG_ID });
    expect(mockAutoAdvanceTask).toHaveBeenCalledWith({ taskId: 'task-2', organizationId: ORG_ID });
  });

  it('passes organization_id from env to the DB query and autoAdvanceTask', async () => {
    mockSelect.mockReturnValue({ from: makeSelectChain([{ id: 'task-a', organization_id: ORG_ID }]) });
    mockAutoAdvanceTask.mockResolvedValue({ ok: true, outcome: 'TASK_COMPLETED', stepsAdvanced: 4 });

    const req = makeRequest('http://localhost/api/internal/sales-discovery');
    await discoveryGET(req);

    expect(mockAutoAdvanceTask).toHaveBeenCalledWith({ taskId: 'task-a', organizationId: ORG_ID });
  });
});

// ── 3. Deduplication (SALES_DEDUP inside runner — cron invokes autoAdvanceTask) ──

describe('GET /api/internal/sales-discovery — deduplication', () => {
  it('dispatches tasks to the runner which enforces SALES_DEDUP via VERIFY step', async () => {
    mockSelect.mockReturnValue({ from: makeSelectChain([{ id: 'dup-task', organization_id: ORG_ID }]) });
    // autoAdvanceTask returns AWAITING_GATE when VERIFY step blocks (dedup found)
    mockAutoAdvanceTask.mockResolvedValue({ ok: true, outcome: 'AWAITING_GATE', stepsAdvanced: 1 });

    const req = makeRequest('http://localhost/api/internal/sales-discovery');
    const res = await discoveryGET(req);
    const body = await res.json();

    expect(body.dispatched).toBe(1);
    expect(body.awaiting_gate).toBe(1);
    expect(body.completed).toBe(0);
  });
});

// ── 4. Repeated discovery (idempotency) ──────────────────────────────────────

describe('GET /api/internal/sales-discovery — idempotency', () => {
  it('returns dispatched:0 when no PLAN_READY tasks exist', async () => {
    mockSelect.mockReturnValue({ from: makeSelectChain([]) });

    const req = makeRequest('http://localhost/api/internal/sales-discovery');
    const res = await discoveryGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.dispatched).toBe(0);
    expect(body.completed).toBe(0);
    expect(mockAutoAdvanceTask).not.toHaveBeenCalled();
  });

  it('does not call autoAdvanceTask on a second run when tasks are gone', async () => {
    // First run: task exists → dispatched
    mockSelect.mockReturnValueOnce({ from: makeSelectChain([{ id: 't1', organization_id: ORG_ID }]) });
    mockAutoAdvanceTask.mockResolvedValueOnce({ ok: true, outcome: 'TASK_COMPLETED', stepsAdvanced: 4 });

    const req1 = makeRequest('http://localhost/api/internal/sales-discovery');
    await discoveryGET(req1);

    // Second run: no more tasks
    mockSelect.mockReturnValueOnce({ from: makeSelectChain([]) });
    vi.clearAllMocks();

    const req2 = makeRequest('http://localhost/api/internal/sales-discovery');
    const res = await discoveryGET(req2);
    const body = await res.json();

    expect(body.dispatched).toBe(0);
    expect(mockAutoAdvanceTask).not.toHaveBeenCalled();
  });
});

// ── 5. Follow-up execution ────────────────────────────────────────────────────

describe('GET /api/internal/sales-followups — execution', () => {
  it('marks a low-risk email follow-up as SENT', async () => {
    const fu = { id: 'fu-1', lead_id: 'lead-1', outreach_id: null, scheduled_at: new Date(), channel: 'email', status: 'PENDING', sent_at: null, result: null };
    mockGetOverdueFollowUps.mockResolvedValue([fu]);

    const setFn = makeUpdateChain();
    mockUpdate.mockReturnValue({ set: setFn });

    const req = makeRequest('http://localhost/api/internal/sales-followups');
    const res = await followupsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.processed).toBe(1);
    expect(body.skipped).toBe(0);
    expect(body.blocked).toBe(0);
    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(setFn).toHaveBeenCalledWith(expect.objectContaining({ status: 'SENT' }));
  });
});

// ── 6. Repeated follow-up (idempotency) ──────────────────────────────────────

describe('GET /api/internal/sales-followups — idempotency', () => {
  it('skips a follow-up that already has sent_at set', async () => {
    const fu = { id: 'fu-2', lead_id: 'lead-1', outreach_id: null, scheduled_at: new Date(), channel: 'email', status: 'PENDING', sent_at: new Date(), result: null };
    mockGetOverdueFollowUps.mockResolvedValue([fu]);

    const req = makeRequest('http://localhost/api/internal/sales-followups');
    const res = await followupsGET(req);
    const body = await res.json();

    expect(body.processed).toBe(0);
    expect(body.skipped).toBe(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns total:0 when no overdue follow-ups exist', async () => {
    mockGetOverdueFollowUps.mockResolvedValue([]);

    const req = makeRequest('http://localhost/api/internal/sales-followups');
    const res = await followupsGET(req);
    const body = await res.json();

    expect(body.total).toBe(0);
    expect(body.processed).toBe(0);
  });
});

// ── 7. Daily report generation ────────────────────────────────────────────────

describe('GET /api/internal/sales-daily-report — generation', () => {
  it('sends report to CENTRAL_REPORTING_EMAIL and returns sent:true', async () => {
    mockSelect.mockReturnValue({ from: makeSelectChain([]) }); // no existing idempotency key
    mockBuildSalesDailyReport.mockResolvedValue(makeReportFixture());
    mockEmailsSend.mockResolvedValue({ id: 'email-id-123' });

    const valuesFn = makeInsertChain();
    mockInsert.mockReturnValue({ values: valuesFn });

    const setFn = makeUpdateChain();
    mockUpdate.mockReturnValue({ set: setFn });

    const req = makeRequest('http://localhost/api/internal/sales-daily-report');
    const res = await dailyReportGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sent).toBe(true);
    expect(body.reportedTo).toBe('Irenfold@gmail.com');
    expect(mockEmailsSend).toHaveBeenCalledOnce();
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['Irenfold@gmail.com'] }),
    );
  });

  it('includes summary in the response', async () => {
    mockSelect.mockReturnValue({ from: makeSelectChain([]) });
    const report = makeReportFixture();
    mockBuildSalesDailyReport.mockResolvedValue(report);
    mockEmailsSend.mockResolvedValue({ id: 'email-id-456' });

    const valuesFn = makeInsertChain();
    mockInsert.mockReturnValue({ values: valuesFn });

    const setFn = makeUpdateChain();
    mockUpdate.mockReturnValue({ set: setFn });

    const req = makeRequest('http://localhost/api/internal/sales-daily-report');
    const res = await dailyReportGET(req);
    const body = await res.json();

    expect(body.summary).toMatchObject(report.summary);
  });
});

// ── 8. Repeated daily report protection (idempotency) ────────────────────────

describe('GET /api/internal/sales-daily-report — idempotency', () => {
  it('does not resend when a COMPLETED idempotency key exists for today', async () => {
    mockSelect.mockReturnValue({
      from: makeSelectChain([{ id: 'ik-1', status: 'COMPLETED' }]),
    });

    const req = makeRequest('http://localhost/api/internal/sales-daily-report');
    const res = await dailyReportGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sent).toBe(false);
    expect(body.reason).toBe('already_sent_today');
    expect(mockEmailsSend).not.toHaveBeenCalled();
    expect(mockBuildSalesDailyReport).not.toHaveBeenCalled();
  });

  it('resends when an existing key is FAILED (retry)', async () => {
    mockSelect.mockReturnValue({
      from: makeSelectChain([{ id: 'ik-2', status: 'FAILED' }]),
    });
    mockBuildSalesDailyReport.mockResolvedValue(makeReportFixture());
    mockEmailsSend.mockResolvedValue({ id: 'email-id-789' });

    const valuesFn = makeInsertChain();
    mockInsert.mockReturnValue({ values: valuesFn });

    const setFn = makeUpdateChain();
    mockUpdate.mockReturnValue({ set: setFn });

    const req = makeRequest('http://localhost/api/internal/sales-daily-report');
    const res = await dailyReportGET(req);
    const body = await res.json();

    expect(body.sent).toBe(true);
    expect(mockEmailsSend).toHaveBeenCalledOnce();
  });
});

// ── 9. Low-risk approval policy ───────────────────────────────────────────────

describe('GET /api/internal/sales-followups — low-risk policy (NOT_REQUIRED)', () => {
  it('processes email + follow_up channel with NOT_REQUIRED policy', async () => {
    const fu = { id: 'fu-low', lead_id: 'l1', outreach_id: null, scheduled_at: new Date(), channel: 'email', status: 'PENDING', sent_at: null, result: null };
    mockGetOverdueFollowUps.mockResolvedValue([fu]);

    const setFn = makeUpdateChain();
    mockUpdate.mockReturnValue({ set: setFn });

    const req = makeRequest('http://localhost/api/internal/sales-followups');
    const res = await followupsGET(req);
    const body = await res.json();

    expect(body.processed).toBe(1);
    expect(body.skipped).toBe(0);
    expect(setFn).toHaveBeenCalledWith(expect.objectContaining({ status: 'SENT', sent_at: expect.any(Date) }));
  });
});

// ── 10. High-risk approval policy ─────────────────────────────────────────────

describe('GET /api/internal/sales-followups — high-risk policy (PENDING)', () => {
  it('skips a manual channel follow-up (PENDING policy)', async () => {
    const fu = { id: 'fu-hi', lead_id: 'l1', outreach_id: null, scheduled_at: new Date(), channel: 'manual', status: 'PENDING', sent_at: null, result: null };
    mockGetOverdueFollowUps.mockResolvedValue([fu]);

    const setFn = makeUpdateChain();
    mockUpdate.mockReturnValue({ set: setFn });

    const req = makeRequest('http://localhost/api/internal/sales-followups');
    const res = await followupsGET(req);
    const body = await res.json();

    expect(body.skipped).toBe(1);
    expect(body.processed).toBe(0);
    expect(setFn).toHaveBeenCalledWith(expect.objectContaining({ status: 'SKIPPED' }));
  });
});

// ── 11. Social channel blocking ───────────────────────────────────────────────

describe('GET /api/internal/sales-followups — social channel blocking', () => {
  it('blocks an instagram follow-up', async () => {
    const fu = { id: 'fu-ig', lead_id: 'l1', outreach_id: null, scheduled_at: new Date(), channel: 'instagram', status: 'PENDING', sent_at: null, result: null };
    mockGetOverdueFollowUps.mockResolvedValue([fu]);

    const setFn = makeUpdateChain();
    mockUpdate.mockReturnValue({ set: setFn });

    const req = makeRequest('http://localhost/api/internal/sales-followups');
    const res = await followupsGET(req);
    const body = await res.json();

    expect(body.blocked).toBe(1);
    expect(body.processed).toBe(0);
    expect(setFn).toHaveBeenCalledWith(expect.objectContaining({ status: 'SKIPPED' }));
  });

  it('blocks a whatsapp follow-up', async () => {
    const fu = { id: 'fu-wa', lead_id: 'l1', outreach_id: null, scheduled_at: new Date(), channel: 'whatsapp', status: 'PENDING', sent_at: null, result: null };
    mockGetOverdueFollowUps.mockResolvedValue([fu]);

    const setFn = makeUpdateChain();
    mockUpdate.mockReturnValue({ set: setFn });

    const req = makeRequest('http://localhost/api/internal/sales-followups');
    const res = await followupsGET(req);
    const body = await res.json();

    expect(body.blocked).toBe(1);
    expect(body.processed).toBe(0);
  });

  it('mixes social (blocked) + email (processed) correctly', async () => {
    const rows = [
      { id: 'fu-ig', lead_id: 'l1', outreach_id: null, scheduled_at: new Date(), channel: 'instagram', status: 'PENDING', sent_at: null, result: null },
      { id: 'fu-em', lead_id: 'l2', outreach_id: null, scheduled_at: new Date(), channel: 'email', status: 'PENDING', sent_at: null, result: null },
    ];
    mockGetOverdueFollowUps.mockResolvedValue(rows);

    const setFn = makeUpdateChain();
    mockUpdate.mockReturnValue({ set: setFn });

    const req = makeRequest('http://localhost/api/internal/sales-followups');
    const res = await followupsGET(req);
    const body = await res.json();

    expect(body.total).toBe(2);
    expect(body.processed).toBe(1);
    expect(body.blocked).toBe(1);
  });
});

// ── 12. Audit events (runner records events during task execution) ─────────────

describe('audit events', () => {
  it('calls autoAdvanceTask which internally records audit events', async () => {
    mockSelect.mockReturnValue({ from: makeSelectChain([{ id: 'audit-task', organization_id: ORG_ID }]) });
    mockAutoAdvanceTask.mockResolvedValue({ ok: true, outcome: 'TASK_COMPLETED', stepsAdvanced: 4 });

    const req = makeRequest('http://localhost/api/internal/sales-discovery');
    await discoveryGET(req);

    // Audit events are written inside the runner — verifying autoAdvanceTask was called
    // is sufficient since its implementation writes them (tested in runner tests)
    expect(mockAutoAdvanceTask).toHaveBeenCalledOnce();
    expect(mockAutoAdvanceTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'audit-task' }));
  });
});

// ── 13. Failure handling ──────────────────────────────────────────────────────

describe('failure handling', () => {
  it('counts errors when autoAdvanceTask throws', async () => {
    mockSelect.mockReturnValue({ from: makeSelectChain([{ id: 'fail-task', organization_id: ORG_ID }]) });
    mockAutoAdvanceTask.mockRejectedValue(new Error('DB connection lost'));

    const req = makeRequest('http://localhost/api/internal/sales-discovery');
    const res = await discoveryGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.errors).toBe(1);
    expect(body.completed).toBe(0);
  });

  it('counts errors when autoAdvanceTask returns ok:false', async () => {
    mockSelect.mockReturnValue({ from: makeSelectChain([{ id: 'bad-task', organization_id: ORG_ID }]) });
    mockAutoAdvanceTask.mockResolvedValue({ ok: false, outcome: 'TASK_FAILED', stepsAdvanced: 2, reason: 'Step executor failed' });

    const req = makeRequest('http://localhost/api/internal/sales-discovery');
    const res = await discoveryGET(req);
    const body = await res.json();

    expect(body.errors).toBe(1);
    expect(body.dispatched).toBe(1);
  });

  it('continues processing other follow-ups when one throws', async () => {
    const rows = [
      { id: 'fu-bad', lead_id: 'l1', outreach_id: null, scheduled_at: new Date(), channel: 'email', status: 'PENDING', sent_at: null, result: null },
      { id: 'fu-ok', lead_id: 'l2', outreach_id: null, scheduled_at: new Date(), channel: 'email', status: 'PENDING', sent_at: null, result: null },
    ];
    mockGetOverdueFollowUps.mockResolvedValue(rows);

    let callCount = 0;
    mockUpdate.mockImplementation(() => {
      callCount++;
      if (callCount === 1) throw new Error('DB timeout');
      const setFn = makeUpdateChain();
      return { set: setFn };
    });

    const req = makeRequest('http://localhost/api/internal/sales-followups');
    const res = await followupsGET(req);
    const body = await res.json();

    expect(body.errors).toBe(1);
    expect(body.processed).toBe(1);
  });
});

// ── 14. Retry / RETRY_PENDING outcome ────────────────────────────────────────

describe('retry and idempotency', () => {
  it('counts RETRY_PENDING outcome in retry_pending field', async () => {
    mockSelect.mockReturnValue({ from: makeSelectChain([{ id: 'retry-task', organization_id: ORG_ID }]) });
    mockAutoAdvanceTask.mockResolvedValue({ ok: true, outcome: 'RETRY_PENDING', stepsAdvanced: 1 });

    const req = makeRequest('http://localhost/api/internal/sales-discovery');
    const res = await discoveryGET(req);
    const body = await res.json();

    expect(body.retry_pending).toBe(1);
    expect(body.completed).toBe(0);
    expect(body.errors).toBe(0);
  });

  it('returns 500 when DREXONYX_ORG_ID is not set', async () => {
    delete process.env.DREXONYX_ORG_ID;

    const req = makeRequest('http://localhost/api/internal/sales-discovery');
    const res = await discoveryGET(req);

    expect(res.status).toBe(500);
  });
});
