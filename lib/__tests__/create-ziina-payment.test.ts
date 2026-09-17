import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockDb, mockCreateZiinaPaymentIntent } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    transaction: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  mockCreateZiinaPaymentIntent: vi.fn(),
}));

vi.mock('@/db/index', () => ({ db: mockDb }));
vi.mock('@/lib/ziina', () => ({
  createZiinaPaymentIntent: mockCreateZiinaPaymentIntent,
  AED_TO_FILS: 100,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function selectChain(rows: unknown[]) {
  const terminal = {
    limit: vi.fn().mockResolvedValue(rows),
    orderBy: vi.fn().mockResolvedValue(rows),
  };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    where: vi.fn().mockReturnValue(terminal),
  };
  chain.from.mockReturnValue(chain);
  return chain;
}

function makeTx() {
  return {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
  };
}

import { createZiinaCheckoutSession } from '../portal/create-ziina-payment';

const BASE_PARAMS = {
  orderId: 'order-1',
  organizationId: 'org-1',
  actorId: 'actor-1',
  baseUrl: 'https://drexonyx.com',
};

const ACTIVE_ORDER = [{ id: 'order-1', quote_id: 'quote-1', status: 'ACTIVE' }];
const AED_QUOTE = [{ total_amount: '500.0000', currency: 'AED' }];
const NO_PAID: never[] = [];

describe('createZiinaCheckoutSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });
  });

  it('returns error when order is not found', async () => {
    mockDb.select.mockReturnValueOnce(selectChain([]));
    const result = await createZiinaCheckoutSession(BASE_PARAMS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/not found/i);
  });

  it('returns error when order is not ACTIVE', async () => {
    mockDb.select.mockReturnValueOnce(selectChain([{ id: 'order-1', quote_id: 'q1', status: 'COMPLETED' }]));
    const result = await createZiinaCheckoutSession(BASE_PARAMS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/not active/i);
  });

  it('returns error when quote is not found', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(ACTIVE_ORDER))
      .mockReturnValueOnce(selectChain([]));
    const result = await createZiinaCheckoutSession(BASE_PARAMS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/quote not found/i);
  });

  it('returns error when currency is not AED', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(ACTIVE_ORDER))
      .mockReturnValueOnce(selectChain([{ total_amount: '100.0000', currency: 'USD' }]));
    const result = await createZiinaCheckoutSession(BASE_PARAMS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/AED/);
  });

  it('returns error when amount is below 2 AED (200 fils)', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(ACTIVE_ORDER))
      .mockReturnValueOnce(selectChain([{ total_amount: '1.0000', currency: 'AED' }]));
    const result = await createZiinaCheckoutSession(BASE_PARAMS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/minimum/i);
  });

  it('returns error when order already has a PAID payment', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(ACTIVE_ORDER))
      .mockReturnValueOnce(selectChain(AED_QUOTE))
      .mockReturnValueOnce(selectChain([{ id: 'existing-payment' }]));
    const result = await createZiinaCheckoutSession(BASE_PARAMS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/already has a completed payment/i);
  });

  it('returns error when Ziina API call fails', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(ACTIVE_ORDER))
      .mockReturnValueOnce(selectChain(AED_QUOTE))
      .mockReturnValueOnce(selectChain(NO_PAID));
    mockCreateZiinaPaymentIntent.mockRejectedValue(new Error('Ziina API error 500'));

    const result = await createZiinaCheckoutSession(BASE_PARAMS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Ziina API error 500/);
  });

  it('returns error when Ziina response has no redirect_url', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(ACTIVE_ORDER))
      .mockReturnValueOnce(selectChain(AED_QUOTE))
      .mockReturnValueOnce(selectChain(NO_PAID));
    mockCreateZiinaPaymentIntent.mockResolvedValue({ id: 'z-123', redirect_url: '', status: 'PENDING', amount: 50000 });

    const result = await createZiinaCheckoutSession(BASE_PARAMS);
    expect(result.ok).toBe(false);
  });

  it('converts AED amount to fils correctly (×100)', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(ACTIVE_ORDER))
      .mockReturnValueOnce(selectChain([{ total_amount: '25.5000', currency: 'AED' }]))
      .mockReturnValueOnce(selectChain(NO_PAID));
    mockCreateZiinaPaymentIntent.mockResolvedValue({ id: 'z-123', redirect_url: 'https://pay.ziina.com/z', status: 'PENDING', amount: 2550 });

    await createZiinaCheckoutSession(BASE_PARAMS);

    expect(mockCreateZiinaPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2550 }),
    );
  });

  it('returns ok:true with redirectUrl and paymentId on success', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(ACTIVE_ORDER))
      .mockReturnValueOnce(selectChain(AED_QUOTE))
      .mockReturnValueOnce(selectChain(NO_PAID));
    mockCreateZiinaPaymentIntent.mockResolvedValue({ id: 'z-123', redirect_url: 'https://pay.ziina.com/z', status: 'PENDING', amount: 50000 });

    const result = await createZiinaCheckoutSession(BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectUrl).toBe('https://pay.ziina.com/z');
      expect(result.paymentId).toBeTruthy();
    }
  });

  it('constructs success_url with drex_payment_id (not Ziina ID)', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(ACTIVE_ORDER))
      .mockReturnValueOnce(selectChain(AED_QUOTE))
      .mockReturnValueOnce(selectChain(NO_PAID));
    mockCreateZiinaPaymentIntent.mockResolvedValue({ id: 'z-123', redirect_url: 'https://pay.ziina.com/z', status: 'PENDING', amount: 50000 });

    await createZiinaCheckoutSession(BASE_PARAMS);

    const call = mockCreateZiinaPaymentIntent.mock.calls[0][0];
    expect(call.success_url).toContain('/portal/payments/ziina/success');
    expect(call.success_url).toContain('drex_payment_id=');
    expect(call.cancel_url).toContain('/portal/payments/ziina/cancel');
  });

  it('does not call Ziina API if PAID guard fires', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(ACTIVE_ORDER))
      .mockReturnValueOnce(selectChain(AED_QUOTE))
      .mockReturnValueOnce(selectChain([{ id: 'existing' }]));

    await createZiinaCheckoutSession(BASE_PARAMS);
    expect(mockCreateZiinaPaymentIntent).not.toHaveBeenCalled();
  });
});
