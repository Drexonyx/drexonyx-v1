import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock('resend', () => ({
  // Must use a regular function (not arrow) so `new Resend()` works as a constructor.
  Resend: vi.fn().mockImplementation(function () {
    return { emails: { send: mockSend } };
  }),
}));

import { sendDeliveryEmail } from '../email/delivery';

// ─── Test fixtures ────────────────────────────────────────────────────────────

const base = {
  to: ['client@example.com'],
  deliveryId: 'delivery-uuid-1234-5678',
  organizationName: 'Acme Corp',
  assetLinks: [
    {
      assetId: 'asset1',
      assetName: 'Hero Video',
      url: 'https://r2.example.com/signed-url?token=abc',
      expiresAt: '2026-09-16T00:00:00.000Z',
    },
  ],
};

// ─── sendDeliveryEmail ────────────────────────────────────────────────────────

describe('sendDeliveryEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.RESEND_FROM_ADDRESS = 'noreply@drexonyx.studio';
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_ADDRESS;
  });

  it('resolves without throwing on success', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });
    await expect(sendDeliveryEmail(base)).resolves.toBeUndefined();
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('throws when Resend returns an error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'Domain not verified' } });
    await expect(sendDeliveryEmail(base)).rejects.toThrow('Resend error: Domain not verified');
  });

  it('sends email to specified addresses with asset URL and name in html body', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });
    await sendDeliveryEmail(base);

    const call = mockSend.mock.calls[0][0] as Record<string, unknown>;
    expect(call.to).toEqual(['client@example.com']);
    expect(call.from).toBe('noreply@drexonyx.studio');
    expect(typeof call.html).toBe('string');
    const html = call.html as string;
    expect(html).toContain('https://r2.example.com/signed-url?token=abc');
    expect(html).toContain('Hero Video');
    expect(html).toContain('Acme Corp');
  });

  it('throws when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendDeliveryEmail(base)).rejects.toThrow('RESEND_API_KEY');
  });

  it('throws when RESEND_FROM_ADDRESS is not set', async () => {
    delete process.env.RESEND_FROM_ADDRESS;
    await expect(sendDeliveryEmail(base)).rejects.toThrow('RESEND_FROM_ADDRESS');
  });
});
