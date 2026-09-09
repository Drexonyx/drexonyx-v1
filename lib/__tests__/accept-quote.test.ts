import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockUpdate, mockTransaction } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    transaction: mockTransaction,
  },
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-uuid' }));

import { acceptQuote } from '../portal/accept-quote';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function selectSequence(results: unknown[][]) {
  let call = 0;
  mockSelect.mockImplementation(() => {
    const result = results[call] ?? [];
    call++;
    const end = vi.fn().mockResolvedValue(result);
    return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: end };
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('acceptQuote', () => {
  const params = { quoteId: 'q1', organizationId: 'org1', actorId: 'actor1' };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:true on idempotency key COMPLETED', async () => {
    const end = vi.fn().mockResolvedValue([{ status: 'COMPLETED', response_payload: { orderId: 'existing-order-id' } }]);
    mockSelect.mockReturnValue({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: end });

    const result = await acceptQuote(params);
    expect(result).toEqual({ ok: true, quoteId: 'q1', orderId: 'existing-order-id' });
  });

  it('returns ok:false when idempotency key PROCESSING', async () => {
    const end = vi.fn().mockResolvedValue([{ status: 'PROCESSING', response_payload: null }]);
    mockSelect.mockReturnValue({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: end });

    const result = await acceptQuote(params);
    expect(result).toEqual({ ok: false, reason: 'A quote acceptance operation is already in progress' });
  });

  it('returns ok:false when quote not found', async () => {
    selectSequence([[], []]); // no idempotency key, no quote
    const result = await acceptQuote(params);
    expect(result).toEqual({ ok: false, reason: 'Quote not found' });
  });

  it('returns ok:false when quote is DRAFT', async () => {
    selectSequence([
      [], // no idempotency key
      [{ id: 'q1', status: 'DRAFT', total_amount: '1000.00', estimated_cost: null, currency: 'USD', campaign_id: 'c1' }],
    ]);
    const result = await acceptQuote(params);
    expect(result).toEqual({ ok: false, reason: 'Cannot accept a quote with status DRAFT' });
  });

  it('returns ok:true and existing orderId when quote already ACCEPTED', async () => {
    selectSequence([
      [], // no idempotency key
      [{ id: 'q1', status: 'ACCEPTED', total_amount: '1000.00', estimated_cost: null, currency: 'USD', campaign_id: 'c1' }],
      [{ id: 'existing-order' }], // existing order lookup
    ]);
    const result = await acceptQuote(params);
    expect(result).toEqual({ ok: true, quoteId: 'q1', orderId: 'existing-order' });
  });

  it('returns ok:true on successful acceptance via transaction', async () => {
    selectSequence([
      [], // no idempotency key
      [{ id: 'q1', status: 'SENT', total_amount: '1000.00', estimated_cost: '800.00', currency: 'USD', campaign_id: 'c1' }],
    ]);

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'q1' }]) }),
          }),
        }),
      };
      await fn(tx);
    });

    const result = await acceptQuote(params);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.quoteId).toBe('q1');
      expect(result.orderId).toBeTruthy();
    }
  });
});
