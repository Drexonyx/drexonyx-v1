import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSelect } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: {
    select: mockSelect,
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const terminal = {
    limit: vi.fn().mockResolvedValue(result),
    orderBy: vi.fn().mockResolvedValue(result),
    then: (onFulfilled: (v: unknown[]) => void, onRejected?: (e: unknown) => void) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn().mockReturnValue(terminal),
    orderBy: vi.fn().mockReturnValue(terminal),
  };
  chain.from.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  return chain;
}

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
      queries.getDeliveryAssetIds,
      queries.getDashboardCounts,
    ];
    for (const fn of fns) {
      expect(typeof fn).toBe('function');
      expect(fn.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('getCampaign accepts organizationId and campaignId', async () => {
    const { getCampaign } = await import('../portal/queries');
    expect(getCampaign.length).toBe(2);
  });

  it('getAssetFileKeys accepts organizationId and assetIds', async () => {
    const { getAssetFileKeys } = await import('../portal/queries');
    expect(getAssetFileKeys.length).toBe(2);
  });
});

// ─── getDeliveryAssetIds ───────────────────────────────────────────────────────

describe('getDeliveryAssetIds', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns empty map when no delivery assets exist', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const { getDeliveryAssetIds } = await import('../portal/queries');
    const result = await getDeliveryAssetIds('org1');
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it('groups asset IDs by delivery ID', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      { delivery_id: 'del1', asset_id: 'asset1' },
      { delivery_id: 'del1', asset_id: 'asset2' },
      { delivery_id: 'del2', asset_id: 'asset3' },
    ]));
    const { getDeliveryAssetIds } = await import('../portal/queries');
    const result = await getDeliveryAssetIds('org1');
    expect(result.get('del1')).toEqual(['asset1', 'asset2']);
    expect(result.get('del2')).toEqual(['asset3']);
  });
});

// ─── getAssetFileKeys ──────────────────────────────────────────────────────────

describe('getAssetFileKeys', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns empty map immediately when assetIds is empty', async () => {
    const { getAssetFileKeys } = await import('../portal/queries');
    const result = await getAssetFileKeys('org1', []);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns map of asset_id to file_key, excluding null file_keys', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      { id: 'asset1', file_key: 'files/asset1.mp4' },
      { id: 'asset2', file_key: null },
      { id: 'asset3', file_key: 'files/asset3.mov' },
    ]));
    const { getAssetFileKeys } = await import('../portal/queries');
    const result = await getAssetFileKeys('org1', ['asset1', 'asset2', 'asset3']);
    expect(result.get('asset1')).toBe('files/asset1.mp4');
    expect(result.has('asset2')).toBe(false); // null file_key excluded
    expect(result.get('asset3')).toBe('files/asset3.mov');
  });
});
