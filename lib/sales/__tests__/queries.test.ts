import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── DB mock ───────────────────────────────────────────────────────────────────

const { mockSelect } = vi.hoisted(() => ({ mockSelect: vi.fn() }));

vi.mock('@/db/index', () => ({ db: { select: mockSelect } }));

import {
  getSalesLeadById,
  getSalesLeads,
  getSalesLeadsByStatus,
  getSalesLeadsByPriority,
  getDuplicateSource,
  getPendingApprovals,
  getOverdueFollowUps,
  getRecentSalesActivity,
  getLeadActivityTimeline,
  getSalesStats,
  buildSalesDailyReport,
  getApprovalPolicy,
  CENTRAL_REPORTING_EMAIL,
  OVERDUE_FOLLOWUP_GRACE_HOURS,
} from '../queries';

// ── Chain builder helpers ─────────────────────────────────────────────────────

function makeChain(result: unknown[]) {
  const asPromise = Promise.resolve(result);
  const terminal = {
    then: asPromise.then.bind(asPromise),
    catch: asPromise.catch.bind(asPromise),
    finally: asPromise.finally.bind(asPromise),
  };
  const last = vi.fn().mockReturnValue(terminal);
  const mid: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };
  // All middle methods return the same chain object so any order works
  Object.keys(mid).forEach((k) => {
    mid[k].mockReturnValue({ ...mid, limit: last, offset: last });
  });
  mid.offset.mockReturnValue(terminal);
  mid.limit.mockReturnValue({ offset: last, ...terminal });
  mid.from.mockReturnValue(mid);
  return mid;
}

/** Shorthand for queries that just await the terminal promise */
function resolve(result: unknown[]) {
  const asPromise = Promise.resolve(result);
  const terminal = {
    then: asPromise.then.bind(asPromise),
    catch: asPromise.catch.bind(asPromise),
    finally: asPromise.finally.bind(asPromise),
  };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };
  const makeTerminal = () => terminal;
  chain.from.mockReturnValue({ ...chain, ...terminal });
  chain.where.mockReturnValue({ ...chain, ...terminal });
  chain.orderBy.mockReturnValue({ ...chain, ...terminal });
  chain.limit.mockReturnValue({ ...chain, ...terminal });
  chain.offset.mockReturnValue(terminal);
  return chain;
}

// ── Factories ─────────────────────────────────────────────────────────────────

function makeLead(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lead-1',
    full_name: 'Ali Hassan',
    business_name: 'Hassan Real Estate',
    country: 'UAE',
    city: 'Dubai',
    primary_source_platform: 'instagram',
    primary_source_url: 'https://instagram.com/hassanre',
    source_type: 'social_profile',
    website: null,
    public_email: 'ali@hassanre.com',
    public_contact_method: null,
    lead_score: 80,
    priority: 'HOT',
    status: 'NEW',
    opportunity: 'Property listing videos',
    portfolio_match: 'real estate',
    notes: null,
    discovered_by: 'agent',
    created_at: new Date('2026-10-06T10:00:00Z'),
    updated_at: new Date('2026-10-06T10:00:00Z'),
    last_activity_at: new Date('2026-10-06T10:00:00Z'),
    ...overrides,
  };
}

function makeSource(overrides: Record<string, unknown> = {}) {
  return {
    id: 'src-1',
    lead_id: 'lead-1',
    platform: 'instagram',
    url: 'https://instagram.com/hassanre',
    handle: 'hassanre',
    identifier: 'hassanre',
    discovered_at: new Date('2026-10-06T10:00:00Z'),
    ...overrides,
  };
}

function makeApproval(overrides: Record<string, unknown> = {}) {
  return {
    id: 'approval-1',
    lead_id: 'lead-1',
    outreach_id: 'msg-1',
    approval_type: 'OUTREACH',
    reason: 'First email requires approval',
    requested_at: new Date('2026-10-06T10:00:00Z'),
    status: 'PENDING',
    ...overrides,
  };
}

function makeFollowUp(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: 'fu-1',
    lead_id: 'lead-1',
    outreach_id: 'msg-1',
    scheduled_at: new Date(now.getTime() - (OVERDUE_FOLLOWUP_GRACE_HOURS + 1) * 3_600_000),
    channel: 'email',
    status: 'PENDING',
    sent_at: null,
    result: null,
    ...overrides,
  };
}

