import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockDb, mockCreateSelfServiceOrder, mockCreateZiinaCheckoutSession, mockRedirect } =
  vi.hoisted(() => ({
    mockDb: { insert: vi.fn(), select: vi.fn(), update: vi.fn() },
    mockCreateSelfServiceOrder: vi.fn(),
    mockCreateZiinaCheckoutSession: vi.fn(),
    mockRedirect: vi.fn(),
  }));

vi.mock('@/db/index', () => ({ db: mockDb }));
vi.mock('@/lib/self-service/create-checkout-order', () => ({
  createSelfServiceOrder: mockCreateSelfServiceOrder,
}));
vi.mock('@/lib/portal/create-ziina-payment', () => ({
  createZiinaCheckoutSession: mockCreateZiinaCheckoutSession,
}));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: (key: string) => {
      if (key === 'host') return 'localhost:3000';
      if (key === 'x-forwarded-proto') return 'https';
      return null;
    },
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

// insert().values().onConflictDoNothing().returning()
function insertConflict(rows: { id: string }[]) {
  return {
    values: vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

// select({...}).from(...).where(...).limit(1)
function selectFromWhere(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

// update(...).set(...).where(...).returning({id})
function updateReturning(rows: { id: string }[]) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

// update(...).set(...).where(...)  (no returning — fire-and-forget)
function updateSimple() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

import { actionInitiateCheckout } from '../../app/checkout/actions';

describe('actionInitiateCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DREXONYX_ORG_ID', 'org-test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ─── Input validation ──────────────────────────────────────────────────────

  it('returns error when DREXONYX_ORG_ID is not set', async () => {
    vi.unstubAllEnvs(); // clears the stubbed value
    const result = await actionInitiateCheckout('pkg-1', 'user@example.com');
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('configuration') });
  });

  it('returns error for empty email', async () => {
    const result = await actionInitiateCheckout('pkg-1', '');
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('valid email') });
  });

  it('returns error for invalid email (no @)', async () => {
    const result = await actionInitiateCheckout('pkg-1', 'notanemail');
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('valid email') });
  });

  it('returns error for invalid email (no TLD)', async () => {
    const result = await actionInitiateCheckout('pkg-1', 'user@domain');
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('valid email') });
  });

  // ─── BLOCKER 1 regression: idempotency on duplicate concurrent submission ──

  it('returns in-progress error when slot is already PENDING (duplicate submission)', async () => {
    // Slot conflict: another request holds the idempotency key in PENDING state.
    // This is the core BLOCKER 1 regression: duplicate concurrent checkout must not
    // create a second order.
    mockDb.insert.mockReturnValueOnce(insertConflict([])); // conflict
    mockDb.select.mockReturnValueOnce(
      selectFromWhere([{ status: 'PENDING', response_payload: null }]),
    );

    const result = await actionInitiateCheckout('pkg-1', 'user@example.com');

    expect(result).toEqual({ ok: false, reason: expect.stringContaining('already in progress') });
    expect(mockCreateSelfServiceOrder).not.toHaveBeenCalled();
  });

  it('reuses in-progress checkout redirect URL when slot is PROCESSING', async () => {
    // An in-progress checkout already has a Ziina redirect URL stored.
    // Duplicate request must redirect to that URL instead of creating a new order.
    const existingRedirectUrl = 'https://pay.ziina.com/existing-session';
    mockDb.insert.mockReturnValueOnce(insertConflict([]));
    mockDb.select.mockReturnValueOnce(
      selectFromWhere([
        { status: 'PROCESSING', response_payload: { redirectUrl: existingRedirectUrl } },
      ]),
    );

    await actionInitiateCheckout('pkg-1', 'user@example.com').catch(() => {});

    expect(mockRedirect).toHaveBeenCalledWith(existingRedirectUrl);
    expect(mockCreateSelfServiceOrder).not.toHaveBeenCalled();
  });

  it('resets FAILED slot and proceeds when concurrent reset wins the race', async () => {
    // Previous checkout failed and this request wins the conditional FAILED→PENDING reset.
    mockDb.insert.mockReturnValueOnce(insertConflict([]));
    mockDb.select.mockReturnValueOnce(
      selectFromWhere([{ status: 'FAILED', response_payload: null }]),
    );
    // FAILED→PENDING reset succeeds (this request won the race)
    mockDb.update
      .mockReturnValueOnce(updateReturning([{ id: 'idem-1' }]))
      // PROCESSING update after successful checkout
      .mockReturnValueOnce(updateSimple());

    mockCreateSelfServiceOrder.mockResolvedValue({ ok: true, orderId: 'order-1' });
    mockCreateZiinaCheckoutSession.mockResolvedValue({
      ok: true,
      redirectUrl: 'https://pay.ziina.com/z',
      paymentId: 'pay-1',
    });

    await actionInitiateCheckout('pkg-1', 'user@example.com').catch(() => {});

    expect(mockCreateSelfServiceOrder).toHaveBeenCalledOnce();
    expect(mockRedirect).toHaveBeenCalledWith('https://pay.ziina.com/z');
  });

  it('returns conflict error when concurrent request wins the FAILED slot reset', async () => {
    // Another concurrent request already reset the FAILED slot — our conditional UPDATE
    // returns 0 rows. We must not proceed; ask user to retry.
    mockDb.insert.mockReturnValueOnce(insertConflict([]));
    mockDb.select.mockReturnValueOnce(
      selectFromWhere([{ status: 'FAILED', response_payload: null }]),
    );
    // FAILED→PENDING reset: returns empty = another request won
    mockDb.update.mockReturnValueOnce(updateReturning([]));

    const result = await actionInitiateCheckout('pkg-1', 'user@example.com');

    expect(result).toEqual({ ok: false, reason: expect.stringContaining('conflict') });
    expect(mockCreateSelfServiceOrder).not.toHaveBeenCalled();
  });

  // ─── Happy path ────────────────────────────────────────────────────────────

  it('creates order, calls Ziina, stores PROCESSING key, and redirects on success', async () => {
    mockDb.insert.mockReturnValueOnce(insertConflict([{ id: 'idem-1' }]));
    mockDb.update.mockReturnValueOnce(updateSimple()); // PROCESSING update
    mockCreateSelfServiceOrder.mockResolvedValue({ ok: true, orderId: 'order-1' });
    mockCreateZiinaCheckoutSession.mockResolvedValue({
      ok: true,
      redirectUrl: 'https://pay.ziina.com/z',
      paymentId: 'pay-1',
    });

    await actionInitiateCheckout('pkg-1', 'user@example.com').catch(() => {});

    expect(mockCreateSelfServiceOrder).toHaveBeenCalledWith(
      expect.objectContaining({ pkgId: 'pkg-1', contactEmail: 'user@example.com' }),
    );
    expect(mockCreateZiinaCheckoutSession).toHaveBeenCalledOnce();
    expect(mockRedirect).toHaveBeenCalledWith('https://pay.ziina.com/z');
  });

  // ─── Stranded PENDING cleanup ──────────────────────────────────────────────

  it('marks idempotency key FAILED when order creation fails', async () => {
    mockDb.insert.mockReturnValueOnce(insertConflict([{ id: 'idem-1' }]));
    mockDb.update.mockReturnValueOnce(updateSimple()); // FAILED update
    mockCreateSelfServiceOrder.mockResolvedValue({ ok: false, reason: 'Package not found' });

    const result = await actionInitiateCheckout('pkg-1', 'user@example.com');

    expect(result).toEqual({ ok: false, reason: 'Package not found' });
    // DB update must be called to mark the key FAILED (prevents permanent PENDING strand)
    expect(mockDb.update).toHaveBeenCalledOnce();
    expect(mockCreateZiinaCheckoutSession).not.toHaveBeenCalled();
  });

  it('marks idempotency key FAILED when Ziina session creation fails', async () => {
    mockDb.insert.mockReturnValueOnce(insertConflict([{ id: 'idem-1' }]));
    mockDb.update.mockReturnValueOnce(updateSimple()); // FAILED update
    mockCreateSelfServiceOrder.mockResolvedValue({ ok: true, orderId: 'order-1' });
    mockCreateZiinaCheckoutSession.mockResolvedValue({ ok: false, reason: 'Ziina unavailable' });

    const result = await actionInitiateCheckout('pkg-1', 'user@example.com');

    expect(result).toEqual({ ok: false, reason: 'Ziina unavailable' });
    expect(mockDb.update).toHaveBeenCalledOnce();
  });
});
