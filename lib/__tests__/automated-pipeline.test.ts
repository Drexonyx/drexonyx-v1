import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockDb,
  mockCreateRevisionJob,
  mockCreateManualUploadAsset,
  mockCreateDelivery,
  mockSendDelivery,
} = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
  mockCreateRevisionJob: vi.fn(),
  mockCreateManualUploadAsset: vi.fn(),
  mockCreateDelivery: vi.fn(),
  mockSendDelivery: vi.fn(),
}));

vi.mock('@/db/index', () => ({ db: mockDb }));
vi.mock('@/lib/admin/revisions', () => ({ createRevisionJob: mockCreateRevisionJob }));
vi.mock('@/lib/admin/manual-upload', () => ({ createManualUploadAsset: mockCreateManualUploadAsset }));
vi.mock('@/lib/admin/deliveries', () => ({
  createDelivery: mockCreateDelivery,
  sendDelivery: mockSendDelivery,
}));

import {
  performQcChecks,
  runAutomatedQcAndPipeline,
  createAssetApprovalForPipeline,
  onClientApproval,
  MAX_REVISION_COUNT,
} from '../admin/automated-pipeline';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function selectChain(rows: unknown[]) {
  const p = Promise.resolve(rows);
  const terminal = {
    limit: vi.fn().mockResolvedValue(rows),
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    where: vi.fn().mockReturnValue(terminal),
  };
  chain.from.mockReturnValue(chain);
  return chain;
}

function makeTx(updatedRows: { id: string }[] = [{ id: 'asset-1' }]) {
  const returnVal = { returning: vi.fn().mockResolvedValue(updatedRows) };
  const setVal = { where: vi.fn().mockReturnValue(returnVal) };
  const whereOnlyResult = { returning: vi.fn().mockResolvedValue(updatedRows) };
  return {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue(setVal),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
      }),
    }),
    _whereResult: whereOnlyResult,
  };
}

const READY_ASSET_WITH_FILE = {
  id: 'asset-1',
  status: 'READY_FOR_QC',
  order_id: 'order-1',
  archived_at: null,
  file_key: 'uploads/file.pdf',
  file_type: 'application/pdf',
  file_size: 12345,
};

const READY_ASSET_NO_FILE = {
  ...READY_ASSET_WITH_FILE,
  file_key: null,
  file_type: null,
  file_size: null,
};

// ─── performQcChecks ─────────────────────────────────────────────────────────

describe('performQcChecks', () => {
  beforeEach(() => {
    delete process.env.AUTOMATED_QC_REQUIRE_FILE;
  });

  it('passes when file fields are present and asset not archived', () => {
    const result = performQcChecks({
      archived_at: null,
      file_key: 'uploads/file.pdf',
      file_type: 'application/pdf',
      file_size: 1000,
    });
    expect(result.pass).toBe(true);
  });

  it('fails when asset is archived', () => {
    const result = performQcChecks({
      archived_at: new Date(),
      file_key: 'uploads/file.pdf',
      file_type: 'application/pdf',
      file_size: 1000,
    });
    expect(result.pass).toBe(false);
    if (!result.pass) expect(result.reason).toBe('asset_archived');
  });

  it('fails when file_key is missing (default require_file=true)', () => {
    const result = performQcChecks({ archived_at: null, file_key: null, file_type: null, file_size: null });
    expect(result.pass).toBe(false);
    if (!result.pass) expect(result.reason).toBe('missing_file_key');
  });

  it('fails when file_type is missing', () => {
    const result = performQcChecks({ archived_at: null, file_key: 'k', file_type: null, file_size: 100 });
    expect(result.pass).toBe(false);
    if (!result.pass) expect(result.reason).toBe('missing_file_type');
  });

  it('fails when file_size is zero', () => {
    const result = performQcChecks({ archived_at: null, file_key: 'k', file_type: 'image/png', file_size: 0 });
    expect(result.pass).toBe(false);
    if (!result.pass) expect(result.reason).toBe('invalid_file_size');
  });

  it('passes without file when AUTOMATED_QC_REQUIRE_FILE=false', () => {
    process.env.AUTOMATED_QC_REQUIRE_FILE = 'false';
    const result = performQcChecks({ archived_at: null, file_key: null, file_type: null, file_size: null });
    expect(result.pass).toBe(true);
  });
});

