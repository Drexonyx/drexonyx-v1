import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockSelect,
  mockInsert,
  mockUpdate,
  mockTransaction,
  mockSendDeliveryEmail,
  mockGenerateSignedUrl,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
  mockSendDeliveryEmail: vi.fn(),
  mockGenerateSignedUrl: vi.fn(),
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

vi.mock('@/lib/email/delivery', () => ({
  sendDeliveryEmail: mockSendDeliveryEmail,
}));

vi.mock('@/lib/infrastructure/object-storage', () => ({
  generateSignedUrl: mockGenerateSignedUrl,
}));

import {
  createDelivery,
  sendDelivery,
  completeDelivery,
  failDelivery,
  cancelDelivery,
} from '../admin/deliveries';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const terminal = {
    limit: vi.fn().mockResolvedValue(result),
    then: (onFulfilled: (v: unknown[]) => void, onRejected?: (e: unknown) => void) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn().mockReturnValue(terminal),
  };
  chain.from.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  return chain;
}

function selectSequence(results: unknown[][]) {
  let call = 0;
  mockSelect.mockImplementation(() => {
    const result = results[call] ?? [];
    call++;
    return makeSelectChain(result);
  });
}

function makeTx() {
  return {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'del1' }]) }),
      }),
    }),
  };
}

// ─── createDelivery ───────────────────────────────────────────────────────────

describe('createDelivery', () => {
  const base = {
    orderId: 'order1',
    organizationId: 'org1',
    assetIds: ['asset1'],
    actorId: 'actor1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false for QC role', async () => {
    const result = await createDelivery({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('authority') });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns ok:false when assetIds is empty', async () => {
    const result = await createDelivery({ ...base, assetIds: [] });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('least one') });
  });

  it('returns ok:false when order not found', async () => {
    selectSequence([[]]);
    const result = await createDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: 'Order not found' });
  });

  it('returns ok:false when order not ACTIVE (DR 0034)', async () => {
    selectSequence([[{ id: 'order1', status: 'COMPLETED' }]]);
    const result = await createDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('ACTIVE') });
  });

  it('blocks and audits when no approvals exist (DR 0034)', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [], // no approvals
    ]);
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

    const result = await createDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('Approval') });
    expect(mockInsert).toHaveBeenCalled(); // DELIVERY_CREATION_BLOCKED audit
  });

  it('blocks when approvals exist but not all APPROVED (DR 0034)', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [{ id: 'a1', status: 'PENDING' }],
    ]);
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

    const result = await createDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('APPROVED') });
  });

  it('creates delivery when all gates pass', async () => {
    selectSequence([
      [{ id: 'order1', status: 'ACTIVE' }],
      [{ id: 'a1', status: 'APPROVED' }],
      [{ id: 'asset1', order_id: 'order1' }],
    ]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });

    const result = await createDelivery(base);
    expect(result).toMatchObject({ ok: true, deliveryId: 'test-uuid' });
  });
});

// ─── sendDelivery ─────────────────────────────────────────────────────────────

describe('sendDelivery', () => {
  const base = {
    deliveryId: 'del1',
    organizationId: 'org1',
    actorId: 'actor1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false for CREATIVE_PRODUCTION role', async () => {
    const result = await sendDelivery({ ...base, actorRole: 'CREATIVE_PRODUCTION' as never });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:false when delivery not found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const result = await sendDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: 'Delivery not found' });
  });

  it('returns ok:true when delivery already SENDING', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'SENDING' }]));
    const result = await sendDelivery(base);
    expect(result).toMatchObject({ ok: true });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false when delivery is COMPLETED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'COMPLETED' }]));
    const result = await sendDelivery(base);
    expect(result).toMatchObject({ ok: false });
  });

  it('transitions PREPARING→SENDING and writes DELIVERY_SENT audit', async () => {
    let selectCall = 0;
    mockSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([{ id: 'del1', status: 'PREPARING' }]);
      if (selectCall === 2) return makeSelectChain([]); // assetRows — no file_keys
      if (selectCall === 3) return makeSelectChain([]); // orgRows
      return makeSelectChain([]); // memberRows — no recipients
    });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

    const result = await sendDelivery(base);
    expect(result).toMatchObject({ ok: true });
    expect(mockInsert).toHaveBeenCalled(); // DELIVERY_SENT audit
  });

  it('dispatches email when assets have file_keys and CLIENT members exist', async () => {
    let selectCall = 0;
    mockSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([{ id: 'del1', status: 'PREPARING' }]);
      if (selectCall === 2) return makeSelectChain([
        { asset_id: 'asset1', name: 'Hero Video', file_key: 'files/asset1.mp4' },
      ]);
      if (selectCall === 3) return makeSelectChain([{ name: 'Acme Corp' }]);
      return makeSelectChain([{ email: 'client@example.com' }]);
    });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });
    mockGenerateSignedUrl.mockResolvedValue('https://r2.example.com/signed?token=abc');
    mockSendDeliveryEmail.mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

    const result = await sendDelivery(base);
    expect(result).toMatchObject({ ok: true });
    expect(mockSendDeliveryEmail).toHaveBeenCalledOnce();
    const emailArgs = mockSendDeliveryEmail.mock.calls[0][0] as Record<string, unknown>;
    expect(emailArgs.to).toEqual(['client@example.com']);
    expect(emailArgs.organizationName).toBe('Acme Corp');
  });

  it('compensates delivery to PREPARING and returns email_dispatch_failed on email failure', async () => {
    let selectCall = 0;
    mockSelect.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([{ id: 'del1', status: 'PREPARING' }]);
      if (selectCall === 2) return makeSelectChain([
        { asset_id: 'asset1', name: 'Hero Video', file_key: 'files/asset1.mp4' },
      ]);
      if (selectCall === 3) return makeSelectChain([{ name: 'Acme Corp' }]);
      return makeSelectChain([{ email: 'client@example.com' }]);
    });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });
    mockGenerateSignedUrl.mockResolvedValue('https://r2.example.com/signed?token=abc');
    mockSendDeliveryEmail.mockRejectedValue(new Error('Resend error: rate limit'));
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });

    const result = await sendDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: 'email_dispatch_failed' });
    expect(mockUpdate).toHaveBeenCalled(); // compensating update to PREPARING
  });
});

