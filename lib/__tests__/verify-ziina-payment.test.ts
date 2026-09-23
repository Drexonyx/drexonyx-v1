import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockUpdate, mockTransaction } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate, transaction: mockTransaction },
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-uuid' }));

const mockGetZiinaPaymentIntent = vi.fn();
vi.mock('@/lib/ziina', () => ({
  getZiinaPaymentIntent: (...args: unknown[]) => mockGetZiinaPaymentIntent(...args),
  ZIINA_STATUS_SUCCESS: 'completed',
  ZIINA_STATUS_FAILED: 'failed',
  ZIINA_STATUS_CANCELLED: 'canceled',
}));

const mockWriteLedgerEntry = vi.fn();
vi.mock('@/lib/portal/create-payment', () => ({
  writeLedgerEntry: (...args: unknown[]) => mockWriteLedgerEntry(...args),
}));

const mockCreateProductionJob = vi.fn();
vi.mock('@/lib/admin/production-jobs', () => ({
  createProductionJob: (...args: unknown[]) => mockCreateProductionJob(...args),
}));

const mockCreateManualUploadAsset = vi.fn();
vi.mock('@/lib/admin/manual-upload', () => ({
  createManualUploadAsset: (...args: unknown[]) => mockCreateManualUploadAsset(...args),
}));

const mockRunGenerationDriver = vi.fn();
vi.mock('@/lib/agent/driver', () => ({
  runGenerationDriver: (...args: unknown[]) => mockRunGenerationDriver(...args),
}));

import { verifyZiinaPayment } from '../portal/verify-ziina-payment';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

function makeSelectChain(result: unknown[]) {
  const end = vi.fn().mockResolvedValue(result);
  return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: end };
}

function selectSequence(results: unknown[][]) {
  let call = 0;
  mockSelect.mockImplementation(() => {
    const result = results[call] ?? [];
    call++;
    return makeSelectChain(result);
  });
}

function makeSuccessTransaction() {
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
    const tx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'pay-1' }]) }),
        }),
      }),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
    };
    await fn(tx);
  });
}

