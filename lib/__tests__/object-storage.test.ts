// DR 0081: Cloudflare R2 object-storage abstraction tests.
// All S3 client calls are mocked — no real R2 or AWS interaction.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSend, MockS3Client } = vi.hoisted(() => {
  const mockSend = vi.fn();
  // Must be a regular function (not arrow) so it can be called as a constructor with `new`.
  // eslint-disable-next-line prefer-arrow-callback
  const MockS3Client = vi.fn(function () { return { send: mockSend }; });
  return { mockSend, MockS3Client };
});

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: MockS3Client,
  // Regular function so it can be called with `new`.
  PutObjectCommand: vi.fn(function (params: unknown) { return { _type: 'PutObjectCommand', ...Object(params) }; }),
}));

// Import after mocking
import { putObject } from '../infrastructure/object-storage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setEnv(overrides: Record<string, string | undefined> = {}) {
  const base = {
    R2_ACCOUNT_ID: 'test-account',
    R2_ACCESS_KEY_ID: 'test-key-id',
    R2_SECRET_ACCESS_KEY: 'test-secret',
    R2_BUCKET_NAME: 'drexonyx-assets',
    R2_ENDPOINT: undefined,
  };
  const merged = { ...base, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function clearEnv() {
  for (const key of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_ENDPOINT']) {
    delete process.env[key];
  }
}

// ─── Environment validation ───────────────────────────────────────────────────

describe('putObject — environment validation', () => {
  beforeEach(() => { vi.clearAllMocks(); clearEnv(); });
  afterEach(() => { clearEnv(); });

  it('throws when R2_ACCESS_KEY_ID is missing', async () => {
    setEnv({ R2_ACCESS_KEY_ID: undefined });
    await expect(putObject({ key: 'k', body: Buffer.from('x'), contentType: 'video/mp4' }))
      .rejects.toThrow('R2_ACCESS_KEY_ID');
  });

  it('throws when R2_SECRET_ACCESS_KEY is missing', async () => {
    setEnv({ R2_SECRET_ACCESS_KEY: undefined });
    await expect(putObject({ key: 'k', body: Buffer.from('x'), contentType: 'video/mp4' }))
      .rejects.toThrow('R2_SECRET_ACCESS_KEY');
  });

  it('throws when R2_BUCKET_NAME is missing', async () => {
    setEnv({ R2_BUCKET_NAME: undefined });
    mockSend.mockResolvedValue({});
    await expect(putObject({ key: 'k', body: Buffer.from('x'), contentType: 'video/mp4' }))
      .rejects.toThrow('R2_BUCKET_NAME');
  });

  it('throws when both R2_ACCOUNT_ID and R2_ENDPOINT are missing', async () => {
    setEnv({ R2_ACCOUNT_ID: undefined, R2_ENDPOINT: undefined });
    await expect(putObject({ key: 'k', body: Buffer.from('x'), contentType: 'video/mp4' }))
      .rejects.toThrow();
  });
});

// ─── Successful upload ────────────────────────────────────────────────────────

describe('putObject — successful upload', () => {
  beforeEach(() => { vi.clearAllMocks(); setEnv(); mockSend.mockResolvedValue({}); });
  afterEach(() => { clearEnv(); });

  it('calls S3Client.send with PutObjectCommand for correct key and body', async () => {
    const body = Buffer.from('fake-video-bytes');
    await putObject({ key: 'higgsfield/org1/asset1/generation', body, contentType: 'video/mp4' });

    expect(mockSend).toHaveBeenCalledOnce();
    const cmd = mockSend.mock.calls[0][0] as Record<string, unknown>;
    expect(cmd.Bucket).toBe('drexonyx-assets');
    expect(cmd.Key).toBe('higgsfield/org1/asset1/generation');
    expect(cmd.ContentType).toBe('video/mp4');
    expect(cmd.Body).toBe(body);
  });

  it('includes ContentLength when provided', async () => {
    const body = Buffer.from('bytes');
    await putObject({ key: 'k', body, contentType: 'video/mp4', contentLength: body.length });

    const cmd = mockSend.mock.calls[0][0] as Record<string, unknown>;
    expect(cmd.ContentLength).toBe(body.length);
  });

  it('omits ContentLength when not provided', async () => {
    await putObject({ key: 'k', body: Buffer.from('x'), contentType: 'image/png' });

    const cmd = mockSend.mock.calls[0][0] as Record<string, unknown>;
    expect(cmd.ContentLength).toBeUndefined();
  });

  it('uses R2_ENDPOINT when explicitly set', async () => {
    setEnv({ R2_ENDPOINT: 'https://custom.r2.example.com' });
    await putObject({ key: 'k', body: Buffer.from('x'), contentType: 'video/mp4' });

    const mockCalls = MockS3Client.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const clientConfig = mockCalls[mockCalls.length - 1][0];
    expect(clientConfig.endpoint).toBe('https://custom.r2.example.com');
  });

  it('derives endpoint from R2_ACCOUNT_ID when R2_ENDPOINT is not set', async () => {
    setEnv({ R2_ACCOUNT_ID: 'my-account', R2_ENDPOINT: undefined });
    await putObject({ key: 'k', body: Buffer.from('x'), contentType: 'video/mp4' });

    const mockCalls = MockS3Client.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const clientConfig = mockCalls[mockCalls.length - 1][0];
    expect(clientConfig.endpoint).toBe('https://my-account.r2.cloudflarestorage.com');
  });

  it('strips trailing slash from R2_ENDPOINT', async () => {
    setEnv({ R2_ENDPOINT: 'https://custom.r2.example.com/' });
    await putObject({ key: 'k', body: Buffer.from('x'), contentType: 'video/mp4' });

    const mockCalls = MockS3Client.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const clientConfig = mockCalls[mockCalls.length - 1][0];
    expect((clientConfig.endpoint as string).endsWith('/')).toBe(false);
  });
});

// ─── Upload failure ───────────────────────────────────────────────────────────

describe('putObject — upload failure', () => {
  beforeEach(() => { vi.clearAllMocks(); setEnv(); });
  afterEach(() => { clearEnv(); });

  it('throws when S3 send fails', async () => {
    mockSend.mockRejectedValue(new Error('NoSuchBucket'));

    await expect(putObject({ key: 'k', body: Buffer.from('x'), contentType: 'video/mp4' }))
      .rejects.toThrow('NoSuchBucket');
  });
});

// ─── Key convention ───────────────────────────────────────────────────────────

describe('putObject — canonical key convention (DR 0054)', () => {
  beforeEach(() => { vi.clearAllMocks(); setEnv(); mockSend.mockResolvedValue({}); });
  afterEach(() => { clearEnv(); });

  it('accepts the DR 0054 key format: {provider}/{orgId}/{assetId}/generation', async () => {
    const key = 'higgsfield/org-01jz1234/asset-01jy5678/generation';
    await putObject({ key, body: Buffer.from('x'), contentType: 'video/mp4' });

    const cmd = mockSend.mock.calls[0][0] as Record<string, unknown>;
    expect(cmd.Key).toBe(key);
  });
});
