import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockTransaction, mockSessionCreate } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockTransaction: vi.fn(),
  mockSessionCreate: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    transaction: mockTransaction,
  },
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: { sessions: { create: (...args: unknown[]) => mockSessionCreate(...args) } },
  },
  getStripe: vi.fn(),
  STRIPE_WEBHOOK_SECRET_KEY: 'STRIPE_WEBHOOK_SECRET',
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'pay-uuid' }));

import { createCheckoutSession } from '../portal/create-payment';

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

function txMock() {
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
    const tx = {
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
    };
    await fn(tx);
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('createCheckoutSession', () => {
  const params = { orderId: 'o1', organizationId: 'org1', actorId: 'actor1', baseUrl: 'https://example.com' };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false when order not found', async () => {
    selectSequence([[]]);
    const result = await createCheckoutSession(params);
    expect(result).toEqual({ ok: false, reason: 'Order not found' });
  });

  it('returns ok:false when order is not ACTIVE', async () => {
    selectSequence([[{ id: 'o1', quote_id: 'q1', status: 'COMPLETED' }]]);
    const result = await createCheckoutSession(params);
    expect(result).toEqual({ ok: false, reason: 'Order is not active (status: COMPLETED)' });
  });

  it('returns ok:false when quote not found', async () => {
    selectSequence([
      [{ id: 'o1', quote_id: 'q1', status: 'ACTIVE' }],
      [],
    ]);
    const result = await createCheckoutSession(params);
    expect(result).toEqual({ ok: false, reason: 'Quote not found for order' });
  });

  it('returns ok:false when already paid', async () => {
    selectSequence([
      [{ id: 'o1', quote_id: 'q1', status: 'ACTIVE' }],
      [{ total_amount: '1000.0000', currency: 'USD' }],
      [{ id: 'existing-payment' }],
    ]);
    const result = await createCheckoutSession(params);
    expect(result).toEqual({ ok: false, reason: 'This order already has a completed payment' });
  });

  it('returns ok:false when Stripe returns no URL', async () => {
    selectSequence([
      [{ id: 'o1', quote_id: 'q1', status: 'ACTIVE' }],
      [{ total_amount: '1000.0000', currency: 'USD' }],
      [],
    ]);
    mockSessionCreate.mockResolvedValue({ id: 'cs_test', url: null });

    const result = await createCheckoutSession(params);
    expect(result).toEqual({ ok: false, reason: 'Stripe did not return a checkout URL' });
  });

  it('returns ok:true with checkoutUrl on success', async () => {
    selectSequence([
      [{ id: 'o1', quote_id: 'q1', status: 'ACTIVE' }],
      [{ total_amount: '1500.0000', currency: 'USD' }],
      [],
    ]);
    mockSessionCreate.mockResolvedValue({ id: 'cs_test_123', url: 'https://checkout.stripe.com/pay/cs_test_123' });
    txMock();

    const result = await createCheckoutSession(params);
    expect(result).toEqual({
      ok: true,
      checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_123',
      paymentId: 'pay-uuid',
    });
  });

  it('passes correct amount in cents to Stripe', async () => {
    selectSequence([
      [{ id: 'o1', quote_id: 'q1', status: 'ACTIVE' }],
      [{ total_amount: '99.99', currency: 'USD' }],
      [],
    ]);
    mockSessionCreate.mockResolvedValue({ id: 'cs_x', url: 'https://checkout.stripe.com/x' });
    txMock();

    await createCheckoutSession(params);

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 9999 }),
          }),
        ]),
      }),
    );
  });
});