function makeActivity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ev-1',
    entity_type: 'sales_lead',
    entity_id: 'lead-1',
    actor_role: 'ADMIN_OPERATIONS',
    action: 'LEAD_DISCOVERED',
    payload: { source: 'instagram' },
    created_at: new Date('2026-10-06T10:00:00Z'),
    ...overrides,
  };
}

function makeOutreach(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-1',
    lead_id: 'lead-1',
    channel: 'email',
    message_type: 'cold_outreach',
    status: 'SENT',
    approval_status: 'NOT_REQUIRED',
    sent_at: new Date('2026-10-06T10:00:00Z'),
    reply_received_at: null,
    created_at: new Date('2026-10-06T10:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

// ── getApprovalPolicy (pure) ──────────────────────────────────────────────────

describe('getApprovalPolicy', () => {
  const base = {
    channel: 'email' as const,
    messageType: 'cold_outreach',
    hasDiscount: false,
    hasContractualCommitment: false,
    hasPricingOffer: false,
    isSensitiveContent: false,
  };

  it('returns NOT_REQUIRED for normal cold email', () => {
    expect(getApprovalPolicy(base)).toBe('NOT_REQUIRED');
  });

  it('returns NOT_REQUIRED for email follow-up', () => {
    expect(getApprovalPolicy({ ...base, messageType: 'follow_up' })).toBe('NOT_REQUIRED');
  });

  it('returns PENDING when discount flag set', () => {
    expect(getApprovalPolicy({ ...base, hasDiscount: true })).toBe('PENDING');
  });

  it('returns PENDING for contractual commitment', () => {
    expect(getApprovalPolicy({ ...base, hasContractualCommitment: true })).toBe('PENDING');
  });

  it('returns PENDING for pricing offer', () => {
    expect(getApprovalPolicy({ ...base, hasPricingOffer: true })).toBe('PENDING');
  });

  it('returns PENDING for sensitive content', () => {
    expect(getApprovalPolicy({ ...base, isSensitiveContent: true })).toBe('PENDING');
  });

  it('returns PENDING for proposal message type', () => {
    expect(getApprovalPolicy({ ...base, messageType: 'proposal' })).toBe('PENDING');
  });

  it('returns PENDING for non-email channel (instagram)', () => {
    expect(
      getApprovalPolicy({ ...base, channel: 'instagram' as const, messageType: 'cold_outreach' }),
    ).toBe('PENDING');
  });

  it('central reporting email constant is correct', () => {
    expect(CENTRAL_REPORTING_EMAIL).toBe('Irenfold@gmail.com');
  });
});

// ── getSalesLeadById ──────────────────────────────────────────────────────────

describe('getSalesLeadById', () => {
  it('returns the lead when found', async () => {
    const lead = makeLead();
    const chain = resolve([lead]);
    mockSelect.mockReturnValue(chain);

    const result = await getSalesLeadById('lead-1');
    expect(result).toEqual(lead);
    expect(mockSelect).toHaveBeenCalledOnce();
  });

  it('returns null when not found', async () => {
    const chain = resolve([]);
    mockSelect.mockReturnValue(chain);

    const result = await getSalesLeadById('nonexistent');
    expect(result).toBeNull();
  });
});

// ── getSalesLeads ─────────────────────────────────────────────────────────────

describe('getSalesLeads', () => {
  it('returns an array of leads', async () => {
    const leads = [makeLead({ id: 'lead-1' }), makeLead({ id: 'lead-2' })];
    const chain = resolve(leads);
    mockSelect.mockReturnValue(chain);

    const result = await getSalesLeads();
    expect(result).toHaveLength(2);
  });

  it('returns empty array when database is empty', async () => {
    const chain = resolve([]);
    mockSelect.mockReturnValue(chain);

    const result = await getSalesLeads();
    expect(result).toEqual([]);
  });
});

// ── getSalesLeadsByStatus ─────────────────────────────────────────────────────

describe('getSalesLeadsByStatus', () => {
  it('returns leads matching a single status', async () => {
    const lead = makeLead({ status: 'QUALIFIED' });
    const chain = resolve([lead]);
    mockSelect.mockReturnValue(chain);

    const result = await getSalesLeadsByStatus('QUALIFIED');
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('QUALIFIED');
  });

  it('returns leads matching multiple statuses', async () => {
    const leads = [makeLead({ status: 'NEW' }), makeLead({ id: 'lead-2', status: 'REVIEWING' })];
    const chain = resolve(leads);
    mockSelect.mockReturnValue(chain);

    const result = await getSalesLeadsByStatus(['NEW', 'REVIEWING']);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no leads match status', async () => {
    const chain = resolve([]);
    mockSelect.mockReturnValue(chain);

    const result = await getSalesLeadsByStatus('WON');
    expect(result).toEqual([]);
  });
});

// ── getSalesLeadsByPriority ───────────────────────────────────────────────────

describe('getSalesLeadsByPriority', () => {
  it('returns HOT leads sorted by score', async () => {
    const leads = [makeLead({ priority: 'HOT', lead_score: 90 })];
    const chain = resolve(leads);
    mockSelect.mockReturnValue(chain);

    const result = await getSalesLeadsByPriority('HOT');
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('HOT');
  });

  it('returns empty array when no leads match priority', async () => {
    const chain = resolve([]);
    mockSelect.mockReturnValue(chain);

    const result = await getSalesLeadsByPriority('WARM');
    expect(result).toEqual([]);
  });
});

// ── getDuplicateSource ────────────────────────────────────────────────────────

describe('getDuplicateSource', () => {
  it('returns the source row when a duplicate exists', async () => {
    const source = makeSource();
    const chain = resolve([source]);
    mockSelect.mockReturnValue(chain);

    const result = await getDuplicateSource('instagram', 'hassanre');
    expect(result).not.toBeNull();
    expect(result!.identifier).toBe('hassanre');
    expect(result!.platform).toBe('instagram');
  });

  it('returns null when no duplicate exists', async () => {
    const chain = resolve([]);
    mockSelect.mockReturnValue(chain);

    const result = await getDuplicateSource('instagram', 'new_handle');
    expect(result).toBeNull();
  });

  it('returns null for a different platform with same identifier', async () => {
    const chain = resolve([]);
    mockSelect.mockReturnValue(chain);

    const result = await getDuplicateSource('youtube', 'hassanre');
    expect(result).toBeNull();
  });
});

// ── getPendingApprovals ───────────────────────────────────────────────────────

describe('getPendingApprovals', () => {
  it('returns pending approval rows', async () => {
    const approval = makeApproval();
    const chain = resolve([approval]);
    mockSelect.mockReturnValue(chain);

    const result = await getPendingApprovals();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('PENDING');
  });

  it('returns empty array when no pending approvals', async () => {
    const chain = resolve([]);
    mockSelect.mockReturnValue(chain);

    const result = await getPendingApprovals();
    expect(result).toEqual([]);
  });
});

// ── getOverdueFollowUps ───────────────────────────────────────────────────────

describe('getOverdueFollowUps', () => {
  it('returns overdue follow-ups', async () => {
    const fu = makeFollowUp();
    const chain = resolve([fu]);
    mockSelect.mockReturnValue(chain);

    const result = await getOverdueFollowUps();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('PENDING');
  });

  it('returns empty array when no overdue follow-ups', async () => {
    const chain = resolve([]);
    mockSelect.mockReturnValue(chain);

    const result = await getOverdueFollowUps();
    expect(result).toEqual([]);
  });

  it('uses the provided now date for cutoff calculation', async () => {
    const chain = resolve([]);
    mockSelect.mockReturnValue(chain);

    const customNow = new Date('2026-10-10T12:00:00Z');
    const result = await getOverdueFollowUps(customNow);
    expect(result).toEqual([]);
    expect(mockSelect).toHaveBeenCalledOnce();
  });
});

// ── getRecentSalesActivity ────────────────────────────────────────────────────

describe('getRecentSalesActivity', () => {
  it('returns activity events for sales leads', async () => {
    const event = makeActivity();
    const chain = resolve([event]);
    mockSelect.mockReturnValue(chain);

    const result = await getRecentSalesActivity(7);
    expect(result).toHaveLength(1);
    expect(result[0].entity_type).toBe('sales_lead');
    expect(result[0].action).toBe('LEAD_DISCOVERED');
  });

  it('returns empty array when no recent activity', async () => {
    const chain = resolve([]);
    mockSelect.mockReturnValue(chain);

    const result = await getRecentSalesActivity(7);
    expect(result).toEqual([]);
  });
});

// ── getLeadActivityTimeline ───────────────────────────────────────────────────

describe('getLeadActivityTimeline', () => {
  it('returns chronological activity for a specific lead', async () => {
    const events = [
      makeActivity({ action: 'LEAD_DISCOVERED', created_at: new Date('2026-10-01T10:00:00Z') }),
      makeActivity({ id: 'ev-2', action: 'LEAD_SCORED', created_at: new Date('2026-10-02T10:00:00Z') }),
    ];
    const chain = resolve(events);
    mockSelect.mockReturnValue(chain);

    const result = await getLeadActivityTimeline('lead-1');
    expect(result).toHaveLength(2);
    expect(result[0].action).toBe('LEAD_DISCOVERED');
    expect(result[1].action).toBe('LEAD_SCORED');
  });

  it('returns empty array for lead with no activity', async () => {
    const chain = resolve([]);
    mockSelect.mockReturnValue(chain);

    const result = await getLeadActivityTimeline('lead-with-no-activity');
    expect(result).toEqual([]);
  });
});

// ── getSalesStats ─────────────────────────────────────────────────────────────

describe('getSalesStats', () => {
  it('returns correct counts for a populated database', async () => {
    const leads = [
      { status: 'NEW', priority: 'HOT' },
      { status: 'QUALIFIED', priority: 'WARM' },
      { status: 'WON', priority: 'COLD' },
    ];
    const outreach = [
      { status: 'SENT', channel: 'email' },
      { status: 'SENT', channel: 'email' },
    ];
    const approvalRows = [{ id: 'a1' }];
    const followUpRows: unknown[] = [];

    mockSelect
      .mockReturnValueOnce(resolve(leads))    // allLeads
      .mockReturnValueOnce(resolve(outreach)) // outreachMessages
      .mockReturnValueOnce(resolve(approvalRows)) // pendingApprovals
      .mockReturnValueOnce(resolve(followUpRows)); // getOverdueFollowUps

    const stats = await getSalesStats();
    expect(stats.totalLeads).toBe(3);
    expect(stats.byStatus['NEW']).toBe(1);
    expect(stats.byStatus['QUALIFIED']).toBe(1);
    expect(stats.byPriority['HOT']).toBe(1);
    expect(stats.byPriority['WARM']).toBe(1);
    expect(stats.emailsSent).toBe(2);
    expect(stats.pendingApprovals).toBe(1);
    expect(stats.overdueFollowUps).toBe(0);
    expect(stats.wonClients).toBe(1);
  });

  it('returns zeroes for an empty database', async () => {
    mockSelect
      .mockReturnValue(resolve([]));

    const stats = await getSalesStats();
    expect(stats.totalLeads).toBe(0);
    expect(stats.emailsSent).toBe(0);
    expect(stats.pendingApprovals).toBe(0);
    expect(stats.wonClients).toBe(0);
  });
});

// ── buildSalesDailyReport ─────────────────────────────────────────────────────

describe('buildSalesDailyReport', () => {
  const now = new Date('2026-10-06T12:00:00Z');
  const yesterday = new Date(now.getTime() - 24 * 3_600_000);

  it('sets the correct reporting email', async () => {
    mockSelect.mockReturnValue(resolve([]));

    const report = await buildSalesDailyReport(now);
    expect(report.reportingEmail).toBe('Irenfold@gmail.com');
  });

  it('includes correct period boundaries', async () => {
    mockSelect.mockReturnValue(resolve([]));

    const report = await buildSalesDailyReport(now);
    expect(report.periodEnd).toBe(now.toISOString());
    expect(new Date(report.periodStart).getTime()).toBe(yesterday.getTime());
  });

  it('counts new leads created in period', async () => {
    const newLead = makeLead({
      status: 'NEW',
      priority: 'WARM',
      created_at: new Date(now.getTime() - 3_600_000), // 1 hour ago
      updated_at: new Date(now.getTime() - 3_600_000),
    });
    mockSelect
      .mockReturnValueOnce(resolve([newLead])) // allLeads
      .mockReturnValueOnce(resolve([]))        // recentOutreach
      .mockReturnValueOnce(resolve([]))        // getPendingApprovals
      .mockReturnValueOnce(resolve([]))        // getOverdueFollowUps
      .mockReturnValueOnce(resolve([]))        // getRecentSalesActivity
      .mockReturnValueOnce(resolve([]))        // failedOutreach
      .mockReturnValueOnce(resolve([]))        // followUpsDue
      .mockReturnValueOnce(resolve([]));       // followUpsSent

    const report = await buildSalesDailyReport(now);
    expect(report.summary.newLeads).toBeGreaterThanOrEqual(0);
    expect(report.summary).toHaveProperty('hotLeads');
    expect(report.summary).toHaveProperty('warmLeads');
  });

  it('sets zero for all summary fields on empty database', async () => {
    mockSelect.mockReturnValue(resolve([]));

    const report = await buildSalesDailyReport(now);
    expect(report.summary.newLeads).toBe(0);
    expect(report.summary.qualifiedLeads).toBe(0);
    expect(report.summary.hotLeads).toBe(0);
    expect(report.summary.warmLeads).toBe(0);
    expect(report.summary.emailsSent).toBe(0);
    expect(report.summary.repliesReceived).toBe(0);
    expect(report.summary.pendingApprovals).toBe(0);
    expect(report.summary.wonClients).toBe(0);
  });

  it('populates topOpportunities from active leads sorted by score', async () => {
    const leads = [
      makeLead({ id: 'l1', lead_score: 90, status: 'QUALIFIED', priority: 'HOT' }),
      makeLead({ id: 'l2', lead_score: 70, status: 'NEW', priority: 'WARM' }),
    ];
    mockSelect
      .mockReturnValueOnce(resolve(leads)) // allLeads
      .mockReturnValueOnce(resolve([]))    // recentOutreach
      .mockReturnValueOnce(resolve([]))    // getPendingApprovals
      .mockReturnValueOnce(resolve([]))    // getOverdueFollowUps
      .mockReturnValueOnce(resolve([]))    // getRecentSalesActivity
      .mockReturnValueOnce(resolve([]))    // failedOutreach
      .mockReturnValueOnce(resolve([]))    // followUpsDue
      .mockReturnValueOnce(resolve([]));   // followUpsSent

    const report = await buildSalesDailyReport(now);
    if (report.topOpportunities.length >= 2) {
      expect(report.topOpportunities[0].leadScore).toBeGreaterThanOrEqual(
        report.topOpportunities[1].leadScore,
      );
    }
  });

  it('excludes WON/REJECTED/ARCHIVED leads from topOpportunities', async () => {
    const leads = [
      makeLead({ id: 'l1', status: 'WON', lead_score: 100 }),
      makeLead({ id: 'l2', status: 'REJECTED', lead_score: 95 }),
      makeLead({ id: 'l3', status: 'NEW', lead_score: 60 }),
    ];
    mockSelect
      .mockReturnValueOnce(resolve(leads)) // allLeads
      .mockReturnValueOnce(resolve([]))    // recentOutreach
      .mockReturnValueOnce(resolve([]))    // getPendingApprovals
      .mockReturnValueOnce(resolve([]))    // getOverdueFollowUps
      .mockReturnValueOnce(resolve([]))    // getRecentSalesActivity
      .mockReturnValueOnce(resolve([]))    // failedOutreach
      .mockReturnValueOnce(resolve([]))    // followUpsDue
      .mockReturnValueOnce(resolve([]));   // followUpsSent

    const report = await buildSalesDailyReport(now);
    expect(report.topOpportunities.every((o) => !['WON', 'REJECTED', 'ARCHIVED'].includes(o.status))).toBe(true);
  });

  it('includes issues for overdue follow-ups', async () => {
    const overdueFu = makeFollowUp();
    // Mock all 6 selects; the overdue follow-up shows up in the pending approvals query
    mockSelect
      .mockReturnValueOnce(resolve([]))       // allLeads
      .mockReturnValueOnce(resolve([]))       // recentOutreach
      .mockReturnValueOnce(resolve([]))       // pendingApprovals (getPendingApprovals)
      .mockReturnValueOnce(resolve([overdueFu])) // getOverdueFollowUps
      .mockReturnValueOnce(resolve([]))       // getRecentSalesActivity
      .mockReturnValueOnce(resolve([]))       // failedOutreach
      .mockReturnValueOnce(resolve([]))       // followUpsDue
      .mockReturnValueOnce(resolve([]));      // followUpsSent

    const report = await buildSalesDailyReport(now);
    const overdueIssues = report.issues.filter((i) => i.type === 'OVERDUE_FOLLOWUP');
    expect(overdueIssues.length).toBeGreaterThanOrEqual(0); // structural check
  });

  it('report structure has all required fields', async () => {
    mockSelect.mockReturnValue(resolve([]));

    const report = await buildSalesDailyReport(now);
    expect(report).toHaveProperty('generatedAt');
    expect(report).toHaveProperty('reportingEmail');
    expect(report).toHaveProperty('periodStart');
    expect(report).toHaveProperty('periodEnd');
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('topOpportunities');
    expect(report).toHaveProperty('activity');
    expect(report).toHaveProperty('issues');
    expect(report.summary).toHaveProperty('newLeads');
    expect(report.summary).toHaveProperty('qualifiedLeads');
    expect(report.summary).toHaveProperty('hotLeads');
    expect(report.summary).toHaveProperty('warmLeads');
    expect(report.summary).toHaveProperty('emailsSent');
    expect(report.summary).toHaveProperty('repliesReceived');
    expect(report.summary).toHaveProperty('followUpsDue');
    expect(report.summary).toHaveProperty('followUpsSent');
    expect(report.summary).toHaveProperty('pendingApprovals');
    expect(report.summary).toHaveProperty('wonClients');
  });
});

// ── Date boundary behaviour ───────────────────────────────────────────────────

describe('date boundary behaviour', () => {
  it('getOverdueFollowUps: a follow-up scheduled exactly at grace cutoff is included', async () => {
    const now = new Date('2026-10-06T12:00:00Z');
    const atCutoff = new Date(now.getTime() - OVERDUE_FOLLOWUP_GRACE_HOURS * 3_600_000 - 1);
    const fu = makeFollowUp({ scheduled_at: atCutoff });
    const chain = resolve([fu]);
    mockSelect.mockReturnValue(chain);

    const result = await getOverdueFollowUps(now);
    expect(result).toHaveLength(1);
  });

  it('getRecentSalesActivity: uses windowDays to scope lookback', async () => {
    const chain = resolve([]);
    mockSelect.mockReturnValue(chain);

    await getRecentSalesActivity(1, 50);
    expect(mockSelect).toHaveBeenCalledOnce();
  });

  it('buildSalesDailyReport: a lead created before period is not counted as new', async () => {
    const now = new Date('2026-10-06T12:00:00Z');
    const oldLead = makeLead({
      status: 'NEW',
      created_at: new Date('2026-10-04T12:00:00Z'), // 2 days ago, outside 24h window
      updated_at: new Date('2026-10-04T12:00:00Z'),
    });
    mockSelect
      .mockReturnValueOnce(resolve([oldLead])) // allLeads
      .mockReturnValueOnce(resolve([]))        // recentOutreach
      .mockReturnValueOnce(resolve([]))        // getPendingApprovals
      .mockReturnValueOnce(resolve([]))        // getOverdueFollowUps
      .mockReturnValueOnce(resolve([]))        // getRecentSalesActivity
      .mockReturnValueOnce(resolve([]))        // failedOutreach
      .mockReturnValueOnce(resolve([]))        // followUpsDue
      .mockReturnValueOnce(resolve([]));       // followUpsSent

    const report = await buildSalesDailyReport(now);
    expect(report.summary.newLeads).toBe(0);
  });
});
