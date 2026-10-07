import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Shared mocks ──────────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockUpdate } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate },
}));

const { mockGetOutreachSendable, mockGetSentOutreachForReplyPoll } = vi.hoisted(() => ({
  mockGetOutreachSendable: vi.fn(),
  mockGetSentOutreachForReplyPoll: vi.fn(),
}));

vi.mock('@/lib/sales/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/sales/queries')>();
  return {
    ...actual,
    getOutreachSendable: mockGetOutreachSendable,
    getSentOutreachForReplyPoll: mockGetSentOutreachForReplyPoll,
  };
});

const { mockSendOutreachEmail } = vi.hoisted(() => ({
  mockSendOutreachEmail: vi.fn(),
}));

vi.mock('@/lib/sales/outreach-sender', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/sales/outreach-sender')>();
  return { ...actual, sendOutreachEmail: mockSendOutreachEmail };
});

const { mockDetectReplies } = vi.hoisted(() => ({
  mockDetectReplies: vi.fn(),
}));

vi.mock('@/lib/sales/reply-detector', () => ({
  detectReplies: mockDetectReplies,
}));

// ── Route imports ─────────────────────────────────────────────────────────────

import { GET as outreachSendGET } from '../sales-outreach-send/route';
import { GET as replyPollGET } from '../sales-reply-poll/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

const CRON_SECRET = 'test-cron-secret';
const ORG_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

function makeRequest(url: string, hasAuth = true): NextRequest {
  const headers = new Headers();
  if (hasAuth) headers.set('authorization', `Bearer ${CRON_SECRET}`);
  return new NextRequest(url, { headers });
}

function makeSelectChain(result: unknown[]) {
  const asPromise = Promise.resolve(result);
  const terminal = {
    then: asPromise.then.bind(asPromise),
    catch: asPromise.catch.bind(asPromise),
    finally: asPromise.finally.bind(asPromise),
  };
  const limitFn = vi.fn().mockReturnValue(terminal);
  const whereFn = vi.fn().mockReturnValue({ limit: limitFn, ...terminal });
  const fromFn = vi.fn().mockReturnValue({ where: whereFn, limit: limitFn, ...terminal });
  return fromFn;
}

function makeInsertChain() {
  const asPromise = Promise.resolve([]);
  const terminal = {
    then: asPromise.then.bind(asPromise),
    catch: asPromise.catch.bind(asPromise),
    finally: asPromise.finally.bind(asPromise),
  };
  const valuesFn = vi.fn().mockReturnValue(terminal);
  return valuesFn;
}

function makeUpdateChain() {
  const asPromise = Promise.resolve([]);
  const terminal = {
    then: asPromise.then.bind(asPromise),
    catch: asPromise.catch.bind(asPromise),
    finally: asPromise.finally.bind(asPromise),
  };
  const whereFn = vi.fn().mockReturnValue(terminal);
  const setFn = vi.fn().mockReturnValue({ where: whereFn, ...terminal });
  return setFn;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = CRON_SECRET;
  process.env.DREXONYX_ORG_ID = ORG_ID;
  process.env.SALES_OUTREACH_TEST_MODE = 'true';
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.RESEND_FROM_ADDRESS = 'Master Digital Agency <info@drexonyx.com>';
});

// ── 1. Auth — sales-outreach-send ─────────────────────────────────────────────

describe('GET /api/internal/sales-outreach-send — auth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const req = makeRequest('http://localhost/api/internal/sales-outreach-send', false);
    const res = await outreachSendGET(req);
    expect(res.status).toBe(401);
  });

  it('returns 500 when DREXONYX_ORG_ID is not set', async () => {
    delete process.env.DREXONYX_ORG_ID;
    const req = makeRequest('http://localhost/api/internal/sales-outreach-send');
    const res = await outreachSendGET(req);
    expect(res.status).toBe(500);
  });
});

// ── 2. Outreach send — happy path ─────────────────────────────────────────────

