// Phase 11 contract repair: tests for HiggsFieldProvider after evidence-based corrections.
// All external I/O is mocked — no real network or R2 interaction.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockFetch, mockGetObject } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockGetObject: vi.fn(),
}));

vi.stubGlobal('fetch', mockFetch);

vi.mock('@/lib/infrastructure/object-storage', () => ({
  getObject: mockGetObject,
}));

// Import after stubs are in place
import { HiggsFieldProvider } from '../agent/providers/higgsfield';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setEnv(overrides: Record<string, string | undefined> = {}) {
  const base = {
    HIGGSFIELD_API_BASE_URL: 'https://platform.higgsfield.ai',
    HIGGSFIELD_API_KEY_ID: 'test-key-id',
    HIGGSFIELD_API_KEY_SECRET: 'test-key-secret',
    HIGGSFIELD_WEBHOOK_SECRET: 'webhook-secret',
    HIGGSFIELD_WEBHOOK_URL: undefined,
  };
  const merged = { ...base, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function clearEnv() {
  for (const k of ['HIGGSFIELD_API_BASE_URL', 'HIGGSFIELD_API_KEY_ID', 'HIGGSFIELD_API_KEY_SECRET', 'HIGGSFIELD_WEBHOOK_SECRET', 'HIGGSFIELD_WEBHOOK_URL']) {
    delete process.env[k];
  }
}

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const baseDispatchParams = {
  productionJobId: 'job1',
  aiGenerationId: 'gen1',
  organizationId: 'org1',
  provider: 'higgsfield',
  model: 'text2image/soul',
  prompt: 'A sunset',
  params: {},
  fileKey: '',
};

// ─── Authentication ───────────────────────────────────────────────────────────

describe('dispatch — authentication', () => {
  let provider: HiggsFieldProvider;
  beforeEach(() => { vi.clearAllMocks(); setEnv(); provider = new HiggsFieldProvider(); });
  afterEach(() => { clearEnv(); });

  it('sends Authorization: Key {ID}:{SECRET} header', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ request_id: 'hf-001' }));

    await provider.dispatch(baseDispatchParams);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Key test-key-id:test-key-secret');
  });

  it('throws when HIGGSFIELD_API_KEY_ID is missing', async () => {
    setEnv({ HIGGSFIELD_API_KEY_ID: undefined });
    const result = await provider.dispatch(baseDispatchParams);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('HIGGSFIELD_API_KEY_ID');
  });

  it('throws when HIGGSFIELD_API_KEY_SECRET is missing', async () => {
    setEnv({ HIGGSFIELD_API_KEY_SECRET: undefined });
    const result = await provider.dispatch(baseDispatchParams);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('HIGGSFIELD_API_KEY_SECRET');
  });
});

// ─── Model endpoint mapping ───────────────────────────────────────────────────

describe('dispatch — model endpoint mapping', () => {
  let provider: HiggsFieldProvider;
  beforeEach(() => { vi.clearAllMocks(); setEnv(); provider = new HiggsFieldProvider(); });
  afterEach(() => { clearEnv(); });

  it.each([
    ['text2image/soul', '/v1/text2image/soul'],
    ['image2video/dop', '/v1/image2video/dop'],
    ['speak/higgsfield', '/v1/speak/higgsfield'],
  ])('model %s dispatches to %s', async (model, expectedPath) => {
    mockFetch.mockResolvedValue(makeJsonResponse({ request_id: 'hf-001' }));

    await provider.dispatch({ ...baseDispatchParams, model });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain(expectedPath);
    expect(url).not.toContain('/v1/generate/');
  });

  it('fails closed for unknown model', async () => {
    const result = await provider.dispatch({ ...baseDispatchParams, model: 'unknown/model' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.isTransient).toBe(false);
      expect(result.error).toContain('unknown/model');
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ─── Webhook query param ──────────────────────────────────────────────────────

describe('dispatch — webhook URL', () => {
  let provider: HiggsFieldProvider;
  beforeEach(() => { vi.clearAllMocks(); provider = new HiggsFieldProvider(); });
  afterEach(() => { clearEnv(); });

  it('appends ?hf_webhook= when HIGGSFIELD_WEBHOOK_URL is set', async () => {
    setEnv({ HIGGSFIELD_WEBHOOK_URL: 'https://drexonyx.studio/api/webhooks/higgsfield' });
    mockFetch.mockResolvedValue(makeJsonResponse({ request_id: 'hf-001' }));

    await provider.dispatch(baseDispatchParams);

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('?hf_webhook=');
    expect(url).toContain(encodeURIComponent('https://drexonyx.studio/api/webhooks/higgsfield'));
  });

  it('omits hf_webhook when HIGGSFIELD_WEBHOOK_URL is not set', async () => {
    setEnv({ HIGGSFIELD_WEBHOOK_URL: undefined });
    mockFetch.mockResolvedValue(makeJsonResponse({ request_id: 'hf-001' }));

    await provider.dispatch(baseDispatchParams);

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).not.toContain('hf_webhook');
  });
});

// ─── Dispatch — request body ──────────────────────────────────────────────────

describe('dispatch — request body', () => {
  let provider: HiggsFieldProvider;
  beforeEach(() => { vi.clearAllMocks(); setEnv(); provider = new HiggsFieldProvider(); });
  afterEach(() => { clearEnv(); });

  it('includes prompt and spreads genParams without file_key when fileKey is empty', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ request_id: 'hf-001' }));

    await provider.dispatch({ ...baseDispatchParams, params: { aspect_ratio: '16:9' }, fileKey: '' });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.prompt).toBe('A sunset');
    expect(body.aspect_ratio).toBe('16:9');
    expect(body.file_key).toBeUndefined();
    expect(body.image_url).toBeUndefined();
  });

  it('uploads file and sets image_url in body when fileKey is non-empty', async () => {
    mockGetObject.mockResolvedValue(Buffer.from('bytes'));
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ upload_url: 'https://upload.example.com/file', public_url: 'https://cdn.higgsfield.ai/file.mp4' }))
      .mockResolvedValueOnce(new Response('', { status: 200 })) // PUT
      .mockResolvedValueOnce(makeJsonResponse({ request_id: 'hf-001' })); // dispatch

    const result = await provider.dispatch({ ...baseDispatchParams, fileKey: 'higgsfield/org1/asset1/generation' });

    expect(result.ok).toBe(true);
    expect(mockGetObject).toHaveBeenCalledWith('higgsfield/org1/asset1/generation');

    // Third fetch call is the dispatch
    const [, init] = mockFetch.mock.calls[2] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.image_url).toBe('https://cdn.higgsfield.ai/file.mp4');
  });
});

