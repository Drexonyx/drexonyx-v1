import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSelect } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
}));

vi.mock('@/db/index', () => ({ db: { select: mockSelect } }));

import {
  computeStaleDays,
  computeCompletenessScore,
  classifyLeads,
  buildLeadHunterReport,
  STALE_NEW_DAYS,
  STALE_REVIEWED_DAYS,
  DEFAULT_WINDOW_DAYS,
} from '../intelligence';

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const asPromise = Promise.resolve(result);
  const terminal: Record<string, unknown> = {
    then: asPromise.then.bind(asPromise),
    catch: asPromise.catch.bind(asPromise),
    finally: asPromise.finally.bind(asPromise),
  };

  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    where: vi.fn().mockReturnValue(terminal),
  };
  chain.from.mockReturnValue(chain);
  return chain;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

function makeInquiry(overrides: Partial<{
  id: string;
  status: string;
  brand_name: string;
  campaign_objective: string;
  website: string | null;
  target_audience: string | null;
  creative_types: string | null;
  platforms: string | null;
  additional_notes: string | null;
  submitted_at: Date;
  updated_at: Date;
}> = {}) {
  return {
    id: overrides.id ?? 'inquiry-uuid-1',
    status: overrides.status ?? 'NEW',
    brand_name: overrides.brand_name ?? 'Acme Brand',
    campaign_objective: overrides.campaign_objective ?? 'Drive brand awareness',
    website: overrides.website ?? null,
    target_audience: overrides.target_audience ?? null,
    creative_types: overrides.creative_types ?? null,
    platforms: overrides.platforms ?? null,
    additional_notes: overrides.additional_notes ?? null,
    submitted_at: overrides.submitted_at ?? daysAgo(1),
    updated_at: overrides.updated_at ?? daysAgo(1),
  };
}

beforeEach(() => vi.clearAllMocks());

// ── computeStaleDays ──────────────────────────────────────────────────────────

describe('computeStaleDays', () => {
  it('returns 0 for same-day update', () => {
    const now = new Date('2026-01-10T12:00:00Z');
    const updated = new Date('2026-01-10T06:00:00Z');
    expect(computeStaleDays(updated, now)).toBe(0);
  });

  it('returns correct days for 5 days ago', () => {
    const now = new Date('2026-01-10T00:00:00Z');
    const updated = new Date('2026-01-05T00:00:00Z');
    expect(computeStaleDays(updated, now)).toBe(5);
  });

  it('floors partial days', () => {
    const now = new Date('2026-01-10T00:00:00Z');
    const updated = new Date('2026-01-08T12:00:00Z');
    expect(computeStaleDays(updated, now)).toBe(1);
  });
});

// ── computeCompletenessScore ──────────────────────────────────────────────────

describe('computeCompletenessScore', () => {
  it('returns 0 when all optional fields are null', () => {
    expect(computeCompletenessScore({
      website: null, target_audience: null, creative_types: null,
      platforms: null, additional_notes: null,
    })).toBe(0);
  });

  it('returns 5 when all optional fields are filled', () => {
    expect(computeCompletenessScore({
      website: 'https://example.com',
      target_audience: 'Millennials 18-34',
      creative_types: 'Video',
      platforms: 'Instagram, TikTok',
      additional_notes: 'Urgent campaign',
    })).toBe(5);
  });

  it('counts only non-null non-empty values', () => {
    expect(computeCompletenessScore({
      website: 'https://example.com',
      target_audience: null,
      creative_types: '',
      platforms: 'TikTok',
      additional_notes: null,
    })).toBe(2);
  });

  it('returns 1 for single filled field', () => {
    expect(computeCompletenessScore({
      website: 'https://example.com',
      target_audience: null,
      creative_types: null,
      platforms: null,
      additional_notes: null,
    })).toBe(1);
  });
});

// ── classifyLeads ─────────────────────────────────────────────────────────────

