import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockUpdate, mockTransaction, mockWriteLedger } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
  mockWriteLedger: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    transaction: mockTransaction,
  },
}));

vi.mock('@/lib/portal/create-payment', () => ({
  writeLedgerEntry: mockWriteLedger,
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'evt-uuid' }));

import {
  handleCheckoutCompleted,
  handleCheckoutFailed,
  handleChargeRefunded,
  handleChargeDisputed,
} from '../portal/webhook';

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
  mockWriteLedger.mockResolvedValue(undefined);
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
    const tx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) }),
      }),
    };
    await fn(tx);
  });
}

// ─── handleCheckoutCompleted ──────────────────────────────────────────────────

describe('handleCheckoutCompleted', () => {
  beforeEach(() => vi.clearAllMocks());

  const baseEvent = {
    id: 'evt_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_1',
        payment_status: 'paid',
        payment_intent: 'pi_1',
        metadata: { payment_id: 'p1', organization_id: 'org1' },
      },
    },
  } as unknown as import('stripe').default.Event;

  it('returns handled:false when metadata missing', async () => {
    const event = {
      ...baseEvent,
      data: { object: { ...baseEvent.data.object, metadata: {} } },
    } as unknown as import('stripe').default.Event;

    const result = await handleCheckoutCompleted(event);
    expect(result.handled).toBe(false);
  });

  it('returns handled:false when payment_status is not paid', async () => {
    const event = {
      ...baseEvent,
      data: { object: { ...baseEvent.data.object, payment_status: 'unpaid' } },
    } as unknown as import('stripe').default.Event;

    const result = await handleCheckoutCompleted(event);
    expect(result.handled).toBe(false);
  });

  it('returns handled:true when idempotency key already COMPLETED', async () => {
    selectSequence([[{ status: 'COMPLETED' }]]);
    const result = await handleCheckoutCompleted(baseEvent);
    expect(result.handled).toBe(true);
  });

  it('transitions PROCESSING → PAID and writes ledger', async () => {
    selectSequence([
      [], // no idempotency key
      [{ id: 'p1', status: 'PROCESSING', amount: '1000.0000', currency: 'USD', order_id: 'o1' }],
    ]);
    txMock();

    const result = await handleCheckoutCompleted(baseEvent);
    expect(result.handled).toBe(true);
    expect(mockWriteLedger).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ entryType: 'CLIENT_PAYMENT' }),
    );
  });

  it('throws when payment not PROCESSING', async () => {
    selectSequence([
      [],
      [{ id: 'p1', status: 'FAILED', amount: '1000.0000', currency: 'USD', order_id: 'o1' }],
    ]);

    await expect(handleCheckoutCompleted(baseEvent)).rejects.toThrow(
      'Cannot transition payment p1 from FAILED to PAID',
    );
  });

  it('is idempotent: skips transaction when already PAID', async () => {
    selectSequence([
      [],
      [{ id: 'p1', status: 'PAID', amount: '1000.0000', currency: 'USD', order_id: 'o1' }],
    ]);

    const result = await handleCheckoutCompleted(baseEvent);
    expect(result.handled).toBe(true);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

// ─── handleCheckoutFailed ─────────────────────────────────────────────────────

describe('handleCheckoutFailed', () => {
  beforeEach(() => vi.clearAllMocks());

  const expiredEvent = {
    id: 'evt_2',
    type: 'checkout.session.expired',
    data: { object: { metadata: { payment_id: 'p2', organization_id: 'org1' } } },
  } as unknown as import('stripe').default.Event;

  it('transitions PROCESSING → FAILED', async () => {
    selectSequence([[], [{ id: 'p2', status: 'PROCESSING' }]]);
    txMock();

    const result = await handleCheckoutFailed(expiredEvent);
    expect(result.handled).toBe(true);
  });

  it('is idempotent when already FAILED', async () => {
    selectSequence([[], [{ id: 'p2', status: 'FAILED' }]]);

    const result = await handleCheckoutFailed(expiredEvent);
    expect(result.handled).toBe(true);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('sets failure_reason checkout_session_expired for expired event', async () => {
    selectSequence([[], [{ id: 'p2', status: 'PROCESSING' }]]);

    let capturedSet: Record<string, unknown> | null = null;
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        update: vi.fn().mockImplementation(() => ({
          set: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
            capturedSet = vals;
            return { where: vi.fn().mockResolvedValue(undefined) };
          }),
        })),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) }),
        }),
      };
      await fn(tx);
    });

    await handleCheckoutFailed(expiredEvent);
    expect(capturedSet).toMatchObject({ failure_reason: 'checkout_session_expired' });
  });
});