const BASE_PAYMENT = {
  id: 'pay-1',
  status: 'PROCESSING',
  amount: '499.0000',
  currency: 'AED',
  order_id: 'order-1',
  provider_payment_id: 'ziina-intent-1',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('verifyZiinaPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns NOT_FOUND when payment does not exist', async () => {
    selectSequence([[]]);
    const result = await verifyZiinaPayment('no-such-id', 'org-1');
    expect(result).toMatchObject({ status: 'NOT_FOUND' });
  });

  it('returns FAILED when payment is already FAILED', async () => {
    selectSequence([[{ ...BASE_PAYMENT, status: 'FAILED' }]]);
    const result = await verifyZiinaPayment('pay-1', 'org-1');
    expect(result).toMatchObject({ status: 'FAILED', paymentId: 'pay-1' });
    expect(mockCreateProductionJob).not.toHaveBeenCalled();
  });

  it('returns ALREADY_PAID and does NOT create duplicate job when job already exists', async () => {
    // payment row, idempotency key result (not used for PAID path), existing job check
    selectSequence([
      [{ ...BASE_PAYMENT, status: 'PAID' }],
      [{ id: 'existing-job-id' }], // existing production job found
    ]);
    const result = await verifyZiinaPayment('pay-1', 'org-1');
    expect(result).toMatchObject({ status: 'ALREADY_PAID', paymentId: 'pay-1' });
    expect(mockCreateProductionJob).not.toHaveBeenCalled();
  });

  it('self-heals ALREADY_PAID with no existing job: creates AI_GENERATION job and dispatches driver', async () => {
    vi.stubEnv('PRODUCTION_AI_PROVIDER', 'higgsfield');
    vi.stubEnv('PRODUCTION_AI_MODEL', 'text2image/soul');
    vi.stubEnv('PRODUCTION_AI_PROMPT', 'test prompt');

    selectSequence([
      [{ ...BASE_PAYMENT, status: 'PAID' }],
      [], // no existing production job
    ]);

    mockCreateProductionJob.mockResolvedValue({ ok: true, jobId: 'new-job-id' });
    mockRunGenerationDriver.mockResolvedValue({ ok: true, providerJobId: 'hf-job-1' });

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result).toMatchObject({ status: 'ALREADY_PAID', paymentId: 'pay-1' });
    expect(mockCreateProductionJob).toHaveBeenCalledOnce();
    expect(mockCreateProductionJob).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        organizationId: 'org-1',
        jobType: 'AI_GENERATION',
        actorId: SYSTEM_ACTOR_ID,
        actorRole: 'OWNER',
        aiGenerationParams: expect.objectContaining({
          provider: 'higgsfield',
          model: 'text2image/soul',
          prompt: 'test prompt',
        }),
      }),
    );
    expect(mockRunGenerationDriver).toHaveBeenCalledOnce();
    expect(mockRunGenerationDriver).toHaveBeenCalledWith({ productionJobId: 'new-job-id', organizationId: 'org-1' });
  });

  it('self-heals ALREADY_PAID with no job: MANUAL_UPLOAD fallback when AI env vars absent', async () => {
    selectSequence([
      [{ ...BASE_PAYMENT, status: 'PAID' }],
      [], // no existing job
    ]);

    mockCreateProductionJob.mockResolvedValue({ ok: true, jobId: 'new-job-id' });
    mockCreateManualUploadAsset.mockResolvedValue({ ok: true });

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result).toMatchObject({ status: 'ALREADY_PAID' });
    expect(mockCreateProductionJob).toHaveBeenCalledWith(
      expect.objectContaining({ jobType: 'MANUAL_UPLOAD', actorId: SYSTEM_ACTOR_ID }),
    );
    expect(mockRunGenerationDriver).not.toHaveBeenCalled();
    expect(mockCreateManualUploadAsset).toHaveBeenCalledOnce();
  });

  it('PROCESSING → PAID: creates AI_GENERATION job with SYSTEM_ACTOR_ID sentinel UUID', async () => {
    vi.stubEnv('PRODUCTION_AI_PROVIDER', 'higgsfield');
    vi.stubEnv('PRODUCTION_AI_MODEL', 'text2image/soul');
    vi.stubEnv('PRODUCTION_AI_PROMPT', 'test prompt');

    // payment (PROCESSING), idempotency key check (empty = not yet processed)
    selectSequence([
      [{ ...BASE_PAYMENT, status: 'PROCESSING' }],
      [], // idempotency key does not exist yet
      [], // no existing production job (inside ensureProductionJobForPaidOrder)
    ]);

    mockGetZiinaPaymentIntent.mockResolvedValue({ status: 'completed' });
    makeSuccessTransaction();
    mockCreateProductionJob.mockResolvedValue({ ok: true, jobId: 'job-id-1' });
    mockRunGenerationDriver.mockResolvedValue({ ok: true, providerJobId: 'hf-job-1' });
    mockWriteLedgerEntry.mockResolvedValue(undefined);

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result).toMatchObject({ status: 'PAID', paymentId: 'pay-1' });

    // Sentinel UUID must be used — NOT the string 'SYSTEM'
    expect(mockCreateProductionJob).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: SYSTEM_ACTOR_ID,
        actorRole: 'OWNER',
        jobType: 'AI_GENERATION',
      }),
    );
    expect(mockRunGenerationDriver).toHaveBeenCalledWith({ productionJobId: 'job-id-1', organizationId: 'org-1' });
  });

  it('PROCESSING → PAID: does NOT create duplicate job if one already exists', async () => {
    vi.stubEnv('PRODUCTION_AI_PROVIDER', 'higgsfield');
    vi.stubEnv('PRODUCTION_AI_MODEL', 'text2image/soul');
    vi.stubEnv('PRODUCTION_AI_PROMPT', 'test prompt');

    selectSequence([
      [{ ...BASE_PAYMENT, status: 'PROCESSING' }],
      [], // idempotency key absent
      [{ id: 'already-exists' }], // existing job found in ensureProductionJobForPaidOrder
    ]);

    mockGetZiinaPaymentIntent.mockResolvedValue({ status: 'completed' });
    makeSuccessTransaction();
    mockWriteLedgerEntry.mockResolvedValue(undefined);

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result).toMatchObject({ status: 'PAID' });
    expect(mockCreateProductionJob).not.toHaveBeenCalled();
    expect(mockRunGenerationDriver).not.toHaveBeenCalled();
  });

  it('PROCESSING → PAID: Ziina returns failed → transitions to FAILED, no job created', async () => {
    selectSequence([
      [{ ...BASE_PAYMENT, status: 'PROCESSING' }],
      [], // idempotency key absent
    ]);

    mockGetZiinaPaymentIntent.mockResolvedValue({ status: 'failed' });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'pay-1' }]) }),
          }),
        }),
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }) }),
      };
      await fn(tx);
    });

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result).toMatchObject({ status: 'FAILED', paymentId: 'pay-1' });
    expect(mockCreateProductionJob).not.toHaveBeenCalled();
  });

  it('createProductionJob failure does not fail the payment response', async () => {
    vi.stubEnv('PRODUCTION_AI_PROVIDER', 'higgsfield');
    vi.stubEnv('PRODUCTION_AI_MODEL', 'text2image/soul');
    vi.stubEnv('PRODUCTION_AI_PROMPT', 'prompt');

    selectSequence([
      [{ ...BASE_PAYMENT, status: 'PROCESSING' }],
      [],
      [], // no existing job
    ]);

    mockGetZiinaPaymentIntent.mockResolvedValue({ status: 'completed' });
    makeSuccessTransaction();
    mockWriteLedgerEntry.mockResolvedValue(undefined);
    mockCreateProductionJob.mockResolvedValue({ ok: false, reason: 'DB error' });

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    // Payment confirmed — must still return PAID even if job creation failed
    expect(result).toMatchObject({ status: 'PAID', paymentId: 'pay-1' });
  });

  it('concurrent duplicate webhook: second call sees ALREADY_PAID and does not create a second job', async () => {
    vi.stubEnv('PRODUCTION_AI_PROVIDER', 'higgsfield');
    vi.stubEnv('PRODUCTION_AI_MODEL', 'text2image/soul');
    vi.stubEnv('PRODUCTION_AI_PROMPT', 'prompt');

    // Second call sees payment already PAID (first call already transitioned it)
    // and sees an existing job (first call already created it)
    selectSequence([
      [{ ...BASE_PAYMENT, status: 'PAID' }], // payment row
      [{ id: 'job-created-by-first-call' }], // existing job in ensureProductionJobForPaidOrder
    ]);

    const result = await verifyZiinaPayment('pay-1', 'org-1');

    expect(result).toMatchObject({ status: 'ALREADY_PAID', paymentId: 'pay-1' });
    expect(mockCreateProductionJob).not.toHaveBeenCalled();
    expect(mockRunGenerationDriver).not.toHaveBeenCalled();
  });
});
