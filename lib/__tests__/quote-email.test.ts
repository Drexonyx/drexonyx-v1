import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function () {
    return { emails: { send: mockSend } };
  }),
}));

import { sendQuoteNotificationEmail } from '../email/quote';

// ─── Test fixtures ────────────────────────────────────────────────────────────

const base = {
  to: ['client@example.com'],
  quoteId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  organizationName: 'Acme Corp',
  totalAmount: '5000.0000',
  currency: 'USD',
};

// ─── sendQuoteNotificationEmail ───────────────────────────────────────────────

describe('sendQuoteNotificationEmail', () => {
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
    await expect(sendQuoteNotificationEmail(base)).resolves.toBeUndefined();
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('throws when Resend returns an error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'Domain not verified' } });
    await expect(sendQuoteNotificationEmail(base)).rejects.toThrow('Resend error: Domain not verified');
  });

  it('sends to specified recipients with org name, amount, and currency in HTML body', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });
    await sendQuoteNotificationEmail(base);

    const call = mockSend.mock.calls[0][0] as Record<string, unknown>;
    expect(call.to).toEqual(['client@example.com']);
    expect(call.from).toBe('noreply@drexonyx.studio');
    expect(typeof call.html).toBe('string');
    const html = call.html as string;
    expect(html).toContain('Acme Corp');
    expect(html).toContain('5000.0000');
    expect(html).toContain('USD');
    expect(html).toContain('aaaaaaaa');
  });

  it('includes portal quotes link in HTML body', async () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://drexonyx.studio';
    mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });
    await sendQuoteNotificationEmail(base);
    delete process.env.NEXT_PUBLIC_BASE_URL;

    const call = mockSend.mock.calls[0][0] as Record<string, unknown>;
    const html = call.html as string;
    expect(html).toContain('https://drexonyx.studio/portal/quotes');
  });

  it('throws when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendQuoteNotificationEmail(base)).rejects.toThrow('RESEND_API_KEY');
  });

  it('throws when RESEND_FROM_ADDRESS is not set', async () => {
    delete process.env.RESEND_FROM_ADDRESS;
    await expect(sendQuoteNotificationEmail(base)).rejects.toThrow('RESEND_FROM_ADDRESS');
  });

  it('escapes HTML special characters in org name', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });
    await sendQuoteNotificationEmail({ ...base, organizationName: '<Acme & Co>' });

    const call = mockSend.mock.calls[0][0] as Record<string, unknown>;
    const html = call.html as string;
    expect(html).not.toContain('<Acme');
    expect(html).toContain('&lt;Acme');
    expect(html).toContain('&amp;');
  });

  it('subject line includes quoteId prefix', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });
    await sendQuoteNotificationEmail(base);

    const call = mockSend.mock.calls[0][0] as Record<string, unknown>;
    expect(call.subject as string).toContain('aaaaaaaa');
  });

  it('sends to multiple recipients', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });
    const multiBase = { ...base, to: ['a@example.com', 'b@example.com'] };
    await sendQuoteNotificationEmail(multiBase);

    const call = mockSend.mock.calls[0][0] as Record<string, unknown>;
    expect(call.to).toEqual(['a@example.com', 'b@example.com']);
  });
});