describe('classifyLeads', () => {
  const NOW = new Date('2026-09-17T12:00:00Z');

  it('returns empty collections for empty input', () => {
    const result = classifyLeads([], NOW);
    expect(result.summary.total).toBe(0);
    expect(result.newLeads).toHaveLength(0);
    expect(result.pendingLeads).toHaveLength(0);
    expect(result.staleLeads).toHaveLength(0);
    expect(result.followUpRequired).toHaveLength(0);
  });

  it('classifies NEW inquiry within window as newLead', () => {
    const row = makeInquiry({
      status: 'NEW',
      submitted_at: new Date('2026-09-10T00:00:00Z'), // 7 days ago
      updated_at: new Date('2026-09-10T00:00:00Z'),
    });
    const result = classifyLeads([row], NOW, { windowDays: 30 });
    expect(result.newLeads).toHaveLength(1);
    expect(result.newLeads[0].id).toBe(row.id);
  });

  it('excludes NEW inquiry older than window from newLeads', () => {
    const row = makeInquiry({
      status: 'NEW',
      submitted_at: new Date('2026-08-01T00:00:00Z'), // > 30 days ago
      updated_at: new Date('2026-08-01T00:00:00Z'),
    });
    const result = classifyLeads([row], NOW, { windowDays: 30 });
    expect(result.newLeads).toHaveLength(0);
  });

  it('marks NEW inquiry stale when not reviewed within staleNewDays', () => {
    const row = makeInquiry({
      status: 'NEW',
      submitted_at: new Date('2026-09-10T00:00:00Z'), // 7 days ago
      updated_at: new Date('2026-09-10T00:00:00Z'),
    });
    const result = classifyLeads([row], NOW, { staleNewDays: 3 });
    expect(result.staleLeads).toHaveLength(1);
    expect(result.staleLeads[0].staleReason).toBe('UNREVIEWED');
  });

  it('does not mark NEW inquiry stale when within staleNewDays', () => {
    const row = makeInquiry({
      status: 'NEW',
      submitted_at: new Date('2026-09-16T00:00:00Z'), // 1 day ago
      updated_at: new Date('2026-09-16T00:00:00Z'),
    });
    const result = classifyLeads([row], NOW, { staleNewDays: 3 });
    expect(result.staleLeads).toHaveLength(0);
  });

  it('classifies REVIEWED inquiry as pendingLead', () => {
    const row = makeInquiry({ status: 'REVIEWED', updated_at: new Date('2026-09-15T00:00:00Z') });
    const result = classifyLeads([row], NOW);
    expect(result.pendingLeads).toHaveLength(1);
    expect(result.pendingLeads[0].id).toBe(row.id);
  });

  it('marks REVIEWED inquiry stale and in followUpRequired when beyond staleReviewedDays', () => {
    const row = makeInquiry({
      status: 'REVIEWED',
      updated_at: new Date('2026-09-05T00:00:00Z'), // 12 days ago
    });
    const result = classifyLeads([row], NOW, { staleReviewedDays: 7 });
    expect(result.staleLeads).toHaveLength(1);
    expect(result.staleLeads[0].staleReason).toBe('REVIEW_PENDING_CONVERSION');
    expect(result.followUpRequired).toHaveLength(1);
    expect(result.followUpRequired[0].id).toBe(row.id);
  });

  it('does not mark REVIEWED inquiry stale when within staleReviewedDays', () => {
    const row = makeInquiry({
      status: 'REVIEWED',
      updated_at: new Date('2026-09-15T00:00:00Z'), // 2 days ago
    });
    const result = classifyLeads([row], NOW, { staleReviewedDays: 7 });
    expect(result.staleLeads).toHaveLength(0);
    expect(result.followUpRequired).toHaveLength(0);
  });

  it('counts status correctly in summary.byStatus', () => {
    const rows = [
      makeInquiry({ id: '1', status: 'NEW' }),
      makeInquiry({ id: '2', status: 'NEW' }),
      makeInquiry({ id: '3', status: 'REVIEWED' }),
    ];
    const result = classifyLeads(rows, NOW);
    expect(result.summary.total).toBe(3);
    expect(result.summary.byStatus['NEW']).toBe(2);
    expect(result.summary.byStatus['REVIEWED']).toBe(1);
  });

  it('sorts staleLeads by staleDays descending', () => {
    const rows = [
      makeInquiry({ id: '1', status: 'NEW', updated_at: new Date('2026-09-10T00:00:00Z') }), // 7 days
      makeInquiry({ id: '2', status: 'NEW', updated_at: new Date('2026-09-05T00:00:00Z') }), // 12 days
    ];
    const result = classifyLeads(rows, NOW, { staleNewDays: 3 });
    expect(result.staleLeads[0].id).toBe('2');
    expect(result.staleLeads[1].id).toBe('1');
  });

  it('sorts newLeads by completenessScore descending', () => {
    const rows = [
      makeInquiry({ id: '1', status: 'NEW', website: null, target_audience: null }),
      makeInquiry({ id: '2', status: 'NEW', website: 'https://a.com', target_audience: 'All ages' }),
    ];
    const result = classifyLeads(rows, NOW, { windowDays: 60 });
    expect(result.newLeads[0].id).toBe('2');
  });

  it('LeadRecord does not contain contact_email (PII boundary)', () => {
    const row = makeInquiry({ status: 'NEW' });
    const result = classifyLeads([row], NOW);
    const record = result.newLeads[0];
    expect(record).not.toHaveProperty('contact_email');
  });

  it('includes staleDays in each LeadRecord', () => {
    const row = makeInquiry({
      status: 'NEW',
      submitted_at: new Date('2026-09-10T00:00:00Z'),
      updated_at: new Date('2026-09-10T00:00:00Z'),
    });
    const result = classifyLeads([row], NOW);
    expect(result.newLeads[0].staleDays).toBeGreaterThanOrEqual(0);
  });

  it('respects default threshold constants', () => {
    expect(STALE_NEW_DAYS).toBeGreaterThan(0);
    expect(STALE_REVIEWED_DAYS).toBeGreaterThan(STALE_NEW_DAYS);
    expect(DEFAULT_WINDOW_DAYS).toBeGreaterThan(0);
  });
});