// ─── completeDelivery ─────────────────────────────────────────────────────────

describe('completeDelivery', () => {
  const base = {
    deliveryId: 'del1',
    organizationId: 'org1',
    actorId: 'actor1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false for QC role', async () => {
    const result = await completeDelivery({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:false when delivery not found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const result = await completeDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: 'Delivery not found' });
  });

  it('returns ok:true when delivery already COMPLETED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'COMPLETED' }]));
    const result = await completeDelivery(base);
    expect(result).toMatchObject({ ok: true });
  });

  it('returns ok:false when delivery not in SENDING state', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'PREPARING' }]));
    const result = await completeDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('SENDING') });
  });

  it('returns ok:false when delivery has no assets (DR 0037 §2.4)', async () => {
    selectSequence([
      [{ id: 'del1', status: 'SENDING' }],
      [{ count: 0 }], // count query for assets
    ]);

    const result = await completeDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('no associated assets') });
  });

  it('transitions SENDING→COMPLETED with assets present', async () => {
    selectSequence([
      [{ id: 'del1', status: 'SENDING' }],
      [{ count: 2 }], // count
      [], // idempotency check
    ]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });

    const result = await completeDelivery(base);
    expect(result).toMatchObject({ ok: true });
  });
});

// ─── failDelivery ─────────────────────────────────────────────────────────────

describe('failDelivery', () => {
  const base = {
    deliveryId: 'del1',
    organizationId: 'org1',
    failureReason: 'Network error',
    actorId: 'actor1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false when failureReason is empty', async () => {
    const result = await failDelivery({ ...base, failureReason: '   ' });
    expect(result).toMatchObject({ ok: false, reason: 'failure_reason is required' });
  });

  it('returns ok:false when delivery not in SENDING state', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'PREPARING' }]));
    const result = await failDelivery(base);
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:true when delivery already FAILED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'FAILED' }]));
    const result = await failDelivery(base);
    expect(result).toMatchObject({ ok: true });
  });

  it('transitions SENDING→FAILED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'SENDING' }]));
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });

    const result = await failDelivery(base);
    expect(result).toMatchObject({ ok: true });
  });
});

// ─── cancelDelivery ───────────────────────────────────────────────────────────

describe('cancelDelivery', () => {
  const base = {
    deliveryId: 'del1',
    organizationId: 'org1',
    actorId: 'actor1',
    actorRole: 'OWNER' as const,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok:false for QC role', async () => {
    const result = await cancelDelivery({ ...base, actorRole: 'QC' as never });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns ok:false when delivery not found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const result = await cancelDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: 'Delivery not found' });
  });

  it('returns ok:true when delivery already CANCELLED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'CANCELLED' }]));
    const result = await cancelDelivery(base);
    expect(result).toMatchObject({ ok: true });
  });

  it('returns ok:false when delivery is COMPLETED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'COMPLETED' }]));
    const result = await cancelDelivery(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('terminal') });
  });

  it('returns ok:false when delivery is FAILED', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'FAILED' }]));
    const result = await cancelDelivery(base);
    expect(result).toMatchObject({ ok: false });
  });

  it('cancels a PREPARING delivery', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'PREPARING' }]));
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });

    const result = await cancelDelivery(base);
    expect(result).toMatchObject({ ok: true });
  });

  it('cancels a SENDING delivery', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ id: 'del1', status: 'SENDING' }]));
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });

    const result = await cancelDelivery(base);
    expect(result).toMatchObject({ ok: true });
  });
});
