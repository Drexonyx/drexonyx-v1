// DR 0125 Phase 1: WhatsApp webhook route tests.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockDbSelect, mockDbInsert, mockAuditTaskCreated, mockAuditPlanGenerated } = vi.hoisted(
  () => ({
    mockDbSelect: vi.fn(),
    mockDbInsert: vi.fn(),
    mockAuditTaskCreated: vi.fn(),
    mockAuditPlanGenerated: vi.fn(),
  }),
);

vi.mock('@/db/index', () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
  },
}));

vi.mock('@/lib/orchestration/audit', () => ({
  auditTaskCreated: mockAuditTaskCreated,
  auditPlanGenerated: mockAuditPlanGenerated,
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-task-uuid' }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const APP_SECRET = 'test-app-secret';
const PHONE_NUMBER_ID = '123456789012345';
const ORG_ID = 'org-uuid-001';
const OWNER_USER_ID = 'owner-uuid-001';

function signBody(body: string, secret: string = APP_SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(body, 'utf8').digest('hex')}`;
}

function makeMetaPayload(overrides: Record<string, unknown> = {}): string {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'waba-id-001',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+97150000001',
                phone_number_id: PHONE_NUMBER_ID,
              },
              contacts: [{ profile: { name: 'Test User' }, wa_id: '971501234567' }],
              messages: [
                {
                  from: '971501234567',
                  id: 'wamid.test001',
                  timestamp: '1700000000',
                  type: 'text',
                  text: { body: 'Hello, I need help with my order' },
                },
              ],
            },
          },
        ],
      },
    ],
    ...overrides,
  };
  return JSON.stringify(payload);
}

function makePostRequest(body: string, sig?: string): NextRequest {
  return new NextRequest('https://example.com/api/webhooks/whatsapp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hub-signature-256': sig ?? signBody(body),
    },
    body,
  });
}

function makeGetRequest(params: Record<string, string>): NextRequest {
  const url = new URL('https://example.com/api/webhooks/whatsapp');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

// Default DB mock: no existing tasks, insert succeeds, owner user found.
// Route call order: isAlreadyProcessed first, then resolveOwnerUserId.
function setupHappyPathDb() {
  const selectChain = { from: vi.fn(), where: vi.fn(), limit: vi.fn() };
  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);
  selectChain.limit
    .mockResolvedValueOnce([])                            // isAlreadyProcessed → not found
    .mockResolvedValueOnce([{ user_id: OWNER_USER_ID }]); // resolveOwnerUserId → owner found
  mockDbSelect.mockReturnValue(selectChain);

  const insertChain = { values: vi.fn().mockResolvedValue(undefined) };
  mockDbInsert.mockReturnValue(insertChain);

  mockAuditTaskCreated.mockResolvedValue(undefined);
  mockAuditPlanGenerated.mockResolvedValue(undefined);
}

// ─── GET tests ────────────────────────────────────────────────────────────────

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

  it('returns 403 when WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured', async () => {
    vi.unstubAllEnvs();
    delete process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    const { GET } = await import('./route');
    const req = makeGetRequest({
      'hub.mode': 'subscribe',
      'hub.challenge': 'abc123',
      'hub.verify_token': 'any-token',
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
});

// ─── POST tests ───────────────────────────────────────────────────────────────

describe('POST /api/webhooks/whatsapp — provider not configured', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('returns 200 provider_not_configured when WHATSAPP_APP_SECRET absent', async () => {
    delete process.env.WHATSAPP_APP_SECRET;
    const { POST } = await import('./route');
    const body = makeMetaPayload();
    const req = new NextRequest('https://example.com/api/webhooks/whatsapp', {
      method: 'POST',
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ received: true, status: 'provider_not_configured' });
  });
});

describe('POST /api/webhooks/whatsapp — signature verification', () => {
  beforeEach(() => {
    vi.stubEnv('WHATSAPP_APP_SECRET', APP_SECRET);
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', PHONE_NUMBER_ID);
    vi.stubEnv('DREXONYX_ORG_ID', ORG_ID);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('returns 401 when signature header is missing', async () => {
    const { POST } = await import('./route');
    const body = makeMetaPayload();
    const req = new NextRequest('https://example.com/api/webhooks/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it('returns 401 when signature is wrong', async () => {
    const { POST } = await import('./route');
    const body = makeMetaPayload();
    const req = makePostRequest(body, 'sha256=deadbeef');
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it('returns 401 when signature uses wrong secret', async () => {
    const { POST } = await import('./route');
    const body = makeMetaPayload();
    const req = makePostRequest(body, signBody(body, 'wrong-secret'));
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when signature header lacks sha256= prefix', async () => {
    const { POST } = await import('./route');
    const body = makeMetaPayload();
    const rawHex = createHmac('sha256', APP_SECRET).update(body, 'utf8').digest('hex');
    const req = makePostRequest(body, rawHex); // no "sha256=" prefix
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/webhooks/whatsapp — valid inbound message', () => {
  beforeEach(() => {
    vi.stubEnv('WHATSAPP_APP_SECRET', APP_SECRET);
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', PHONE_NUMBER_ID);
    vi.stubEnv('DREXONYX_ORG_ID', ORG_ID);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('returns 200 { received: true } for a valid text message', async () => {
    setupHappyPathDb();
    const { POST } = await import('./route');
    const body = makeMetaPayload();
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ received: true });
  });

  it('creates a ROUTE_WHATSAPP_INQUIRY task', async () => {
    setupHappyPathDb();
    const { POST } = await import('./route');
    const body = makeMetaPayload();
    await POST(makePostRequest(body));
    expect(mockDbInsert).toHaveBeenCalledOnce();
    const insertValues = mockDbInsert.mock.results[0].value.values.mock.calls[0][0];
    expect(insertValues.intent_type).toBe('ROUTE_WHATSAPP_INQUIRY');
    expect(insertValues.status).toBe('PLAN_READY');
    expect(insertValues.organization_id).toBe(ORG_ID);
    expect(insertValues.initiated_by_user_id).toBe(OWNER_USER_ID);
    expect(insertValues.initiator_role).toBe('OWNER');
  });

  it('plan has 3 steps: SKILL → HUMAN_GATE → NOTIFICATION', async () => {
    setupHappyPathDb();
    const { POST } = await import('./route');
    const body = makeMetaPayload();
    await POST(makePostRequest(body));
    const insertValues = mockDbInsert.mock.results[0].value.values.mock.calls[0][0];
    const steps = (insertValues.plan as { steps: Record<string, unknown>[] }).steps;
    expect(steps).toHaveLength(3);
    expect(steps[0].step_type).toBe('SKILL');
    expect(steps[0].skill_id).toBe('communication.whatsapp.classify');
    expect(steps[1].step_type).toBe('HUMAN_GATE');
    expect(steps[2].step_type).toBe('NOTIFICATION');
  });

  it('passes message text to classify step', async () => {
    setupHappyPathDb();
    const { POST } = await import('./route');
    const body = makeMetaPayload();
    await POST(makePostRequest(body));
    const insertValues = mockDbInsert.mock.results[0].value.values.mock.calls[0][0];
    const steps = (insertValues.plan as { steps: Record<string, unknown>[] }).steps;
    const step0input = steps[0].input as Record<string, unknown>;
    expect(step0input.text).toBe('Hello, I need help with my order');
  });

  it('PII boundary: sender phone number not in task context', async () => {
    setupHappyPathDb();
    const { POST } = await import('./route');
    const body = makeMetaPayload();
    await POST(makePostRequest(body));
    const insertValues = mockDbInsert.mock.results[0].value.values.mock.calls[0][0];
    const contextStr = JSON.stringify(insertValues.context);
    expect(contextStr).not.toContain('971501234567');
    expect(contextStr).not.toContain('+971');
  });

  it('stores wa_message_id in context for idempotency', async () => {
    setupHappyPathDb();
    const { POST } = await import('./route');
    const body = makeMetaPayload();
    await POST(makePostRequest(body));
    const insertValues = mockDbInsert.mock.results[0].value.values.mock.calls[0][0];
    const ctx = insertValues.context as Record<string, unknown>;
    expect(ctx.wa_message_id).toBe('wamid.test001');
  });

  it('calls auditTaskCreated and auditPlanGenerated', async () => {
    setupHappyPathDb();
    const { POST } = await import('./route');
    const body = makeMetaPayload();
    await POST(makePostRequest(body));
    expect(mockAuditTaskCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG_ID,
        intentType: 'ROUTE_WHATSAPP_INQUIRY',
        initiatorRole: 'OWNER',
      }),
    );
    expect(mockAuditPlanGenerated).toHaveBeenCalledWith(
      expect.objectContaining({ stepCount: 3 }),
    );
  });

  it('parent_task_id is null (root task, no parent)', async () => {
    setupHappyPathDb();
    const { POST } = await import('./route');
    const body = makeMetaPayload();
    await POST(makePostRequest(body));
    const insertValues = mockDbInsert.mock.results[0].value.values.mock.calls[0][0];
    expect(insertValues.parent_task_id).toBeNull();
  });
});

describe('POST /api/webhooks/whatsapp — idempotency', () => {
  beforeEach(() => {
    vi.stubEnv('WHATSAPP_APP_SECRET', APP_SECRET);
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', PHONE_NUMBER_ID);
    vi.stubEnv('DREXONYX_ORG_ID', ORG_ID);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('skips insert when message was already processed', async () => {
    // isAlreadyProcessed → returns existing task
    const selectChain = { from: vi.fn(), where: vi.fn(), limit: vi.fn() };
    selectChain.from.mockReturnValue(selectChain);
    selectChain.where.mockReturnValue(selectChain);
    selectChain.limit.mockResolvedValue([{ id: 'existing-task-id' }]); // already processed
    mockDbSelect.mockReturnValue(selectChain);

    const { POST } = await import('./route');
    const body = makeMetaPayload();
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(200);
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it('returns 200 even when DB insert fails (absorb errors)', async () => {
    // isAlreadyProcessed → not found, owner found
    const selectChain = { from: vi.fn(), where: vi.fn(), limit: vi.fn() };
    selectChain.from.mockReturnValue(selectChain);
    selectChain.where.mockReturnValue(selectChain);
    selectChain.limit
      .mockResolvedValueOnce([])                            // isAlreadyProcessed → not found
      .mockResolvedValueOnce([{ user_id: OWNER_USER_ID }]); // resolveOwnerUserId → owner found
    mockDbSelect.mockReturnValue(selectChain);

    mockDbInsert.mockReturnValue({
      values: vi.fn().mockRejectedValue(new Error('DB error')),
    });

    const { POST } = await import('./route');
    const body = makeMetaPayload();
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ received: true });
  });
});

describe('POST /api/webhooks/whatsapp — org isolation', () => {
  beforeEach(() => {
    vi.stubEnv('WHATSAPP_APP_SECRET', APP_SECRET);
    vi.stubEnv('DREXONYX_ORG_ID', ORG_ID);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('skips messages for unknown phone number IDs', async () => {
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', 'different-phone-id');
    const { POST } = await import('./route');
    const body = makeMetaPayload(); // uses PHONE_NUMBER_ID, not 'different-phone-id'
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(200);
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it('returns 200 org_mapping_not_configured when WHATSAPP_PHONE_NUMBER_ID not set', async () => {
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    const { POST } = await import('./route');
    const body = makeMetaPayload();
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ received: true, status: 'org_mapping_not_configured' });
  });
});

describe('POST /api/webhooks/whatsapp — payload handling', () => {
  beforeEach(() => {
    vi.stubEnv('WHATSAPP_APP_SECRET', APP_SECRET);
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', PHONE_NUMBER_ID);
    vi.stubEnv('DREXONYX_ORG_ID', ORG_ID);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('returns 200 parse_error for malformed JSON', async () => {
    const { POST } = await import('./route');
    const body = '{invalid json}';
    const req = makePostRequest(body, signBody(body));
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ status: 'parse_error' });
  });

  it('ignores non-whatsapp_business_account payloads', async () => {
    const { POST } = await import('./route');
    const body = JSON.stringify({ object: 'page', entry: [] });
    const req = makePostRequest(body);
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it('skips non-text message types (e.g., image)', async () => {
    const { POST } = await import('./route');
    const payload = makeMetaPayload();
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const entry = (parsed.entry as Record<string, unknown>[])[0];
    const change = (entry.changes as Record<string, unknown>[])[0];
    const value = change.value as Record<string, unknown>;
    const messages = value.messages as Record<string, unknown>[];
    messages[0] = { ...messages[0], type: 'image' }; // override to non-text
    const body = JSON.stringify(parsed);
    const req = makePostRequest(body);
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it('skips messages with no text body', async () => {
    const { POST } = await import('./route');
    const payload = makeMetaPayload();
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const entry = (parsed.entry as Record<string, unknown>[])[0];
    const change = (entry.changes as Record<string, unknown>[])[0];
    const value = change.value as Record<string, unknown>;
    const messages = value.messages as Record<string, unknown>[];
    messages[0] = { ...messages[0], text: { body: '   ' } }; // whitespace only
    const body = JSON.stringify(parsed);
    const req = makePostRequest(body);
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it('skips when no OWNER user found for org', async () => {
    // isAlreadyProcessed → not found, but no owner user
    const selectChain = { from: vi.fn(), where: vi.fn(), limit: vi.fn() };
    selectChain.from.mockReturnValue(selectChain);
    selectChain.where.mockReturnValue(selectChain);
    selectChain.limit
      .mockResolvedValueOnce([]) // isAlreadyProcessed: not found
      .mockResolvedValueOnce([]); // resolveOwnerUserId: no owner
    mockDbSelect.mockReturnValue(selectChain);

    // Note: select is called for isAlreadyProcessed first, then resolveOwnerUserId
    const { POST } = await import('./route');
    const body = makeMetaPayload();
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(200);
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it('never echoes WHATSAPP_APP_SECRET in response', async () => {
    const { POST } = await import('./route');
    const body = makeMetaPayload();
    const req = makePostRequest(body, 'sha256=deadbeef'); // invalid sig
    const res = await POST(req);
    const text = await res.text();
    expect(text).not.toContain(APP_SECRET);
  });
});

// ─── verifyMetaSignature unit tests ──────────────────────────────────────────

describe('verifyMetaSignature', () => {
  it('returns true for valid sha256 signature', async () => {
    const { verifyMetaSignature } = await import('./route');
    const body = 'test payload';
    const sig = signBody(body);
    expect(verifyMetaSignature(APP_SECRET, body, sig)).toBe(true);
  });

  it('returns false for wrong secret', async () => {
    const { verifyMetaSignature } = await import('./route');
    const body = 'test payload';
    const sig = signBody(body, 'wrong-secret');
    expect(verifyMetaSignature(APP_SECRET, body, sig)).toBe(false);
  });

  it('returns false when header is null', async () => {
    const { verifyMetaSignature } = await import('./route');
    expect(verifyMetaSignature(APP_SECRET, 'body', null)).toBe(false);
  });

  it('returns false when header lacks sha256= prefix', async () => {
    const { verifyMetaSignature } = await import('./route');
    const body = 'test payload';
    const raw = createHmac('sha256', APP_SECRET).update(body, 'utf8').digest('hex');
    expect(verifyMetaSignature(APP_SECRET, body, raw)).toBe(false);
  });

  it('returns false for truncated signature', async () => {
    const { verifyMetaSignature } = await import('./route');
    const body = 'test payload';
    const sig = signBody(body).slice(0, -4);
    expect(verifyMetaSignature(APP_SECRET, body, sig)).toBe(false);
  });

  it('returns false for empty signature value', async () => {
    const { verifyMetaSignature } = await import('./route');
    expect(verifyMetaSignature(APP_SECRET, 'body', 'sha256=')).toBe(false);
  });
});