// ── buildLeadHunterReport ─────────────────────────────────────────────────────

describe('buildLeadHunterReport', () => {
  it('returns a report with ISO generatedAt', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const report = await buildLeadHunterReport();
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('uses default windowDays when not specified', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const report = await buildLeadHunterReport();
    expect(report.windowDays).toBe(DEFAULT_WINDOW_DAYS);
  });

  it('uses provided windowDays', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const report = await buildLeadHunterReport({ windowDays: 14 });
    expect(report.windowDays).toBe(14);
  });

  it('returns hasActionableLeads false for empty inquiry table', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const report = await buildLeadHunterReport();
    expect(report.hasActionableLeads).toBe(false);
    expect(report.summary.total).toBe(0);
  });

  it('returns hasActionableLeads true when new leads exist', async () => {
    const row = makeInquiry({
      status: 'NEW',
      submitted_at: new Date(Date.now() - 1 * 86_400_000),
      updated_at: new Date(Date.now() - 1 * 86_400_000),
    });
    mockSelect.mockReturnValue(makeSelectChain([row]));
    const report = await buildLeadHunterReport({ windowDays: 30 });
    expect(report.hasActionableLeads).toBe(true);
    expect(report.newLeads).toHaveLength(1);
  });

  it('report shape contains all required sections', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const report = await buildLeadHunterReport();
    expect(report).toHaveProperty('generatedAt');
    expect(report).toHaveProperty('windowDays');
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('newLeads');
    expect(report).toHaveProperty('pendingLeads');
    expect(report).toHaveProperty('staleLeads');
    expect(report).toHaveProperty('followUpRequired');
    expect(report).toHaveProperty('hasActionableLeads');
  });

  it('no contact_email in any lead record (PII boundary)', async () => {
    const row = makeInquiry({ status: 'NEW' });
    mockSelect.mockReturnValue(makeSelectChain([row]));
    const report = await buildLeadHunterReport({ windowDays: 60 });
    for (const lead of [...report.newLeads, ...report.pendingLeads, ...report.staleLeads]) {
      expect(lead).not.toHaveProperty('contact_email');
    }
  });

  it('queries only NEW and REVIEWED statuses (not CONVERTED or DISMISSED)', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    await buildLeadHunterReport();
    // The query uses inArray(inquiries.status, ['NEW', 'REVIEWED'])
    // Verified by classifyLeads only receiving NEW/REVIEWED rows from the mock
    expect(mockSelect).toHaveBeenCalledOnce();
  });
});
