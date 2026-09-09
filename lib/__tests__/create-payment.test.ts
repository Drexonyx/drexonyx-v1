import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockUpdate, mockTransaction, mockSessionCreate } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
  mockSessionCreate: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
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

function makePendingTx() {
  return {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
  };
}

function makeProcessingTx() {
  return {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
  };
}

// Sets up one transaction call (PENDING insert only — used when Stripe fails or no URL)
function oneTxMock(capture?: { tx: ReturnType<typeof makePendingTx> | null }) {
  mockTransaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<void>) => {
    const tx = makePendingTx();
    if (capture) capture.tx = tx;
    await fn(tx);
  });
}

// Sets up two transaction calls: first PENDING insert, then PROCESSING update
function twoTxMock(captures?: {
  pendingTx: ReturnType<typeof makePendingTx> | null;
  processingTx: ReturnType<typeof makeProcessingTx> | null;
}) {
  mockTransaction
    .mockImplementationOnce(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = makePendingTx();
      if (captures) captures.pendingTx = tx;
      await fn(tx);
    })
    .mockImplementationOnce(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = makeProcessingTx();
      if (captures) captures.processingTx = tx;
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

  it('returns ok:false when Stripe throws, after inserting PENDING', async () => {
    selectSequence([
      [{ id: 'o1', quote_id: 'q1', status: 'ACTIVE' }],
      [{ total_amount: '1000.0000', currency: 'USD' }],
      [],
    ]);
    const capture: { tx: ReturnType<typeof makePendingTx> | null } = { tx: null };
    oneTxMock(capture);
    mockSessionCreate.mockRejectedValue(new Error('Stripe network error'));

    const result = await createCheckoutSession(params);

    expect(result).toEqual({ ok: false, reason: 'Stripe network error' });
    // First transaction (PENDING insert) must have been called
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    // No second transaction (payment stays PENDING)
  });

  it('returns ok:false when Stripe returns no URL, after inserting PENDING', async () => {
    selectSequence([
      [{ id: 'o1', quote_id: 'q1', status: 'ACTIVE' }],
      [{ total_amount: '1000.0000', currency: 'USD' }],
      [],
    ]);
    oneTxMock();
    mockSessionCreate.mockResolvedValue({ id: 'cs_test', url: null });

    const result = await createCheckoutSession(params);

    expect(result).toEqual({ ok: false, reason: 'Stripe did not return a checkout URL' });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('inserts payment as PENDING in the first transaction', async () => {
    selectSequence([
      [{ id: 'o1', quote_id: 'q1', status: 'ACTIVE' }],
      [{ total_amount: '1500.0000', currency: 'USD' }],
      [],
    ]);
    mockSessionCreate.mockResolvedValue({ id: 'cs_ok', url: 'https://checkout.stripe.com/pay/cs_ok' });
    const captures = { pendingTx: null as ReturnType<typeof makePendingTx> | null, processingTx: null as ReturnType<typeof makeProcessingTx> | null };
    twoTxMock(captures);

    await createCheckoutSession(params);

    expect(captures.pendingTx).not.toBeNull();
    const insertValues = (captures.pendingTx!.insert.mock.results[0]?.value as { values: ReturnType<typeof vi.fn> }).values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PENDING', id: 'pay-uuid' }),
    );
  });

  it('transitions payment to PROCESSING in the second transaction', async () => {
    selectSequence([
      [{ id: 'o1', quote_id: 'q1', status: 'ACTIVE' }],
      [{ total_amount: '1500.0000', currency: 'USD' }],
      [],
    ]);
    mockSessionCreate.mockResolvedValue({ id: 'cs_ok', url: 'https://checkout.stripe.com/pay/cs_ok' });
    const captures = { pendingTx: null as ReturnType<typeof makePendingTx> | null, processingTx: null as ReturnType<typeof makeProcessingTx> | null };
    twoTxMock(captures);

    await createCheckoutSession(params);

    expect(captures.processingTx).not.toBeNull();
    const setFn = (captures.processingTx!.update.mock.results[0]?.value as { set: ReturnType<typeof vi.fn> }).set;
    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PROCESSING', provider_payment_id: 'cs_ok' }),
    );
  });

  it('returns ok:true with checkoutUrl on success', async () => {
    selectSequence([
      [{ id: 'o1', quote_id: 'q1', status: 'ACTIVE' }],
      [{ total_amount: '1500.0000', currency: 'USD' }],
      [],
    ]);
    mockSessionCreate.mockResolvedValue({ id: 'cs_test_123', url: 'https://checkout.stripe.com/pay/cs_test_123' });
    twoTxMock();

    const result = await createCheckoutSession(params);
    expect(result).toEqual({
      ok: true,
      checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_123',
      paymentId: 'pay-uuid',
    });
    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });

  it('passes correct amount in cents to Stripe', async () => {
    selectSequence([
      [{ id: 'o1', quote_id: 'q1', status: 'ACTIVE' }],
      [{ total_amount: '99.99', currency: 'USD' }],
      [],
    ]);
    mockSessionCreate.mockResolvedValue({ id: 'cs_x', url: 'https://checkout.stripe.com/x' });
    twoTxMock();

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
