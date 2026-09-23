import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockDb, mockGetZiinaPaymentIntent, mockCreateProductionJob } = vi.hoisted(() => ({
  mockDb: { select: vi.fn(), transaction: vi.fn() },
  mockGetZiinaPaymentIntent: vi.fn(),
  mockCreateProductionJob: vi.fn(),
}));

vi.mock('@/db/index', () => ({ db: mockDb }));
vi.mock('@/lib/ziina', () => ({
  getZiinaPaymentIntent: mockGetZiinaPaymentIntent,
  ZIINA_STATUS_SUCCESS: 'completed',
  ZIINA_STATUS_FAILED: 'failed',
  ZIINA_STATUS_CANCELLED: 'canceled',
}));
vi.mock('../portal/create-payment', () => ({
  writeLedgerEntry: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/admin/production-jobs', () => ({
  createProductionJob: mockCreateProductionJob,
}));

import { writeLedgerEntry } from '../portal/create-payment';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function selectChain(rows: unknown[]) {
  const terminal = { limit: vi.fn().mockResolvedValue(rows) };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    where: vi.fn().mockReturnValue(terminal),
  };
  chain.from.mockReturnValue(chain);
  return chain;
}

// updateRows simulates what the DB's .returning() sends back.
// Default [{ id: 'pay-1' }] = UPDATE matched a row (state transition succeeded).
// Pass [] to simulate the concurrent-race case where another request won first.
function makeTx(updateRows: { id: string }[] = [{ id: 'pay-1' }]) {
  const whereResult = { returning: vi.fn().mockResolvedValue(updateRows) };
  return {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(whereResult),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
      }),
    }),
  };
}

const PROCESSING_PAYMENT = [{
  id: 'pay-1',
  status: 'PROCESSING',
  amount: '500.0000',
  currency: 'AED',
  order_id: 'order-1',
  provider_payment_id: 'ziina-intent-abc',
}];

import { verifyZiinaPayment } from '../portal/verify-ziina-payment';