// ─── handleChargeRefunded ─────────────────────────────────────────────────────

describe('handleChargeRefunded', () => {
  beforeEach(() => vi.clearAllMocks());

  const refundEvent = {
    id: 'evt_3',
    type: 'charge.refunded',
    data: {
      object: {
        id: 'ch_1',
        payment_intent: 'pi_1',
        metadata: { payment_id: 'p3', organization_id: 'org1' },
      },
    },
  } as unknown as import('stripe').default.Event;

  it('transitions PAID → REFUNDED and writes PAYMENT_REFUND ledger', async () => {
    selectSequence([
      [],
      [{ id: 'p3', status: 'PAID', amount: '1000.0000', currency: 'USD', order_id: 'o1' }],
    ]);
    txMock();

    const result = await handleChargeRefunded(refundEvent);
    expect(result.handled).toBe(true);
    expect(mockWriteLedger).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ entryType: 'PAYMENT_REFUND' }),
    );
  });

  it('is idempotent when already REFUNDED', async () => {
    selectSequence([
      [],
      [{ id: 'p3', status: 'REFUNDED', amount: '1000.0000', currency: 'USD', order_id: 'o1' }],
    ]);

    const result = await handleChargeRefunded(refundEvent);
    expect(result.handled).toBe(true);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('falls back to payment_intent lookup when metadata missing', async () => {
    const event = {
      ...refundEvent,
      data: { object: { ...refundEvent.data.object, metadata: {} } },
    } as unknown as import('stripe').default.Event;

    selectSequence([
      [{ id: 'p3', organization_id: 'org1', status: 'PAID', amount: '1000.0000', currency: 'USD', order_id: 'o1' }], // found by payment_intent
      [], // no idempotency key
      [{ id: 'p3', status: 'PAID', amount: '1000.0000', currency: 'USD', order_id: 'o1' }], // applyRefund fetch
    ]);
    txMock();

    const result = await handleChargeRefunded(event);
    expect(result.handled).toBe(true);
  });

  it('returns handled:false when no payment found via payment_intent fallback', async () => {
    const event = {
      ...refundEvent,
      data: { object: { ...refundEvent.data.object, metadata: {} } },
    } as unknown as import('stripe').default.Event;

    selectSequence([[]]);

    const result = await handleChargeRefunded(event);
    expect(result.handled).toBe(false);
  });
});

// ─── handleChargeDisputed ─────────────────────────────────────────────────────

describe('handleChargeDisputed', () => {
  beforeEach(() => vi.clearAllMocks());

  const disputeEvent = {
    id: 'evt_4',
    type: 'charge.dispute.created',
    data: { object: { id: 'dp_1', payment_intent: 'pi_2' } },
  } as unknown as import('stripe').default.Event;

  it('returns handled:false when payment_intent missing', async () => {
    const event = {
      ...disputeEvent,
      data: { object: { id: 'dp_1', payment_intent: null } },
    } as unknown as import('stripe').default.Event;

    const result = await handleChargeDisputed(event);
    expect(result.handled).toBe(false);
    expect((result as { reason: string }).reason).toContain('missing payment_intent');
  });

  it('returns handled:false when no payment found', async () => {
    selectSequence([[]]);
    const result = await handleChargeDisputed(disputeEvent);
    expect(result.handled).toBe(false);
  });

  it('transitions PAID → CHARGEBACK and writes PAYMENT_CHARGEBACK ledger', async () => {
    selectSequence([
      [{ id: 'p4', organization_id: 'org1', status: 'PAID', amount: '1000.0000', currency: 'USD', order_id: 'o1' }],
      [], // no idempotency key
    ]);
    txMock();

    const result = await handleChargeDisputed(disputeEvent);
    expect(result.handled).toBe(true);
    expect(mockWriteLedger).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ entryType: 'PAYMENT_CHARGEBACK' }),
    );
  });

  it('is idempotent when already CHARGEBACK', async () => {
    selectSequence([
      [{ id: 'p4', organization_id: 'org1', status: 'CHARGEBACK', amount: '1000.0000', currency: 'USD', order_id: 'o1' }],
      [],
    ]);

    const result = await handleChargeDisputed(disputeEvent);
    expect(result.handled).toBe(true);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
