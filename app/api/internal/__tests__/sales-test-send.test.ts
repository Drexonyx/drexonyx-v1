import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Shared mocks ──────────────────────────────────────────────────────────────

const { mockInsert, mockSelect, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: { insert: mockInsert, select: mockSelect, update: mockUpdate, delete: mockDelete },
}));

const { mockSendOutreachEmail } = vi.hoisted(() => ({
  mockSendOutreachEmail: vi.fn(),
}));

vi.mock('@/lib/sales/outreach-sender', () => ({
  sendOutreachEmail: mockSendOutreachEmail,
  OUTREACH_TEST_RECIPIENT: 'Irenfold@gmail.com',
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-uuid-fixed' }));

// ── Route import ──────────────────────────────────────────────────────────────

import { POST, GET } from '../sales-test-send/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ORG_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

function makePost(): NextRequest {
  return new NextRequest('http://localhost/api/internal/sales-test-send', { method: 'POST' });
}

function makeInsertChain() {
  const p = Promise.resolve([]);
  const valuesFn = vi.fn().mockReturnValue({ then: p.then.bind(p), catch: p.catch.bind(p), finally: p.finally.bind(p) });
  return valuesFn;
}

function makeSelectChain(result: unknown[]) {
  const p = Promise.resolve(result);
  const terminal = { then: p.then.bind(p), catch: p.catch.bind(p), finally: p.finally.bind(p) };
  const limitFn = vi.fn().mockReturnValue(terminal);
  const whereFn = vi.fn().mockReturnValue({ limit: limitFn, ...terminal });
  const fromFn = vi.fn().mockReturnValue({ where: whereFn, limit: limitFn, ...terminal });
  return fromFn;
}

function makeDeleteChain() {
  const p = Promise.resolve([]);
  const terminal = { then: p.then.bind(p), catch: p.catch.bind(p), finally: p.finally.bind(p) };
  const whereFn = vi.fn().mockReturnValue(terminal);
  return whereFn;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SALES_OUTREACH_TEST_MODE = 'true';
  process.env.DREXONYX_ORG_ID = ORG_ID;
  process.env.RESEND_FROM_ADDRESS = 'Master Digital Agency <info@drexonyx.com>';
});

// ── 1. Guard checks ───────────────────────────────────────────────────────────

describe('POST /api/internal/sales-test-send — guards', () => {
  it('returns 403 when SALES_OUTREACH_TEST_MODE is not true', async () => {
    process.env.SALES_OUTREACH_TEST_MODE = 'false';
    const res = await POST(makePost());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('returns 403 when SALES_OUTREACH_TEST_MODE is missing', async () => {
    delete process.env.SALES_OUTREACH_TEST_MODE;
    const res = await POST(makePost());
    expect(res.status).toBe(403);
  });

  it('returns 500 when DREXONYX_ORG_ID is not set', async () => {
    delete process.env.DREXONYX_ORG_ID;
    const res = await POST(makePost());
    expect(res.status).toBe(500);
  });

  it('returns 405 for GET requests', async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });
});

// ── 2. Happy path ─────────────────────────────────────────────────────────────

describe('POST /api/internal/sales-test-send — success', () => {
  beforeEach(() => {
    mockInsert.mockReturnValue({ values: makeInsertChain() });
    mockSendOutreachEmail.mockResolvedValue({
      ok: true,
      messageId: 'resend-msg-001',
      threadId: 'resend-msg-001',
      redirected: true,
    });
    mockSelect
      .mockReturnValueOnce({ from: makeSelectChain([{ status: 'SENT', external_message_id: 'resend-msg-001' }]) })
      .mockReturnValueOnce({ from: makeSelectChain([{ id: 'audit-1', action: 'OUTREACH_SENT' }]) });
    mockDelete.mockReturnValue({ where: makeDeleteChain() });
  });

  it('returns ok:true with all verification fields', async () => {
    const res = await POST(makePost());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.testMode).toBe(true);
    expect(body.recipient).toBe('Irenfold@gmail.com');
    expect(body.resendAccepted).toBe(true);
    expect(body.externalMessageId).toBe('resend-msg-001');
    expect(body.redirected).toBe(true);
    expect(body.dbStatus).toBe('SENT');
    expect(body.dbExternalMessageId).toBe('resend-msg-001');
    expect(body.auditRecorded).toBe(true);
    expect(body.auditAction).toBe('OUTREACH_SENT');
    expect(body.noRealProspectContacted).toBe(true);
  });

  it('calls sendOutreachEmail with testMode:true', async () => {
    await POST(makePost());
    expect(mockSendOutreachEmail).toHaveBeenCalledWith(
      expect.objectContaining({ testMode: true }),
    );
  });

  it('inserts and deletes synthetic records', async () => {
    await POST(makePost());
    expect(mockInsert).toHaveBeenCalledTimes(2); // lead + message
    expect(mockDelete).toHaveBeenCalledTimes(2); // message + lead
  });
});

// ── 3. Send failure ───────────────────────────────────────────────────────────

describe('POST /api/internal/sales-test-send — send failure', () => {
  it('returns ok:false when sendOutreachEmail fails', async () => {
    mockInsert.mockReturnValue({ values: makeInsertChain() });
    mockSendOutreachEmail.mockResolvedValue({
      ok: false,
      code: 'SEND_FAILURE',
      reason: 'Resend rate limit',
    });
    mockSelect
      .mockReturnValueOnce({ from: makeSelectChain([{ status: 'FAILED', external_message_id: null }]) })
      .mockReturnValueOnce({ from: makeSelectChain([]) });
    mockDelete.mockReturnValue({ where: makeDeleteChain() });

    const res = await POST(makePost());
    const body = await res.json();

    expect(body.ok).toBe(false);
    expect(body.code).toBe('SEND_FAILURE');
    expect(body.noRealProspectContacted).toBe(true);
    expect(body.testMode).toBe(true);
  });
});