describe('GET /api/internal/sales-outreach-send — execution', () => {
  it('calls sendOutreachEmail for each sendable row and counts successes', async () => {
    const rows = [
      { id: 'msg-1', lead_id: 'lead-1', message_text: 'Hi', message_type: 'cold_outreach', channel: 'email', approval_status: 'NOT_REQUIRED', businessName: 'Acme', publicEmail: 'owner@acme.com' },
      { id: 'msg-2', lead_id: 'lead-2', message_text: 'Hi', message_type: 'cold_outreach', channel: 'email', approval_status: 'NOT_REQUIRED', businessName: 'Beta', publicEmail: 'owner@beta.com' },
    ];
    mockGetOutreachSendable.mockResolvedValue(rows);
    mockSendOutreachEmail.mockResolvedValue({ ok: true, messageId: 'resend-id', threadId: 'resend-id', redirected: true });

    const req = makeRequest('http://localhost/api/internal/sales-outreach-send');
    const res = await outreachSendGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(2);
    expect(body.sent).toBe(2);
    expect(body.failed).toBe(0);
    expect(mockSendOutreachEmail).toHaveBeenCalledTimes(2);
  });

  it('passes testMode:true when SALES_OUTREACH_TEST_MODE=true', async () => {
    mockGetOutreachSendable.mockResolvedValue([
      { id: 'msg-1', lead_id: 'lead-1', message_text: 'Hi', message_type: 'cold_outreach', channel: 'email', approval_status: 'NOT_REQUIRED', businessName: 'Acme', publicEmail: 'owner@acme.com' },
    ]);
    mockSendOutreachEmail.mockResolvedValue({ ok: true, messageId: 'r1', threadId: 'r1', redirected: true });

    const req = makeRequest('http://localhost/api/internal/sales-outreach-send');
    await outreachSendGET(req);

    expect(mockSendOutreachEmail).toHaveBeenCalledWith(
      expect.objectContaining({ testMode: true }),
    );
  });

  it('counts POLICY_BLOCKED results as blocked (not failed)', async () => {
    mockGetOutreachSendable.mockResolvedValue([
      { id: 'msg-1', lead_id: 'lead-1', message_text: 'Hi', message_type: 'cold_outreach', channel: 'email', approval_status: 'NOT_REQUIRED', businessName: 'Acme', publicEmail: 'owner@acme.com' },
    ]);
    mockSendOutreachEmail.mockResolvedValue({ ok: false, code: 'POLICY_BLOCKED', reason: 'blocked' });

    const req = makeRequest('http://localhost/api/internal/sales-outreach-send');
    const res = await outreachSendGET(req);
    const body = await res.json();

    expect(body.blocked).toBe(1);
    expect(body.failed).toBe(0);
  });

  it('counts SEND_FAILURE as failed', async () => {
    mockGetOutreachSendable.mockResolvedValue([
      { id: 'msg-1', lead_id: 'lead-1', message_text: 'Hi', message_type: 'cold_outreach', channel: 'email', approval_status: 'NOT_REQUIRED', businessName: 'Acme', publicEmail: 'owner@acme.com' },
    ]);
    mockSendOutreachEmail.mockResolvedValue({ ok: false, code: 'SEND_FAILURE', reason: 'rate limit' });

    const req = makeRequest('http://localhost/api/internal/sales-outreach-send');
    const res = await outreachSendGET(req);
    const body = await res.json();

    expect(body.failed).toBe(1);
    expect(body.sent).toBe(0);
  });

  it('returns total:0 when no sendable rows exist', async () => {
    mockGetOutreachSendable.mockResolvedValue([]);
    const req = makeRequest('http://localhost/api/internal/sales-outreach-send');
    const res = await outreachSendGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(0);
    expect(body.sent).toBe(0);
    expect(mockSendOutreachEmail).not.toHaveBeenCalled();
  });
});

// ── 3. Auth — sales-reply-poll ────────────────────────────────────────────────

describe('GET /api/internal/sales-reply-poll — auth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const req = makeRequest('http://localhost/api/internal/sales-reply-poll', false);
    const res = await replyPollGET(req);
    expect(res.status).toBe(401);
  });

  it('returns 500 when DREXONYX_ORG_ID is not set', async () => {
    delete process.env.DREXONYX_ORG_ID;
    const req = makeRequest('http://localhost/api/internal/sales-reply-poll');
    const res = await replyPollGET(req);
    expect(res.status).toBe(500);
  });
});

// ── 4. Reply poll — not configured ───────────────────────────────────────────

describe('GET /api/internal/sales-reply-poll — not configured', () => {
  it('returns configured:false when Gmail credentials are absent', async () => {
    mockGetSentOutreachForReplyPoll.mockResolvedValue([]);
    mockDetectReplies.mockResolvedValue({ configured: false, checked: 0, repliesFound: [], errors: 0 });

    const req = makeRequest('http://localhost/api/internal/sales-reply-poll');
    const res = await replyPollGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.configured).toBe(false);
    expect(body.repliesFound).toBe(0);
  });
});

// ── 5. Reply poll — replies detected ─────────────────────────────────────────

describe('GET /api/internal/sales-reply-poll — replies detected', () => {
  beforeEach(() => {
    const setFn = makeUpdateChain();
    mockUpdate.mockReturnValue({ set: setFn });
    const valuesFn = makeInsertChain();
    mockInsert.mockReturnValue({ values: valuesFn });
  });

  it('records a detected reply and advances lead to REPLIED', async () => {
    const pollRows = [{ id: 'msg-1', lead_id: 'lead-1', external_thread_id: 'thread-abc', sent_at: new Date() }];
    mockGetSentOutreachForReplyPoll.mockResolvedValue(pollRows);
    mockDetectReplies.mockResolvedValue({
      configured: true,
      checked: 1,
      repliesFound: [{ outreachMessageId: 'msg-1', gmailMessageId: 'gmail-reply-1', receivedAt: new Date() }],
      errors: 0,
    });

    // Second db.select() returns the lead_id lookup
    mockSelect.mockReturnValue({ from: makeSelectChain([{ lead_id: 'lead-1' }]) });

    const req = makeRequest('http://localhost/api/internal/sales-reply-poll');
    const res = await replyPollGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.configured).toBe(true);
    expect(body.repliesFound).toBe(1);
    expect(body.recorded).toBe(1);
  });

  it('returns repliesFound:0 when no replies detected', async () => {
    mockGetSentOutreachForReplyPoll.mockResolvedValue([]);
    mockDetectReplies.mockResolvedValue({
      configured: true, checked: 0, repliesFound: [], errors: 0,
    });

    const req = makeRequest('http://localhost/api/internal/sales-reply-poll');
    const res = await replyPollGET(req);
    const body = await res.json();

    expect(body.repliesFound).toBe(0);
    expect(body.recorded).toBe(0);
  });
});
