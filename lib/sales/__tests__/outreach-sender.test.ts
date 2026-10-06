import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Shared mocks ──────────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockUpdate } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate },
}));

const { mockGetApprovalPolicy } = vi.hoisted(() => ({
  mockGetApprovalPolicy: vi.fn(),
}));

vi.mock('@/lib/sales/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/sales/queries')>();
  return { ...actual, getApprovalPolicy: mockGetApprovalPolicy };
});

const { mockEmailsSend } = vi.hoisted(() => ({
  mockEmailsSend: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: vi.fn(function () {
    return { emails: { send: mockEmailsSend } };
  }),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import {
  isValidPublicEmail,
  sendOutreachEmail,
  sendFollowUpEmail,
  OUTREACH_TEST_RECIPIENT,
} from '../outreach-sender';

// ── Test helpers ──────────────────────────────────────────────────────────────

const ORG_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const LEAD_ID = 'bbbbbbbb-0000-0000-0000-000000000002';
const MSG_ID = 'cccccccc-0000-0000-0000-000000000003';
const FU_ID = 'dddddddd-0000-0000-0000-000000000004';

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

function makeOutreachMsgRow(overrides: Record<string, unknown> = {}) {
  return {
    id: MSG_ID,
    channel: 'email',
    message_text: 'Hello, I would love to collaborate.',
    message_type: 'cold_outreach',
    status: 'DRAFT',
    approval_status: 'NOT_REQUIRED',
    external_message_id: null,
    external_thread_id: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.RESEND_FROM_ADDRESS = 'noreply@drexonyx.com';
  process.env.SALES_OUTREACH_TEST_MODE = 'true'; // safe default for all tests
  mockGetApprovalPolicy.mockReturnValue('NOT_REQUIRED');
});

// ── isValidPublicEmail ────────────────────────────────────────────────────────

describe('isValidPublicEmail', () => {
  it('accepts a valid business email', () => {
    expect(isValidPublicEmail('contact@acme-corp.com')).toBe(true);
  });

  it('rejects null', () => {
    expect(isValidPublicEmail(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isValidPublicEmail(undefined)).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidPublicEmail('')).toBe(false);
  });

  it('rejects email without @', () => {
    expect(isValidPublicEmail('notanemail')).toBe(false);
  });

  it('rejects example.com domain', () => {
    expect(isValidPublicEmail('user@example.com')).toBe(false);
  });

  it('rejects test.com domain', () => {
    expect(isValidPublicEmail('admin@test.com')).toBe(false);
  });

  it('rejects localhost domain', () => {
    expect(isValidPublicEmail('admin@localhost')).toBe(false);
  });
});

// ── sendOutreachEmail — guard conditions ──────────────────────────────────────

describe('sendOutreachEmail — guard conditions', () => {
  it('returns MISSING_EMAIL when toEmail is null', async () => {
    const result = await sendOutreachEmail({
      outreachMessageId: MSG_ID, leadId: LEAD_ID, toEmail: null,
      businessName: 'Acme', organizationId: ORG_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('MISSING_EMAIL');
  });

  it('returns INVALID_EMAIL for a blocked domain', async () => {
    const result = await sendOutreachEmail({
      outreachMessageId: MSG_ID, leadId: LEAD_ID, toEmail: 'x@example.com',
      businessName: 'Acme', organizationId: ORG_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_EMAIL');
  });

  it('returns NOT_FOUND when outreach message row is missing', async () => {
    mockSelect.mockReturnValue({ from: makeSelectChain([]) });
    const result = await sendOutreachEmail({
      outreachMessageId: MSG_ID, leadId: LEAD_ID, toEmail: 'owner@acme.com',
      businessName: 'Acme', organizationId: ORG_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('NOT_FOUND');
  });

  it('returns ok:true (idempotent) when external_message_id already set', async () => {
    mockSelect.mockReturnValue({
      from: makeSelectChain([makeOutreachMsgRow({ external_message_id: 'resend-existing' })]),
    });
    const result = await sendOutreachEmail({
      outreachMessageId: MSG_ID, leadId: LEAD_ID, toEmail: 'owner@acme.com',
      businessName: 'Acme', organizationId: ORG_ID,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.messageId).toBe('resend-existing');
  });

  it('returns POLICY_BLOCKED when approval_status is PENDING', async () => {
    mockSelect.mockReturnValue({
      from: makeSelectChain([makeOutreachMsgRow({ approval_status: 'PENDING' })]),
    });
    const result = await sendOutreachEmail({
      outreachMessageId: MSG_ID, leadId: LEAD_ID, toEmail: 'owner@acme.com',
      businessName: 'Acme', organizationId: ORG_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('POLICY_BLOCKED');
  });

  it('returns MISSING_CONFIG when RESEND_API_KEY is absent', async () => {
    delete process.env.RESEND_API_KEY;
    mockSelect.mockReturnValue({ from: makeSelectChain([makeOutreachMsgRow()]) });
    const result = await sendOutreachEmail({
      outreachMessageId: MSG_ID, leadId: LEAD_ID, toEmail: 'owner@acme.com',
      businessName: 'Acme', organizationId: ORG_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('MISSING_CONFIG');
  });
});

// ── sendOutreachEmail — successful send ───────────────────────────────────────

describe('sendOutreachEmail — successful send', () => {
  beforeEach(() => {
    mockSelect.mockReturnValue({ from: makeSelectChain([makeOutreachMsgRow()]) });
    mockEmailsSend.mockResolvedValue({ data: { id: 'resend-msg-001' }, error: null });
    const setFn = makeUpdateChain();
    mockUpdate.mockReturnValue({ set: setFn });
    const valuesFn = makeInsertChain();
    mockInsert.mockReturnValue({ values: valuesFn });
  });

  it('returns ok:true with a messageId', async () => {
    const result = await sendOutreachEmail({
      outreachMessageId: MSG_ID, leadId: LEAD_ID, toEmail: 'owner@acme.com',
      businessName: 'Acme', organizationId: ORG_ID,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.messageId).toBe('resend-msg-001');
  });

  it('redirects to test recipient in test mode', async () => {
    const result = await sendOutreachEmail({
      outreachMessageId: MSG_ID, leadId: LEAD_ID, toEmail: 'owner@acme.com',
      businessName: 'Acme', organizationId: ORG_ID, testMode: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.redirected).toBe(true);
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: [OUTREACH_TEST_RECIPIENT] }),
    );
  });

  it('sends to real email when testMode is false', async () => {
    const result = await sendOutreachEmail({
      outreachMessageId: MSG_ID, leadId: LEAD_ID, toEmail: 'owner@acme.com',
      businessName: 'Acme', organizationId: ORG_ID, testMode: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.redirected).toBe(false);
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['owner@acme.com'] }),
    );
  });
});

// ── sendOutreachEmail — send failure handling ─────────────────────────────────

describe('sendOutreachEmail — send failure handling', () => {
  it('returns SEND_FAILURE and marks message FAILED when Resend errors', async () => {
    mockSelect.mockReturnValue({ from: makeSelectChain([makeOutreachMsgRow()]) });
    mockEmailsSend.mockResolvedValue({ data: null, error: { message: 'rate limit' } });
    const setFn = makeUpdateChain();
    mockUpdate.mockReturnValue({ set: setFn });

    const result = await sendOutreachEmail({
      outreachMessageId: MSG_ID, leadId: LEAD_ID, toEmail: 'owner@acme.com',
      businessName: 'Acme', organizationId: ORG_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('SEND_FAILURE');
    expect(setFn).toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILED' }));
  });
});

// ── sendFollowUpEmail — guard conditions ──────────────────────────────────────

describe('sendFollowUpEmail — guard conditions', () => {
  it('returns MISSING_EMAIL when toEmail is null', async () => {
    const result = await sendFollowUpEmail({
      followUpId: FU_ID, leadId: LEAD_ID, outreachId: MSG_ID,
      toEmail: null, businessName: 'Acme', messageText: null, organizationId: ORG_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('MISSING_EMAIL');
  });

  it('returns POLICY_BLOCKED when policy returns PENDING', async () => {
    mockGetApprovalPolicy.mockReturnValue('PENDING');
    const result = await sendFollowUpEmail({
      followUpId: FU_ID, leadId: LEAD_ID, outreachId: MSG_ID,
      toEmail: 'owner@acme.com', businessName: 'Acme', messageText: null, organizationId: ORG_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('POLICY_BLOCKED');
  });
});

// ── sendFollowUpEmail — successful send ───────────────────────────────────────

describe('sendFollowUpEmail — successful send', () => {
  beforeEach(() => {
    mockEmailsSend.mockResolvedValue({ data: { id: 'resend-fu-001' }, error: null });
    const setFn = makeUpdateChain();
    mockUpdate.mockReturnValue({ set: setFn });
    const valuesFn = makeInsertChain();
    mockInsert.mockReturnValue({ values: valuesFn });
  });

  it('returns ok:true with a messageId', async () => {
    const result = await sendFollowUpEmail({
      followUpId: FU_ID, leadId: LEAD_ID, outreachId: MSG_ID,
      toEmail: 'owner@acme.com', businessName: 'Acme', messageText: null, organizationId: ORG_ID,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.messageId).toBe('resend-fu-001');
  });

  it('redirects to test recipient in test mode', async () => {
    const result = await sendFollowUpEmail({
      followUpId: FU_ID, leadId: LEAD_ID, outreachId: MSG_ID,
      toEmail: 'owner@acme.com', businessName: 'Acme', messageText: null, organizationId: ORG_ID,
      testMode: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.redirected).toBe(true);
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: [OUTREACH_TEST_RECIPIENT] }),
    );
  });

  it('uses default message text when messageText is null', async () => {
    await sendFollowUpEmail({
      followUpId: FU_ID, leadId: LEAD_ID, outreachId: MSG_ID,
      toEmail: 'owner@acme.com', businessName: 'Acme Corp', messageText: null, organizationId: ORG_ID,
    });
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ html: expect.stringContaining('Acme Corp') }),
    );
  });
});
