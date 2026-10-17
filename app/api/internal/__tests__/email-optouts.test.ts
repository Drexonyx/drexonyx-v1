// Tests for the email opt-out system:
//  1. Opt-out token creation via ensureOptOutToken
//  2. getEmailOptOut returns null for unknown email
//  3. recordOptOut — valid token (first opt-out, sets opted_out_at)
//  4. recordOptOut — invalid token (TOKEN_NOT_FOUND)
//  5. recordOptOut — already opted out (idempotent)
//  6. sendOutreachEmail blocks opted-out email (production mode)
//  7. sendOutreachEmail includes unsubscribe link in production HTML
//  8. sendOutreachEmail skips opt-out check in testMode

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── DB mock ──────────────────────────────────────────────────────────────────

const mockDbExecute = vi.hoisted(() => vi.fn());
const mockDbSelect = vi.hoisted(() => vi.fn());
const mockDbUpdate = vi.hoisted(() => vi.fn());
const mockDbInsert = vi.hoisted(() => vi.fn());

vi.mock('@/db/index', () => ({
  db: {
    execute: mockDbExecute,
    select: mockDbSelect,
    update: mockDbUpdate,
    insert: mockDbInsert,
  },
}));

// ─── Resend mock ──────────────────────────────────────────────────────────────

const mockEmailsSend = vi.hoisted(() => vi.fn());

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function () {
    return { emails: { send: mockEmailsSend } };
  }),
}));

// ─── Chain helpers ────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  return chain;
}

function makeUpdateChain() {
  const chain: Record<string, unknown> = {};
  chain.set = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockResolvedValue(undefined);
  return chain;
}