// ─── runAutomatedQcAndPipeline ───────────────────────────────────────────────

describe('runAutomatedQcAndPipeline', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.AUTOMATED_QC_REQUIRE_FILE;

    mockDb.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });
    mockCreateRevisionJob.mockResolvedValue({ ok: true, newProductionJobId: 'job-rev-1' });
    mockCreateManualUploadAsset.mockResolvedValue({ ok: true, assetId: 'rev-asset-1' });
    mockCreateDelivery.mockResolvedValue({ ok: true, deliveryId: 'del-1' });
    mockSendDelivery.mockResolvedValue({ ok: true });
  });

  it('returns not found when asset does not exist', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain([])); // asset lookup

    const result = await runAutomatedQcAndPipeline({ assetId: 'asset-1', organizationId: 'org-1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('not found');
  });

  it('returns error when asset is not READY_FOR_QC', async () => {
    mockDb.select.mockReturnValueOnce(selectChain([{ ...READY_ASSET_WITH_FILE, status: 'UPLOADED' }]));

    const result = await runAutomatedQcAndPipeline({ assetId: 'asset-1', organizationId: 'org-1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('READY_FOR_QC');
  });

  it('returns PASS verdict and creates approval when file checks pass', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain([READY_ASSET_WITH_FILE])) // asset
      .mockReturnValueOnce(selectChain([])) // idempotency key check
      .mockReturnValueOnce(selectChain([])); // approval idempotency check

    mockDb.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });
    mockDb.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
    });

    const result = await runAutomatedQcAndPipeline({ assetId: 'asset-1', organizationId: 'org-1' });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.verdict).toBe('PASS');
  });

  it('returns FAIL verdict and creates revision job when file is missing', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain([READY_ASSET_NO_FILE])) // asset
      .mockReturnValueOnce(selectChain([])) // idempotency key check
      .mockReturnValueOnce(selectChain([{ total: 0 }])); // revision count

    mockDb.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });
    mockDb.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
    });

    const result = await runAutomatedQcAndPipeline({ assetId: 'asset-1', organizationId: 'org-1' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.verdict).toBe('FAIL');
      expect(mockCreateRevisionJob).toHaveBeenCalledOnce();
      expect(mockCreateManualUploadAsset).toHaveBeenCalledOnce();
    }
  });

  it('rejects asset and does not create revision when MAX_REVISION_COUNT reached', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain([READY_ASSET_NO_FILE])) // asset
      .mockReturnValueOnce(selectChain([])) // idempotency check
      .mockReturnValueOnce(selectChain([{ total: MAX_REVISION_COUNT }])); // revision count at max

    mockDb.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });
    mockDb.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
    });

    const result = await runAutomatedQcAndPipeline({ assetId: 'asset-1', organizationId: 'org-1' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.verdict).toBe('FAIL');
      if ('exhausted' in result) expect(result.exhausted).toBe(true);
    }
    expect(mockCreateRevisionJob).not.toHaveBeenCalled();
  });

  it('is idempotent: returns cached result when idempotency key is COMPLETED (PASS)', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain([READY_ASSET_WITH_FILE])) // asset
      .mockReturnValueOnce(
        selectChain([{ status: 'COMPLETED', response_payload: { reviewId: 'rev-cached', verdict: 'PASS', approvalId: 'appr-cached' } }]),
      ); // idempotency key already COMPLETED

    const result = await runAutomatedQcAndPipeline({ assetId: 'asset-1', organizationId: 'org-1' });

    expect(result.ok).toBe(true);
    if (result.ok && result.verdict === 'PASS') {
      expect(result.reviewId).toBe('rev-cached');
      expect(result.approvalId).toBe('appr-cached');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('passes QC with no file when AUTOMATED_QC_REQUIRE_FILE=false', async () => {
    process.env.AUTOMATED_QC_REQUIRE_FILE = 'false';

    mockDb.select
      .mockReturnValueOnce(selectChain([READY_ASSET_NO_FILE])) // asset
      .mockReturnValueOnce(selectChain([])) // idempotency check
      .mockReturnValueOnce(selectChain([])); // approval idempotency

    mockDb.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });
    mockDb.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
    });

    const result = await runAutomatedQcAndPipeline({ assetId: 'asset-1', organizationId: 'org-1' });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.verdict).toBe('PASS');
    expect(mockCreateRevisionJob).not.toHaveBeenCalled();
  });
});

