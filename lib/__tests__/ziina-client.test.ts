import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Tests for lib/ziina.ts — mocks global fetch.
// ZIINA_API_KEY env var is set for tests; value is never printed.

const TEST_API_KEY = 'test-ziina-key-placeholder';
const TEST_BASE_URL = 'https://api-v2.ziina.com/api';

beforeEach(() => {
  process.env.ZIINA_API_KEY = TEST_API_KEY;
  process.env.ZIINA_BASE_URL = TEST_BASE_URL;
  process.env.ZIINA_TEST_MODE = 'true';
});

afterEach(() => {
  delete process.env.ZIINA_API_KEY;
  delete process.env.ZIINA_BASE_URL;
  delete process.env.ZIINA_TEST_MODE;
  vi.restoreAllMocks();
});

import { createZiinaPaymentIntent, getZiinaPaymentIntent, AED_TO_FILS, ZIINA_BASE_URL } from '../ziina';

describe('AED_TO_FILS constant', () => {
  it('is 100 (1 AED = 100 fils)', () => {
    expect(AED_TO_FILS).toBe(100);
  });
});

describe('ZIINA_BASE_URL constant', () => {
  it('defaults to the official Ziina v2 API when ZIINA_BASE_URL env var is not set', () => {
    // Module is loaded before beforeEach sets ZIINA_BASE_URL; this tests the frozen default.
    expect(ZIINA_BASE_URL).toBe('https://api-v2.ziina.com/api');
  });
});

describe('createZiinaPaymentIntent', () => {
  it('throws if ZIINA_API_KEY is not set', async () => {
    delete process.env.ZIINA_API_KEY;
    await expect(
      createZiinaPaymentIntent({ amount: 500, success_url: 'https://x.com/s', cancel_url: 'https://x.com/c' }),
    ).rejects.toThrow('ZIINA_API_KEY');
  });

  it('sends POST /payment_intent with Authorization header and correct body', async () => {
    const mockResponse = { id: 'ziina-123', redirect_url: 'https://pay.ziina.com/123', status: 'PENDING', amount: 500 };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    await createZiinaPaymentIntent({ amount: 500, success_url: 'https://x.com/s', cancel_url: 'https://x.com/c' });

    expect(fetchSpy).toHaveBeenCalledWith(
      `${TEST_BASE_URL}/payment_intent`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        }),
      }),
    );

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.amount).toBe(500);
    expect(body.success_url).toBe('https://x.com/s');
    expect(body.cancel_url).toBe('https://x.com/c');
    expect(body.test).toBe(true);
  });

  it('returns the response from the Ziina API', async () => {
    const mockResponse = { id: 'ziina-abc', redirect_url: 'https://pay.ziina.com/abc', status: 'PENDING', amount: 1000 };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const result = await createZiinaPaymentIntent({ amount: 1000, success_url: 'https://x.com/s', cancel_url: 'https://x.com/c' });

    expect(result.id).toBe('ziina-abc');
    expect(result.redirect_url).toBe('https://pay.ziina.com/abc');
  });

  it('throws on non-2xx response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"error":"invalid amount"}', { status: 400 }),
    );

    await expect(
      createZiinaPaymentIntent({ amount: 100, success_url: 'https://x.com/s', cancel_url: 'https://x.com/c' }),
    ).rejects.toThrow('Ziina API error 400');
  });

  it('sends currency_code: "AED" in the request body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'x', redirect_url: 'https://y', status: 'PENDING', amount: 500 }), { status: 200 }),
    );

    await createZiinaPaymentIntent({ amount: 500, success_url: 'https://x.com/s', cancel_url: 'https://x.com/c' });

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.currency_code).toBe('AED');
  });

  it('includes test=true when ZIINA_TEST_MODE is true', async () => {
    process.env.ZIINA_TEST_MODE = 'true';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'x', redirect_url: 'https://y', status: 'PENDING', amount: 200 }), { status: 200 }),
    );

    await createZiinaPaymentIntent({ amount: 200, success_url: 'https://x.com/s', cancel_url: 'https://x.com/c' });

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.test).toBe(true);
  });

  it('sets test=false when ZIINA_TEST_MODE is false', async () => {
    process.env.ZIINA_TEST_MODE = 'false';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'x', redirect_url: 'https://y', status: 'PENDING', amount: 200 }), { status: 200 }),
    );

    await createZiinaPaymentIntent({ amount: 200, success_url: 'https://x.com/s', cancel_url: 'https://x.com/c' });

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.test).toBe(false);
  });

  it('throws a descriptive network error when the connection to Ziina fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));

    await expect(
      createZiinaPaymentIntent({ amount: 500, success_url: 'https://x.com/s', cancel_url: 'https://x.com/c' }),
    ).rejects.toThrow('Ziina network error (POST /payment_intent): fetch failed');
  });
});

describe('getZiinaPaymentIntent', () => {
  it('throws if ZIINA_API_KEY is not set', async () => {
    delete process.env.ZIINA_API_KEY;
    await expect(getZiinaPaymentIntent('ziina-123')).rejects.toThrow('ZIINA_API_KEY');
  });

  it('sends GET /payment_intent/{id} with Authorization header', async () => {
    const mockResponse = { id: 'ziina-123', redirect_url: 'https://pay.ziina.com/123', status: 'SUCCESS', amount: 500 };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    await getZiinaPaymentIntent('ziina-123');

    expect(fetchSpy).toHaveBeenCalledWith(
      `${TEST_BASE_URL}/payment_intent/ziina-123`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: `Bearer ${TEST_API_KEY}`,
        }),
      }),
    );
  });

  it('returns payment intent status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'ziina-123', redirect_url: '', status: 'SUCCESS', amount: 500 }), { status: 200 }),
    );

    const result = await getZiinaPaymentIntent('ziina-123');
    expect(result.status).toBe('SUCCESS');
    expect(result.id).toBe('ziina-123');
  });

  it('throws on non-2xx response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not found', { status: 404 }),
    );

    await expect(getZiinaPaymentIntent('missing')).rejects.toThrow('Ziina API error 404');
  });

  it('URL-encodes the payment intent ID', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'id/with/slash', redirect_url: '', status: 'PENDING', amount: 0 }), { status: 200 }),
    );

    await getZiinaPaymentIntent('id/with/slash');

    expect((fetchSpy.mock.calls[0][0] as string)).toContain('id%2Fwith%2Fslash');
  });

  it('throws a descriptive network error when the connection to Ziina fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));

    await expect(getZiinaPaymentIntent('ziina-123')).rejects.toThrow(
      'Ziina network error (GET /payment_intent/ziina-123): fetch failed',
    );
  });
});
