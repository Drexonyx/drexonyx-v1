import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockSelect,
  mockInsert,
  mockUpdate,
  mockTransaction,
  mockSendQuoteNotificationEmail,
  mockRunCostCheck,
  mockRunMarginCheck,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
  mockSendQuoteNotificationEmail: vi.fn(),
  mockRunCostCheck: vi.fn(),
  mockRunMarginCheck: vi.fn(),
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

vi.mock('@/lib/email/quote', () => ({
  sendQuoteNotificationEmail: mockSendQuoteNotificationEmail,
}));

vi.mock('@/lib/admin/cost-check', () => ({
  runCostCheck: mockRunCostCheck,
}));

vi.mock('@/lib/admin/margin-check', () => ({
  runMarginCheck: mockRunMarginCheck,
}));

import { sendQuote } from '../admin/send-quote';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const terminal = {
    limit: vi.fn().mockResolvedValue(result),
    then: (
      onFulfilled: (v: unknown[]) => void,
      onRejected?: (e: unknown) => void,
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
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
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'test-uuid' }]),
        }),
      }),
    }),
  };
}

const PASS_COST_CHECK = {
  state: 'PASS' as const,
  reason: '',
  estimated_cost: '3000.0000',
};

const PASS_MARGIN_CHECK = {
  state: 'PASS' as const,
  reason: '',
  gross_margin_rate: '0.40',
  minimum_acceptable_margin_rate: '0.20',
  target_margin_rate: '0.35',
};

const draftQuote = {
  id: 'test-uuid',
  status: 'DRAFT',
  total_amount: '5000.0000',
  estimated_cost: '3000.0000',
  currency: 'USD',
};

const base = {
  quoteId: 'test-uuid',
  organizationId: 'org1',
  actorId: 'actor1',
  actorRole: 'OWNER' as const,
};

// ─── sendQuote ────────────────────────────────────────────────────────────────

