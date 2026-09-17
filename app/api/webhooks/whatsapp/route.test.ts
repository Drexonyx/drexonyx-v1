// DR 0125: WhatsApp webhook route unit tests.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGetRequest(params: Record<string, string>): NextRequest {
  const url = new URL('https://example.com/api/webhooks/whatsapp');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

function makePostRequest(): NextRequest {
  return new NextRequest('https://example.com/api/webhooks/whatsapp', { method: 'POST' });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/webhooks/whatsapp — Meta verification challenge', () => {
  beforeEach(() => {
    vi.stubEnv('WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'test-verify-token');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns hub.challenge as plain text when token matches', async () => {
    const { GET } = await import('./route');
    const req = makeGetRequest({
      'hub.mode': 'subscribe',
      'hub.challenge': 'abc123',
      'hub.verify_token': 'test-verify-token',
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe('abc123');
    expect(res.headers.get('Content-Type')).toContain('text/plain');
  });

  it('returns 403 when verify token does not match', async () => {
    const { GET } = await import('./route');
    const req = makeGetRequest({
      'hub.mode': 'subscribe',
      'hub.challenge': 'abc123',
      'hub.verify_token': 'wrong-token',
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 when hub.mode is not subscribe', async () => {
    const { GET } = await import('./route');
    const req = makeGetRequest({
      'hub.mode': 'unsubscribe',
      'hub.challenge': 'abc123',
      'hub.verify_token': 'test-verify-token',
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 when hub.challenge is missing', async () => {
    const { GET } = await import('./route');
    const req = makeGetRequest({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'test-verify-token',
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 when WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured', async () => {
    vi.unstubAllEnvs();
    delete process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    const { GET } = await import('./route');
    const req = makeGetRequest({
      'hub.mode': 'subscribe',
      'hub.challenge': 'abc123',
      'hub.verify_token': 'test-verify-token',
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/webhooks/whatsapp — inbound message receiver', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 200 with provider_not_configured when WHATSAPP_APP_SECRET is absent', async () => {
    delete process.env.WHATSAPP_APP_SECRET;
    const { POST } = await import('./route');
    const req = makePostRequest();
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ received: true, status: 'provider_not_configured' });
  });

  it('returns 200 with provider_configured_processing_pending when WHATSAPP_APP_SECRET is set', async () => {
    vi.stubEnv('WHATSAPP_APP_SECRET', 'test-secret-value');
    const { POST } = await import('./route');
    const req = makePostRequest();
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ received: true, status: 'provider_configured_processing_pending' });
  });

  it('never echoes WHATSAPP_APP_SECRET in response body', async () => {
    vi.stubEnv('WHATSAPP_APP_SECRET', 'super-secret-value');
    const { POST } = await import('./route');
    const req = makePostRequest();
    const res = await POST(req);
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain('super-secret-value');
  });
});
