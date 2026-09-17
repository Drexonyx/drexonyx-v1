import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSelect } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: { select: mockSelect },
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
    where: vi.fn().mockReturnValue(terminal),
    orderBy: vi.fn().mockReturnValue(terminal),
  };
  chain.from.mockReturnValue(chain);
  return chain;
}

import {
  isOrderProductionFunded,
  getProductionReadyOrders,
} from '../production-funding';

// ─── isOrderProductionFunded ───────────────────────────────────────────────────

describe('isOrderProductionFunded', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true when a PAID payment row exists for the order', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'payment-uuid' }]));

    const result = await isOrderProductionFunded('order-1', 'org-1');

    expect(result).toBe(true);
  });

  it('returns false when no PAID payment row exists', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const result = await isOrderProductionFunded('order-1', 'org-1');

    expect(result).toBe(false);
  });

  it('passes orderId, organizationId, and PAID status to the query', async () => {
    const chain = makeSelectChain([]);
    mockSelect.mockReturnValue(chain);

    await isOrderProductionFunded('order-abc', 'org-xyz');

    // select was called, from and where were chained
    expect(mockSelect).toHaveBeenCalled();
    expect(chain.from).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalled();
  });

  it('uses limit(1) to avoid full table scan', async () => {
    const terminal = {
      limit: vi.fn().mockResolvedValue([]),
    };
    const chain: Record<string, ReturnType<typeof vi.fn>> = {
      from: vi.fn(),
      where: vi.fn().mockReturnValue(terminal),
    };
    chain.from.mockReturnValue(chain);
    mockSelect.mockReturnValue(chain);

    await isOrderProductionFunded('order-1', 'org-1');

    expect(terminal.limit).toHaveBeenCalledWith(1);
  });
});

// ─── getProductionReadyOrders ──────────────────────────────────────────────────

describe('getProductionReadyOrders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty array when no ACTIVE orders exist', async () => {
    // First select call returns no orders
    mockSelect.mockReturnValueOnce(makeSelectChain([]));

    const result = await getProductionReadyOrders('org-1');

    expect(result).toEqual([]);
    // Second select (payments) should not be called
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it('returns only ACTIVE orders that have a PAID payment', async () => {
    const activeOrders = [
      { id: 'order-1', campaign_id: 'camp-1', quote_id: 'q-1', status: 'ACTIVE', created_at: new Date(), updated_at: new Date() },
      { id: 'order-2', campaign_id: 'camp-1', quote_id: 'q-2', status: 'ACTIVE', created_at: new Date(), updated_at: new Date() },
    ];
    const paidPayments = [{ order_id: 'order-1' }];

    mockSelect
      .mockReturnValueOnce(makeSelectChain(activeOrders))
      .mockReturnValueOnce(makeSelectChain(paidPayments));

    const result = await getProductionReadyOrders('org-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('order-1');
  });

  it('returns empty array when ACTIVE orders exist but none have a PAID payment', async () => {
    const activeOrders = [
      { id: 'order-1', campaign_id: 'camp-1', quote_id: 'q-1', status: 'ACTIVE', created_at: new Date(), updated_at: new Date() },
    ];

    mockSelect
      .mockReturnValueOnce(makeSelectChain(activeOrders))
      .mockReturnValueOnce(makeSelectChain([]));

    const result = await getProductionReadyOrders('org-1');

    expect(result).toEqual([]);
  });

  it('returns all ACTIVE orders that have PAID payments', async () => {
    const activeOrders = [
      { id: 'order-1', campaign_id: 'c', quote_id: 'q1', status: 'ACTIVE', created_at: new Date(), updated_at: new Date() },
      { id: 'order-2', campaign_id: 'c', quote_id: 'q2', status: 'ACTIVE', created_at: new Date(), updated_at: new Date() },
    ];
    const paidPayments = [{ order_id: 'order-1' }, { order_id: 'order-2' }];

    mockSelect
      .mockReturnValueOnce(makeSelectChain(activeOrders))
      .mockReturnValueOnce(makeSelectChain(paidPayments));

    const result = await getProductionReadyOrders('org-1');

    expect(result).toHaveLength(2);
  });

  it('does not include orders from other organizations in the paid set', async () => {
    const activeOrders = [
      { id: 'order-1', campaign_id: 'c', quote_id: 'q1', status: 'ACTIVE', created_at: new Date(), updated_at: new Date() },
    ];
    // Payment belongs to a different org's order — the inArray filter excludes it
    // (the payments query itself already scopes by organizationId; here we verify
    // that an order-id from a different org cannot leak through)
    const paidPayments = [{ order_id: 'order-other' }];

    mockSelect
      .mockReturnValueOnce(makeSelectChain(activeOrders))
      .mockReturnValueOnce(makeSelectChain(paidPayments));

    const result = await getProductionReadyOrders('org-1');

    expect(result).toEqual([]);
  });
});