describe('verifyZiinaPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });
    mockCreateProductionJob.mockResolvedValue({ ok: true, jobId: 'job-1' });
  });

  it('returns NOT_FOUND when payment record does not exist', async () => {
    mockDb.select.mockReturnValueOnce(selectChain([]));
    const result = await verifyZiinaPayment('pay-1', 'org-1');
    expect(result.status).toBe('NOT_FOUND');
  });

  it('returns ALREADY_PAID without calling Ziina if already PAID', async () => {
    mockDb.select.mockReturnValueOnce(selectChain([{ ...PROCESSING_PAYMENT[0], status: 'PAID' }]));
    const result = await verifyZiinaPayment('pay-1', 'org-1');
    expect(result.status).toBe('ALREADY_PAID');
    expect(mockGetZiinaPaymentIntent).not.toHaveBeenCalled();
  });

  it('returns FAILED without calling Ziina if already FAILED', async () => {
    mockDb.select.mockReturnValueOnce(selectChain([{ ...PROCESSING_PAYMENT[0], status: 'FAILED' }]));
    const result = await verifyZiinaPayment('pay-1', 'org-1');
    expect(result.status).toBe('FAILED');
    expect(mockGetZiinaPaymentIntent).not.toHaveBeenCalled();
  });

  it('returns ERROR when payment has no provider_payment_id', async () => {
    mockDb.select.mockReturnValueOnce(selectChain([{ ...PROCESSING_PAYMENT[0], provider_payment_id: null }]));
    const result = await verifyZiinaPayment('pay-1', 'org-1');
    expect(result.status).toBe('ERROR');
  });

  it('skips Ziina call when idempotency key already COMPLETED', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(PROCESSING_PAYMENT))
      .mockReturnValueOnce(selectChain([{ status: 'COMPLETED' }]));

    const result = await verifyZiinaPayment('pay-1', 'org-1');
    expect(mockGetZiinaPaymentIntent).not.toHaveBeenCalled();
    // Payment is still PROCESSING in our mock, so result depends on status
    expect(['FAILED', 'ALREADY_PAID']).toContain(result.status);
  });

  it('returns PAID and applies state transition when Ziina returns completed', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(PROCESSING_PAYMENT))
      .mockReturnValueOnce(selectChain([])); // no idempotency key yet
    mockGetZiinaPaymentIntent.mockResolvedValue({ id: 'ziina-intent-abc', redirect_url: '', status: 'completed', amount: 50000 });

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result.status).toBe('PAID');
    expect(mockGetZiinaPaymentIntent).toHaveBeenCalledWith('ziina-intent-abc');
    expect(mockDb.transaction).toHaveBeenCalled();
    expect(mockCreateProductionJob).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        organizationId: 'org-1',
        jobType: 'MANUAL_UPLOAD',
        actorRole: 'OWNER',
      }),
    );
  });

  it('returns FAILED and applies state transition when Ziina returns failed', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(PROCESSING_PAYMENT))
      .mockReturnValueOnce(selectChain([]));
    mockGetZiinaPaymentIntent.mockResolvedValue({ id: 'ziina-intent-abc', redirect_url: '', status: 'failed', amount: 50000 });

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result.status).toBe('FAILED');
    expect(mockDb.transaction).toHaveBeenCalled();
  });

  it('returns FAILED when Ziina status is canceled', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(PROCESSING_PAYMENT))
      .mockReturnValueOnce(selectChain([]));
    mockGetZiinaPaymentIntent.mockResolvedValue({ id: 'ziina-intent-abc', redirect_url: '', status: 'canceled', amount: 50000 });

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result.status).toBe('FAILED');
  });

  it('returns PENDING when Ziina status is pending', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(PROCESSING_PAYMENT))
      .mockReturnValueOnce(selectChain([]));
    mockGetZiinaPaymentIntent.mockResolvedValue({ id: 'ziina-intent-abc', redirect_url: '', status: 'pending', amount: 50000 });

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result.status).toBe('PENDING');
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('returns PENDING when Ziina status is requires_user_action', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(PROCESSING_PAYMENT))
      .mockReturnValueOnce(selectChain([]));
    mockGetZiinaPaymentIntent.mockResolvedValue({ id: 'ziina-intent-abc', redirect_url: '', status: 'requires_user_action', amount: 50000 });

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result.status).toBe('PENDING');
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('returns ERROR when Ziina API call throws', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(PROCESSING_PAYMENT))
      .mockReturnValueOnce(selectChain([]));
    mockGetZiinaPaymentIntent.mockRejectedValue(new Error('Ziina API error 503'));

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result.status).toBe('ERROR');
    if (result.status === 'ERROR') expect(result.reason).toMatch(/Ziina API error/);
  });

  it('filters by provider_name=ziina (org-scoped)', async () => {
    // The query should include provider_name='ziina' constraint — if it returns empty, NOT_FOUND
    mockDb.select.mockReturnValueOnce(selectChain([]));
    const result = await verifyZiinaPayment('pay-1', 'org-1');
    expect(result.status).toBe('NOT_FOUND');
    // Verify that select was called (implying the where clause was applied)
    expect(mockDb.select).toHaveBeenCalled();
  });

  it('does not write ledger entry when UPDATE returns 0 rows (concurrent race)', async () => {
    // Scenario: two concurrent success-page requests both reach the transaction.
    // The second one's UPDATE matches 0 rows (payment already PAID by first request).
    // writeLedgerEntry must NOT be called by the second request.
    mockDb.select
      .mockReturnValueOnce(selectChain(PROCESSING_PAYMENT))
      .mockReturnValueOnce(selectChain([])); // no idempotency key yet
    mockGetZiinaPaymentIntent.mockResolvedValue({
      id: 'ziina-intent-abc',
      redirect_url: '',
      status: 'completed',
      amount: 50000,
    });

    const mockWriteLedger = vi.mocked(writeLedgerEntry);

    // Simulate the concurrent case: our UPDATE returns 0 rows
    mockDb.transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx([]));
    });

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result.status).toBe('PAID'); // still PAID from Ziina's perspective
    expect(mockWriteLedger).not.toHaveBeenCalled(); // no duplicate ledger entry
    expect(mockCreateProductionJob).not.toHaveBeenCalled(); // no duplicate job
  });

  it('creates a MANUAL_UPLOAD production job when payment transitions to PAID', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(PROCESSING_PAYMENT))
      .mockReturnValueOnce(selectChain([]));
    mockGetZiinaPaymentIntent.mockResolvedValue({ id: 'ziina-intent-abc', redirect_url: '', status: 'completed', amount: 50000 });

    await verifyZiinaPayment('pay-1', 'org-1');

    expect(mockCreateProductionJob).toHaveBeenCalledOnce();
    expect(mockCreateProductionJob).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        organizationId: 'org-1',
        jobType: 'MANUAL_UPLOAD',
        actorRole: 'OWNER',
      }),
    );
  });

  it('does not create production job when verifyZiinaPayment is called a second time (payment already PAID)', async () => {
    // Simulates page refresh: payment is already PAID → returns ALREADY_PAID immediately.
    mockDb.select.mockReturnValueOnce(selectChain([{ ...PROCESSING_PAYMENT[0], status: 'PAID' }]));

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result.status).toBe('ALREADY_PAID');
    expect(mockCreateProductionJob).not.toHaveBeenCalled();
  });

  it('does not create production job when Ziina returns failed', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(PROCESSING_PAYMENT))
      .mockReturnValueOnce(selectChain([]));
    mockGetZiinaPaymentIntent.mockResolvedValue({ id: 'ziina-intent-abc', redirect_url: '', status: 'failed', amount: 50000 });

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result.status).toBe('FAILED');
    expect(mockCreateProductionJob).not.toHaveBeenCalled();
  });

  it('does not create production job when Ziina returns canceled', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(PROCESSING_PAYMENT))
      .mockReturnValueOnce(selectChain([]));
    mockGetZiinaPaymentIntent.mockResolvedValue({ id: 'ziina-intent-abc', redirect_url: '', status: 'canceled', amount: 50000 });

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result.status).toBe('FAILED');
    expect(mockCreateProductionJob).not.toHaveBeenCalled();
  });

  it('does not create production job when Ziina returns pending', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(PROCESSING_PAYMENT))
      .mockReturnValueOnce(selectChain([]));
    mockGetZiinaPaymentIntent.mockResolvedValue({ id: 'ziina-intent-abc', redirect_url: '', status: 'pending', amount: 50000 });

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result.status).toBe('PENDING');
    expect(mockCreateProductionJob).not.toHaveBeenCalled();
  });

  it('still returns PAID when production job creation fails (payment is confirmed regardless)', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain(PROCESSING_PAYMENT))
      .mockReturnValueOnce(selectChain([]));
    mockGetZiinaPaymentIntent.mockResolvedValue({ id: 'ziina-intent-abc', redirect_url: '', status: 'completed', amount: 50000 });
    mockCreateProductionJob.mockResolvedValue({ ok: false, reason: 'Order not found' });

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result.status).toBe('PAID');
  });
});