function makeInsertChain() {
  const chain: Record<string, unknown> = {};
  chain.values = vi.fn().mockResolvedValue(undefined);
  return chain;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('email opt-out system', () => {
  beforeEach(() => {
    // clearAllMocks resets calls/results but preserves mockImplementation (needed for Resend constructor).
    vi.clearAllMocks();
    // Restore stable defaults after the clear
    mockDbExecute.mockResolvedValue(undefined);
    mockDbUpdate.mockReturnValue(makeUpdateChain());
    mockDbInsert.mockReturnValue(makeInsertChain());
    // Must be explicit because clearAllMocks wipes mockResolvedValue for vi.fn()s
    mockEmailsSend.mockResolvedValue({ data: { id: 'default-resend-id' }, error: null });

    process.env.RESEND_API_KEY = 're_test_key';
    process.env.RESEND_FROM_ADDRESS = 'Master Digital Agency <info@drexonyx.com>';
    process.env.NEXT_PUBLIC_APP_URL = 'https://www.drexonyx.com';
    process.env.SALES_OUTREACH_TEST_MODE = 'false';
  });

  // ── Query helpers ────────────────────────────────────────────────────────────

  // 1. Opt-out token creation
  it('ensureOptOutToken executes INSERT ON CONFLICT DO NOTHING and returns stored token', async () => {
    const storedToken = 'stored-token-abc';
    mockDbSelect.mockReturnValueOnce(makeSelectChain([{ token: storedToken }]));

    const { ensureOptOutToken } = await import('@/lib/sales/queries');
    const result = await ensureOptOutToken('lead@business.com', 'msg-1');

    // INSERT was executed
    expect(mockDbExecute).toHaveBeenCalledOnce();
    // SELECT was done to fetch back the token
    expect(mockDbSelect).toHaveBeenCalledOnce();
    expect(result).toBe(storedToken);
  });

  // 2. getEmailOptOut returns null for unknown email
  it('getEmailOptOut returns null when email is not in the opt-out table', async () => {
    mockDbSelect.mockReturnValueOnce(makeSelectChain([]));

    const { getEmailOptOut } = await import('@/lib/sales/queries');
    const result = await getEmailOptOut('nobody@notindb.com');
    expect(result).toBeNull();
  });

  // 3. recordOptOut — valid, first opt-out
  it('recordOptOut marks email opted out and returns ok:true, alreadyOptedOut:false', async () => {
    mockDbSelect.mockReturnValueOnce(makeSelectChain([{ opted_out_at: null }]));

    const { recordOptOut } = await import('@/lib/sales/queries');
    const result = await recordOptOut('valid-token');

    expect(result).toEqual({ ok: true, alreadyOptedOut: false });
    expect(mockDbUpdate).toHaveBeenCalledOnce();
  });

  // 4. recordOptOut — invalid token
  it('recordOptOut returns TOKEN_NOT_FOUND for an unknown token', async () => {
    mockDbSelect.mockReturnValueOnce(makeSelectChain([]));

    const { recordOptOut } = await import('@/lib/sales/queries');
    const result = await recordOptOut('no-such-token');

    expect(result).toEqual({ ok: false, reason: 'TOKEN_NOT_FOUND' });
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  // 5. recordOptOut — already opted out (idempotent)
  it('recordOptOut returns alreadyOptedOut:true without re-writing when already opted out', async () => {
    mockDbSelect.mockReturnValueOnce(
      makeSelectChain([{ opted_out_at: new Date('2026-01-01T00:00:00Z') }]),
    );

    const { recordOptOut } = await import('@/lib/sales/queries');
    const result = await recordOptOut('already-done-token');

    expect(result).toEqual({ ok: true, alreadyOptedOut: true });
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  // ── Outreach sender ──────────────────────────────────────────────────────────

  // 6. sendOutreachEmail blocks opted-out email in production mode
  it('sendOutreachEmail returns OPT_OUT when email has opted out (production mode)', async () => {
    // getEmailOptOut → opted out
    mockDbSelect.mockReturnValueOnce(
      makeSelectChain([{ token: 'tok', opted_out_at: new Date('2026-01-01') }]),
    );

    const { sendOutreachEmail } = await import('@/lib/sales/outreach-sender');
    const result = await sendOutreachEmail({
      outreachMessageId: 'msg-1',
      leadId: 'lead-1',
      toEmail: 'optedout@somecompany.io',
      businessName: 'Some Co',
      organizationId: 'org-1',
      testMode: false,
    });

    expect(result).toMatchObject({ ok: false, code: 'OPT_OUT' });
    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  // 7. sendOutreachEmail includes unsubscribe link in production mode HTML
  it('sendOutreachEmail passes unsubscribeUrl to the email HTML in production mode', async () => {
    const token = 'unsubscribe-token-xyz';

    // getEmailOptOut → not opted out
    mockDbSelect.mockReturnValueOnce(makeSelectChain([{ token, opted_out_at: null }]));
    // ensureOptOutToken SELECT (after INSERT)
    mockDbSelect.mockReturnValueOnce(makeSelectChain([{ token }]));
    // fetch outreach message
    mockDbSelect.mockReturnValueOnce(
      makeSelectChain([
        {
          id: 'msg-1',
          channel: 'email',
          message_text: 'Hello from MDA.',
          message_type: 'cold_outreach',
          status: 'DRAFT',
          approval_status: 'NOT_REQUIRED',
          external_message_id: null,
          external_thread_id: null,
        },
      ]),
    );

    const { sendOutreachEmail } = await import('@/lib/sales/outreach-sender');
    const result = await sendOutreachEmail({
      outreachMessageId: 'msg-1',
      leadId: 'lead-1',
      toEmail: 'prospect@somecompany.io',
      businessName: 'Some Co',
      organizationId: 'org-1',
      testMode: false,
    });

    expect(result).toMatchObject({ ok: true });
    expect(mockEmailsSend).toHaveBeenCalledOnce();
    const emailCall = mockEmailsSend.mock.calls[0][0];
    expect(emailCall.html).toContain(token);
    expect(emailCall.html).toContain('Unsubscribe');
    expect(emailCall.html).toContain('/api/unsubscribe?token=');
  });

  // 8. sendOutreachEmail skips opt-out check entirely in testMode
  it('sendOutreachEmail does not query email_optouts in testMode', async () => {
    // In testMode the first DB call is for the outreach message fetch (step 2),
    // not getEmailOptOut — so the very first select returns NOT_FOUND to prove bypass.
    mockDbSelect.mockReturnValueOnce(makeSelectChain([])); // outreach message not found

    const { sendOutreachEmail } = await import('@/lib/sales/outreach-sender');
    const result = await sendOutreachEmail({
      outreachMessageId: 'msg-1',
      leadId: 'lead-1',
      toEmail: 'prospect@somecompany.io',
      businessName: 'Test Co',
      organizationId: 'org-1',
      testMode: true,
    });

    // Opt-out bypassed: first DB call went to outreach message fetch → NOT_FOUND
    expect(result).toMatchObject({ ok: false, code: 'NOT_FOUND' });
    // Only one DB select call total (the outreach message fetch), proving no opt-out query ran
    expect(mockDbSelect).toHaveBeenCalledOnce();
  });
});