// ─── Dispatch — response parsing ─────────────────────────────────────────────

describe('dispatch — response parsing', () => {
  let provider: HiggsFieldProvider;
  beforeEach(() => { vi.clearAllMocks(); setEnv(); provider = new HiggsFieldProvider(); });
  afterEach(() => { clearEnv(); });

  it('returns ok:true with providerJobId from request_id', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ request_id: 'hf-abc', status_url: 'https://x', cancel_url: 'https://y' }));

    const result = await provider.dispatch(baseDispatchParams);

    expect(result).toEqual({ ok: true, providerJobId: 'hf-abc' });
  });

  it('returns ok:false isTransient:false when request_id is missing', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ status: 'processing' }));

    const result = await provider.dispatch(baseDispatchParams);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(false);
  });

  it('returns ok:false isTransient:true on 5xx', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ error: 'internal error' }, 500));

    const result = await provider.dispatch(baseDispatchParams);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(true);
  });

  it('returns ok:false isTransient:false on 4xx', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ error: 'bad request' }, 400));

    const result = await provider.dispatch(baseDispatchParams);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(false);
  });
});

// ─── Polling ──────────────────────────────────────────────────────────────────

describe('pollJobStatus — status URL', () => {
  let provider: HiggsFieldProvider;
  beforeEach(() => { vi.clearAllMocks(); setEnv(); provider = new HiggsFieldProvider(); });
  afterEach(() => { clearEnv(); });

  it('constructs /requests/{id}/status when no statusUrl provided', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ status: 'processing' }));

    await provider.pollJobStatus({ providerJobId: 'hf-job-999' });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe('https://platform.higgsfield.ai/requests/hf-job-999/status');
  });

  it('uses explicit statusUrl when provided', async () => {
    const statusUrl = 'https://platform.higgsfield.ai/requests/hf-job-999/status?token=abc';
    mockFetch.mockResolvedValue(makeJsonResponse({ status: 'processing' }));

    await provider.pollJobStatus({ providerJobId: 'hf-job-999', statusUrl });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe(statusUrl);
  });

  it('does NOT use /v1/status/ legacy path', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ status: 'processing' }));

    await provider.pollJobStatus({ providerJobId: 'hf-job-123' });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).not.toContain('/v1/status/');
  });
});

