import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockDb, mockCreateCreditPurchaseCheckout, mockRedirect } = vi.hoisted(() => ({
  mockDb: { insert: vi.fn(), select: vi.fn(), update: vi.fn() },
  mockCreateCreditPurchaseCheckout: vi.fn(),
  mockRedirect: vi.fn(),
}));

vi.mock('@/db/index', () => ({ db: mockDb }));
vi.mock('@/lib/credits/create-credit-purchase', () => ({
  createCreditPurchaseCheckout: mockCreateCreditPurchaseCheckout,
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
vi.mock('uuidv7', () => ({ uuidv7: () => 'test-uuid-0000' }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function insertConflict(rows: { id: string }[]) {
  return {
    values: vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

function selectFromWhere(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

function updateReturning(rows: { id: string }[]) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

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

  // ─── Config guard ──────────────────────────────────────────────────────────

  it('returns error when DREXONYX_ORG_ID is not set', async () => {
    vi.unstubAllEnvs();
    const result = await actionInitiateCheckout('pkg-1');
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('configuration') });
  });

  // ─── Idempotency: slot already held ───────────────────────────────────────

  it('returns in-progress error when slot is already PENDING', async () => {
    mockDb.insert.mockReturnValueOnce(insertConflict([]));
    mockDb.select.mockReturnValueOnce(
      selectFromWhere([{ status: 'PENDING', response_payload: null }]),
    );

    const result = await actionInitiateCheckout('pkg-1');

    expect(result).toEqual({ ok: false, reason: expect.stringContaining('already in progress') });
    expect(mockCreateCreditPurchaseCheckout).not.toHaveBeenCalled();
  });

  it('reuses in-progress redirect URL when slot is PROCESSING with stored URL', async () => {
    const existingUrl = 'https://pay.ziina.com/existing-session';
    mockDb.insert.mockReturnValueOnce(insertConflict([]));
    mockDb.select.mockReturnValueOnce(
      selectFromWhere([{ status: 'PROCESSING', response_payload: { redirectUrl: existingUrl } }]),
    );

    await actionInitiateCheckout('pkg-1').catch(() => {});

    expect(mockRedirect).toHaveBeenCalledWith(existingUrl);
    expect(mockCreateCreditPurchaseCheckout).not.toHaveBeenCalled();
  });

  it('resets FAILED slot and proceeds when concurrent reset wins the race', async () => {
    mockDb.insert.mockReturnValueOnce(insertConflict([]));
    mockDb.select.mockReturnValueOnce(
      selectFromWhere([{ status: 'FAILED', response_payload: null }]),
    );
    mockDb.update
      .mockReturnValueOnce(updateReturning([{ id: 'idem-1' }]))
      .mockReturnValueOnce(updateSimple());

    mockCreateCreditPurchaseCheckout.mockResolvedValue({
      ok: true,
      creditPurchaseId: 'cp-1',
      redirectUrl: 'https://pay.ziina.com/z',
    });

    await actionInitiateCheckout('pkg-1').catch(() => {});

    expect(mockCreateCreditPurchaseCheckout).toHaveBeenCalledOnce();
    expect(mockRedirect).toHaveBeenCalledWith('https://pay.ziina.com/z');
  });

  it('returns conflict error when concurrent request wins the FAILED slot reset', async () => {
    mockDb.insert.mockReturnValueOnce(insertConflict([]));
    mockDb.select.mockReturnValueOnce(
      selectFromWhere([{ status: 'FAILED', response_payload: null }]),
    );
    mockDb.update.mockReturnValueOnce(updateReturning([]));

    const result = await actionInitiateCheckout('pkg-1');

    expect(result).toEqual({ ok: false, reason: expect.stringContaining('conflict') });
    expect(mockCreateCreditPurchaseCheckout).not.toHaveBeenCalled();
  });

  // ─── Happy path ────────────────────────────────────────────────────────────

  it('calls createCreditPurchaseCheckout, stores PROCESSING key, and redirects on success', async () => {
    mockDb.insert.mockReturnValueOnce(insertConflict([{ id: 'idem-1' }]));
    mockDb.update.mockReturnValueOnce(updateSimple()); // PROCESSING update

    mockCreateCreditPurchaseCheckout.mockResolvedValue({
      ok: true,
      creditPurchaseId: 'cp-1',
      redirectUrl: 'https://pay.ziina.com/z',
    });

    await actionInitiateCheckout('pkg-1').catch(() => {});

    expect(mockCreateCreditPurchaseCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        creditPackageId: 'pkg-1',
        organizationId: 'org-test',
        actorId: null,
      }),
    );
    expect(mockRedirect).toHaveBeenCalledWith('https://pay.ziina.com/z');
  });

  // ─── Failure cleanup ───────────────────────────────────────────────────────

  it('marks idempotency key FAILED when credit purchase checkout fails', async () => {
    mockDb.insert.mockReturnValueOnce(insertConflict([{ id: 'idem-1' }]));
    mockDb.update.mockReturnValueOnce(updateSimple()); // FAILED update
    mockCreateCreditPurchaseCheckout.mockResolvedValue({ ok: false, reason: 'Package not found' });

    const result = await actionInitiateCheckout('pkg-1');

    expect(result).toEqual({ ok: false, reason: 'Package not found' });
    expect(mockDb.update).toHaveBeenCalledOnce();
  });

  it('marks idempotency key FAILED when Ziina is unavailable', async () => {
    mockDb.insert.mockReturnValueOnce(insertConflict([{ id: 'idem-1' }]));
    mockDb.update.mockReturnValueOnce(updateSimple()); // FAILED update
    mockCreateCreditPurchaseCheckout.mockResolvedValue({ ok: false, reason: 'Ziina unavailable' });

    const result = await actionInitiateCheckout('pkg-1');

    expect(result).toEqual({ ok: false, reason: 'Ziina unavailable' });
    expect(mockDb.update).toHaveBeenCalledOnce();
  });
});