describe('sendQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunCostCheck.mockReturnValue(PASS_COST_CHECK);
    mockRunMarginCheck.mockReturnValue(PASS_MARGIN_CHECK);
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });
    mockSendQuoteNotificationEmail.mockResolvedValue(undefined);
  });

  // ─── Idempotency fast-path ─────────────────────────────────────────────────

  it('returns ok:true immediately when idempotency key is COMPLETED', async () => {
    selectSequence([[{ status: 'COMPLETED' }]]);
    const result = await sendQuote(base);
    expect(result).toMatchObject({ ok: true, quoteId: base.quoteId });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false when idempotency key is PROCESSING', async () => {
    selectSequence([[{ status: 'PROCESSING' }]]);
    const result = await sendQuote(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('in progress') });
  });

  // ─── Quote fetch ───────────────────────────────────────────────────────────

  it('returns ok:false when quote not found', async () => {
    selectSequence([[], []]);
    const result = await sendQuote(base);
    expect(result).toMatchObject({ ok: false, reason: 'Quote not found' });
  });

  it('returns ok:true when quote is already SENT (idempotent)', async () => {
    selectSequence([[], [{ ...draftQuote, status: 'SENT' }]]);
    const result = await sendQuote(base);
    expect(result).toMatchObject({ ok: true, quoteId: base.quoteId });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns ok:false when quote has non-DRAFT/non-SENT status', async () => {
    selectSequence([[], [{ ...draftQuote, status: 'ACCEPTED' }]]);
    const result = await sendQuote(base);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('ACCEPTED') });
  });

  // ─── Business checks ───────────────────────────────────────────────────────

  it('returns ok:false and writes DRAFT_TO_SENT_BLOCKED when cost check fails', async () => {
    selectSequence([
      [],
      [draftQuote],
      [{ minimum_acceptable_margin_rate: '0.20', target_margin_rate: '0.35' }],
    ]);
    mockRunCostCheck.mockReturnValue({
      state: 'NOT_READY',
      reason: 'Estimated cost not set',
      estimated_cost: null,
    });

    const result = await sendQuote(base);
    expect(result).toMatchObject({ ok: false, reason: 'Estimated cost not set' });
    expect(mockInsert).toHaveBeenCalled();
    const insertCall = mockInsert.mock.calls[0];
    expect(insertCall).toBeDefined();
  });

  it('returns ok:false when margin check fails', async () => {
    selectSequence([
      [],
      [draftQuote],
      [{ minimum_acceptable_margin_rate: '0.20', target_margin_rate: '0.35' }],
    ]);
    mockRunMarginCheck.mockReturnValue({
      state: 'FAIL',
      reason: 'Margin below minimum',
      gross_margin_rate: '0.10',
      minimum_acceptable_margin_rate: '0.20',
      target_margin_rate: '0.35',
    });

    const result = await sendQuote(base);
    expect(result).toMatchObject({ ok: false, reason: 'Margin below minimum' });
  });

  // ─── Happy path — notification ─────────────────────────────────────────────

  it('transitions DRAFT→SENT and dispatches notification when CLIENT members exist', async () => {
    selectSequence([
      [], // idempotency
      [draftQuote], // quote
      [{ minimum_acceptable_margin_rate: '0.20', target_margin_rate: '0.35' }], // pricing
      [{ name: 'DREXONYX' }], // org name (Promise.all[0])
      [{ email: 'client@example.com' }], // members (Promise.all[1])
    ]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });

    const result = await sendQuote(base);
    expect(result).toMatchObject({ ok: true, quoteId: base.quoteId });
    expect(mockSendQuoteNotificationEmail).toHaveBeenCalledOnce();
    const emailArgs = mockSendQuoteNotificationEmail.mock.calls[0][0] as Record<string, unknown>;
    expect(emailArgs.to).toEqual(['client@example.com']);
    expect(emailArgs.organizationName).toBe('DREXONYX');
    expect(emailArgs.totalAmount).toBe('5000.0000');
    expect(emailArgs.currency).toBe('USD');
    expect(emailArgs.quoteId).toBe(base.quoteId);
  });

  it('skips email dispatch when no CLIENT members exist', async () => {
    selectSequence([
      [],
      [draftQuote],
      [{ minimum_acceptable_margin_rate: '0.20', target_margin_rate: '0.35' }],
      [{ name: 'DREXONYX' }],
      [], // no members
    ]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });

    const result = await sendQuote(base);
    expect(result).toMatchObject({ ok: true, quoteId: base.quoteId });
    expect(mockSendQuoteNotificationEmail).not.toHaveBeenCalled();
  });

  it('returns ok:true even when notification email dispatch fails (best-effort)', async () => {
    selectSequence([
      [],
      [draftQuote],
      [{ minimum_acceptable_margin_rate: '0.20', target_margin_rate: '0.35' }],
      [{ name: 'DREXONYX' }],
      [{ email: 'client@example.com' }],
    ]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });
    mockSendQuoteNotificationEmail.mockRejectedValue(new Error('Resend error: rate limit'));

    const result = await sendQuote(base);
    expect(result).toMatchObject({ ok: true, quoteId: base.quoteId });
  });

  it('inserts QUOTE_NOTIFICATION_DISPATCHED audit event after successful dispatch', async () => {
    const insertedAudits: Record<string, unknown>[] = [];
    mockInsert.mockImplementation(() => ({
      values: vi.fn().mockImplementation((data: unknown) => {
        const row = data as Record<string, unknown>;
        if ('action' in row) insertedAudits.push(row);
        return Promise.resolve([]);
      }),
    }));

    selectSequence([
      [],
      [draftQuote],
      [{ minimum_acceptable_margin_rate: '0.20', target_margin_rate: '0.35' }],
      [{ name: 'DREXONYX' }],
      [{ email: 'client@example.com' }],
    ]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });

    await sendQuote(base);

    const notificationAudit = insertedAudits.find(
      (a) => a.action === 'QUOTE_NOTIFICATION_DISPATCHED',
    );
    expect(notificationAudit).toBeDefined();
    expect(notificationAudit).toMatchObject({
      organization_id: base.organizationId,
      entity_type: 'quote',
      entity_id: base.quoteId,
      actor_id: base.actorId,
    });
    const payload = notificationAudit?.payload as Record<string, unknown>;
    expect(payload).toMatchObject({
      emailDispatched: true,
      recipientCount: 1,
    });
  });

  it('uses org ID as fallback org name when org row is missing', async () => {
    selectSequence([
      [],
      [draftQuote],
      [{ minimum_acceptable_margin_rate: '0.20', target_margin_rate: '0.35' }],
      [], // org not found
      [{ email: 'client@example.com' }],
    ]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });

    const result = await sendQuote(base);
    expect(result).toMatchObject({ ok: true });
    const emailArgs = mockSendQuoteNotificationEmail.mock.calls[0][0] as Record<string, unknown>;
    expect(emailArgs.organizationName).toBe(base.organizationId);
  });

  // ─── Race condition ────────────────────────────────────────────────────────

  it('returns ok:true when QUOTE_NOT_DRAFT error occurs (concurrent send)', async () => {
    selectSequence([
      [],
      [draftQuote],
      [{ minimum_acceptable_margin_rate: '0.20', target_margin_rate: '0.35' }],
    ]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoNothing: vi.fn().mockResolvedValue([]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]), // empty → QUOTE_NOT_DRAFT
            }),
          }),
        }),
      };
      await fn(tx);
    });

    const result = await sendQuote(base);
    expect(result).toMatchObject({ ok: true, quoteId: base.quoteId });
    // Notification is NOT sent in the race-recovery path
    expect(mockSendQuoteNotificationEmail).not.toHaveBeenCalled();
  });

  // ─── Unexpected DB errors ─────────────────────────────────────────────────

  it('re-throws unexpected transaction errors', async () => {
    selectSequence([
      [],
      [draftQuote],
      [{ minimum_acceptable_margin_rate: '0.20', target_margin_rate: '0.35' }],
    ]);
    mockTransaction.mockImplementation(() => {
      throw new Error('connection timeout');
    });

    await expect(sendQuote(base)).rejects.toThrow('connection timeout');
  });
});