describe('pollJobStatus — status handling', () => {
  let provider: HiggsFieldProvider;
  beforeEach(() => { vi.clearAllMocks(); setEnv(); provider = new HiggsFieldProvider(); });
  afterEach(() => { clearEnv(); });

  it('returns SUCCEEDED for "completed"', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ status: 'completed', video: { url: 'https://cdn.higgsfield.ai/out.mp4' } }));

    const result = await provider.pollJobStatus({ providerJobId: 'hf-1' });

    expect(result?.status).toBe('SUCCEEDED');
    expect(result?.resultUrl).toBe('https://cdn.higgsfield.ai/out.mp4');
  });

  it('returns FAILED for "nsfw"', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ status: 'nsfw' }));

    const result = await provider.pollJobStatus({ providerJobId: 'hf-1' });

    expect(result?.status).toBe('FAILED');
    expect(result?.error).toBe('nsfw');
  });

  it('returns FAILED for "failed"', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ status: 'failed', error: 'quota exceeded' }));

    const result = await provider.pollJobStatus({ providerJobId: 'hf-1' });

    expect(result?.status).toBe('FAILED');
  });

  it('returns RUNNING for in-progress status', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ status: 'processing' }));

    const result = await provider.pollJobStatus({ providerJobId: 'hf-1' });

    expect(result?.status).toBe('RUNNING');
  });

  it('does NOT treat "succeeded" as SUCCEEDED (unofficial value removed)', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ status: 'succeeded' }));

    const result = await provider.pollJobStatus({ providerJobId: 'hf-1' });

    // 'succeeded' is not in SUCCEEDED_STATUSES; treated as RUNNING (unknown non-terminal).
    expect(result?.status).toBe('RUNNING');
  });

  it('extracts video.url from status response', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ status: 'completed', video: { url: 'https://cdn.higgsfield.ai/v.mp4' } }));

    const result = await provider.pollJobStatus({ providerJobId: 'hf-1' });

    expect(result?.resultUrl).toBe('https://cdn.higgsfield.ai/v.mp4');
  });

  it('extracts images[0].url from status response', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ status: 'completed', images: [{ url: 'https://cdn.higgsfield.ai/img.jpg' }] }));

    const result = await provider.pollJobStatus({ providerJobId: 'hf-1' });

    expect(result?.resultUrl).toBe('https://cdn.higgsfield.ai/img.jpg');
  });

  it('returns null when response body is not parseable JSON', async () => {
    mockFetch.mockResolvedValue(new Response('not json', { status: 200 }));

    const result = await provider.pollJobStatus({ providerJobId: 'hf-1' });

    expect(result).toBeNull();
  });
});

// ─── Webhook payload parsing ──────────────────────────────────────────────────

describe('parseWebhookPayload', () => {
  let provider: HiggsFieldProvider;
  beforeEach(() => { vi.clearAllMocks(); setEnv(); provider = new HiggsFieldProvider(); });
  afterEach(() => { clearEnv(); });

  it('returns SUCCEEDED with video.url on "completed"', () => {
    const result = provider.parseWebhookPayload({
      request_id: 'hf-wh-1',
      status: 'completed',
      video: { url: 'https://cdn.higgsfield.ai/out.mp4' },
    });

    expect(result?.status).toBe('SUCCEEDED');
    expect(result?.resultUrl).toBe('https://cdn.higgsfield.ai/out.mp4');
    expect(result?.providerJobId).toBe('hf-wh-1');
  });

  it('returns SUCCEEDED with images[0].url on "completed"', () => {
    const result = provider.parseWebhookPayload({
      request_id: 'hf-wh-2',
      status: 'completed',
      images: [{ url: 'https://cdn.higgsfield.ai/img.jpg' }],
    });

    expect(result?.status).toBe('SUCCEEDED');
    expect(result?.resultUrl).toBe('https://cdn.higgsfield.ai/img.jpg');
  });

  it('does NOT use output_url or result_url (V1 fields removed)', () => {
    const result = provider.parseWebhookPayload({
      request_id: 'hf-wh-3',
      status: 'completed',
      output_url: 'https://old-field.example.com/out.mp4',
      result_url: 'https://old-field2.example.com/out.mp4',
    } as Record<string, unknown>);

    // The old fields are not in the V2 output interface; result URL should be undefined.
    expect(result?.status).toBe('SUCCEEDED');
    expect(result?.resultUrl).toBeUndefined();
  });

  it('returns FAILED with isTransient:false for "nsfw"', () => {
    const result = provider.parseWebhookPayload({ request_id: 'hf-wh-4', status: 'nsfw' });

    expect(result?.status).toBe('FAILED');
    expect(result?.isTransient).toBe(false);
    expect(result?.error).toBe('nsfw');
  });

  it('returns FAILED for "failed"', () => {
    const result = provider.parseWebhookPayload({ request_id: 'hf-wh-5', status: 'failed', error: 'quota exceeded' });

    expect(result?.status).toBe('FAILED');
  });

  it('returns null for missing request_id', () => {
    const result = provider.parseWebhookPayload({ status: 'completed' });
    expect(result).toBeNull();
  });

  it('returns null for missing status', () => {
    const result = provider.parseWebhookPayload({ request_id: 'hf-wh-6' });
    expect(result).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(provider.parseWebhookPayload(null)).toBeNull();
    expect(provider.parseWebhookPayload('string')).toBeNull();
  });
});
