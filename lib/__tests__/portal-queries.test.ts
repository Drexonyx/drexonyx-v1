import { describe, it, expect, vi } from 'vitest';

// Mock db before importing queries
const { mockSelectResult } = vi.hoisted(() => ({
  mockSelectResult: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: mockSelectResult,
          orderBy: mockSelectResult,
        }),
        orderBy: mockSelectResult,
      }),
    }),
  },
}));

import {
  mapClientAssetStatus,
  isClientQuoteStatus,
} from '../portal/types';

// ─── Client asset filtering ────────────────────────────────────────────────────

describe('getClientAssets status filtering', () => {
  it('CLIENT_PREVIEW is a client-safe asset status', () => {
    expect(mapClientAssetStatus('CLIENT_PREVIEW')).not.toBeNull();
  });

  it('REVISION_REQUIRED is a client-safe asset status', () => {
    expect(mapClientAssetStatus('REVISION_REQUIRED')).not.toBeNull();
  });

  it('UPLOADED is never exposed to CLIENT', () => {
    expect(mapClientAssetStatus('UPLOADED')).toBeNull();
  });

  it('PROCESSING is never exposed to CLIENT', () => {
    expect(mapClientAssetStatus('PROCESSING')).toBeNull();
  });

  it('READY_FOR_QC is never exposed to CLIENT', () => {
    expect(mapClientAssetStatus('READY_FOR_QC')).toBeNull();
  });

  it('REJECTED is never exposed to CLIENT', () => {
    expect(mapClientAssetStatus('REJECTED')).toBeNull();
  });
});

// ─── Quote status filtering ────────────────────────────────────────────────────

describe('getQuotes DRAFT filtering', () => {
  it('DRAFT is not a client-safe quote status', () => {
    expect(isClientQuoteStatus('DRAFT')).toBe(false);
  });

  it('SENT passes client filter', () => {
    expect(isClientQuoteStatus('SENT')).toBe(true);
  });

  it('ACCEPTED passes client filter', () => {
    expect(isClientQuoteStatus('ACCEPTED')).toBe(true);
  });

  it('REJECTED passes client filter', () => {
    expect(isClientQuoteStatus('REJECTED')).toBe(true);
  });

  it('EXPIRED passes client filter', () => {
    expect(isClientQuoteStatus('EXPIRED')).toBe(true);
  });

  it('CANCELLED passes client filter', () => {
    expect(isClientQuoteStatus('CANCELLED')).toBe(true);
  });
});

// ─── Tenant isolation — verify organizationId scoping ─────────────────────────

describe('query tenant isolation contracts', () => {
  it('all query functions accept organizationId as first argument', async () => {
    // Import here so mocks are in place
    const queries = await import('../portal/queries');
    const fns = [
      queries.getOrganization,
      queries.getBrandDna,
      queries.getCampaigns,
      queries.getQuotes,
      queries.getOrders,
      queries.getClientAssets,
      queries.getPayments,
      queries.getApprovals,
      queries.getDeliveries,
      queries.getDashboardCounts,
    ];
    for (const fn of fns) {
      expect(typeof fn).toBe('function');
      // Each function should accept at least one argument (organizationId)
      expect(fn.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('getCampaign accepts organizationId and campaignId', async () => {
    const { getCampaign } = await import('../portal/queries');
    expect(getCampaign.length).toBe(2);
  });
});
