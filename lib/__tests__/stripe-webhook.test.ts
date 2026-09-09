import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockConstructEvent,
  mockHandleCheckoutCompleted,
  mockHandleCheckoutFailed,
  mockHandleChargeRefunded,
  mockHandleChargeDisputed,
} = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockHandleCheckoutCompleted: vi.fn(),
  mockHandleCheckoutFailed: vi.fn(),
  mockHandleChargeRefunded: vi.fn(),
  mockHandleChargeDisputed: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  STRIPE_WEBHOOK_SECRET_KEY: 'STRIPE_WEBHOOK_SECRET',
  getStripe: vi.fn().mockReturnValue({
    webhooks: { constructEvent: mockConstructEvent },
  }),
}));

vi.mock('@/lib/portal/webhook', () => ({
  handleCheckoutCompleted: mockHandleCheckoutCompleted,
  handleCheckoutFailed: mockHandleCheckoutFailed,
  handleChargeRefunded: mockHandleChargeRefunded,
  handleChargeDisputed: mockHandleChargeDisputed,
}));

import { POST } from '../../app/api/webhooks/stripe/route';
import { NextRequest } from 'next/server';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: string, signature?: string): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers: signature ? { 'stripe-signature': signature } : {},
  });
}

// ─── POST /api/webhooks/stripe ────────────────────────────────────────────────

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/signature/i);
  });

  it('returns 500 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(makeRequest('{}', 'sig=test'));
    expect(res.status).toBe(500);
  });

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature');
    });
    const res = await POST(makeRequest('{}', 'sig=bad'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid signature');
  });

  it('routes checkout.session.completed to handleCheckoutCompleted', async () => {
    const event = { type: 'checkout.session.completed', id: 'evt_1' };
    mockConstructEvent.mockReturnValue(event);
    mockHandleCheckoutCompleted.mockResolvedValue({ handled: true });

    const res = await POST(makeRequest(JSON.stringify(event), 'sig=valid'));
    expect(res.status).toBe(200);
    expect(mockHandleCheckoutCompleted).toHaveBeenCalledWith(event);
    const json = await res.json();
    expect(json).toMatchObject({ received: true, handled: true });
  });

  it('returns handled:false for unknown event types', async () => {
    const event = { type: 'customer.subscription.created', id: 'evt_2' };
    mockConstructEvent.mockReturnValue(event);

    const res = await POST(makeRequest(JSON.stringify(event), 'sig=valid'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ handled: false, eventType: 'customer.subscription.created' });
  });
});