// ─── createAssetApprovalForPipeline ──────────────────────────────────────────

describe('createAssetApprovalForPipeline', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockDb.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(makeTx());
    });
  });

  it('creates a PENDING ASSET approval', async () => {
    mockDb.select.mockReturnValueOnce(selectChain([])); // no existing idempotency key

    const result = await createAssetApprovalForPipeline({ assetId: 'asset-1', orderId: 'order-1', organizationId: 'org-1' });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.approvalId).toBeDefined();
    expect(mockDb.transaction).toHaveBeenCalled();
  });

  it('is idempotent: returns cached approvalId when key is COMPLETED', async () => {
    mockDb.select.mockReturnValueOnce(
      selectChain([{ status: 'COMPLETED', response_payload: { approvalId: 'appr-cached' } }]),
    );

    const result = await createAssetApprovalForPipeline({ assetId: 'asset-1', orderId: 'order-1', organizationId: 'org-1' });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.approvalId).toBe('appr-cached');
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });
});

// ─── onClientApproval ────────────────────────────────────────────────────────

describe('onClientApproval', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCreateDelivery.mockResolvedValue({ ok: true, deliveryId: 'del-1' });
    mockSendDelivery.mockResolvedValue({ ok: true });
  });

  it('creates and sends delivery for CLIENT_PREVIEW assets', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain([])) // no existing pipeline delivery key
      .mockReturnValueOnce(selectChain([{ id: 'asset-1' }, { id: 'asset-2' }])); // CLIENT_PREVIEW assets

    mockDb.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
    });

    const result = await onClientApproval({ orderId: 'order-1', organizationId: 'org-1' });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.deliveryId).toBe('del-1');
    expect(mockCreateDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', organizationId: 'org-1', assetIds: ['asset-1', 'asset-2'] }),
    );
    expect(mockSendDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryId: 'del-1', organizationId: 'org-1' }),
    );
  });

  it('returns error when no CLIENT_PREVIEW assets exist', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain([])) // no existing delivery key
      .mockReturnValueOnce(selectChain([])); // no CLIENT_PREVIEW assets

    const result = await onClientApproval({ orderId: 'order-1', organizationId: 'org-1' });

    expect(result.ok).toBe(false);
    expect(mockCreateDelivery).not.toHaveBeenCalled();
  });

  it('is idempotent: returns cached deliveryId when key is COMPLETED', async () => {
    mockDb.select.mockReturnValueOnce(
      selectChain([{ status: 'COMPLETED', response_payload: { deliveryId: 'del-cached' } }]),
    );

    const result = await onClientApproval({ orderId: 'order-1', organizationId: 'org-1' });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.deliveryId).toBe('del-cached');
    expect(mockCreateDelivery).not.toHaveBeenCalled();
  });

  it('returns error when createDelivery returns a gate failure', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain([])) // no existing key
      .mockReturnValueOnce(selectChain([{ id: 'asset-1' }])); // assets present

    mockCreateDelivery.mockResolvedValue({ ok: false, reason: 'Not all Approvals are APPROVED' });

    const result = await onClientApproval({ orderId: 'order-1', organizationId: 'org-1' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('Approvals');
    expect(mockSendDelivery).not.toHaveBeenCalled();
  });

  it('returns ok even when sendDelivery fails (delivery already created)', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain([])) // no existing key
      .mockReturnValueOnce(selectChain([{ id: 'asset-1' }])); // assets

    mockDb.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue([]) }),
    });
    mockSendDelivery.mockResolvedValue({ ok: false, reason: 'email_dispatch_failed' });

    const result = await onClientApproval({ orderId: 'order-1', organizationId: 'org-1' });

    expect(result.ok).toBe(true);
  });
});
