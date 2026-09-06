import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockAuth,
  mockSelect, mockInsert, mockUpdate, mockTransaction,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mockAuth }));

vi.mock('@/db/index', () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate, transaction: mockTransaction },
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-uuid' }));

import { type NextRequest } from 'next/server';
import { POST } from '../../app/api/agent/jobs/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(role: string) {
  return { user: { userId: 'user1', organizationId: 'org1', role } };
}

function makeRequest(body: object): Request {
  return new Request('http://localhost/api/agent/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  orderId: 'order1',
  provider: 'higgsfield',
  model: 'hf-video-01',
  prompt: 'Generate a video of mountains',
  params: { input_file_key: 'higgsfield/org1/asset1/generation' },
};

// ─── Authentication and authorization ─────────────────────────────────────────

describe('POST /api/agent/jobs — authentication', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when no session', async () => {
    mockAuth.mockResolvedValue(null);
    const req = makeRequest(validBody);
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(401);
  });

  it('returns 403 when role is CLIENT', async () => {
    mockAuth.mockResolvedValue(makeSession('CLIENT'));
    const req = makeRequest(validBody);
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(403);
  });

  it('returns 403 when role is QC', async () => {
    mockAuth.mockResolvedValue(makeSession('QC'));
    const req = makeRequest(validBody);
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(403);
  });

  it('returns 403 when role is CREATIVE_PRODUCTION', async () => {
    mockAuth.mockResolvedValue(makeSession('CREATIVE_PRODUCTION'));
    const req = makeRequest(validBody);
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(403);
  });
});

// ─── Input validation ─────────────────────────────────────────────────────────

describe('POST /api/agent/jobs — input validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(makeSession('OWNER'));
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost/api/agent/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(400);
  });

  it('returns 400 when orderId is missing', async () => {
    const req = makeRequest({ ...validBody, orderId: undefined });
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(400);
  });

  it('returns 400 when provider is missing', async () => {
    const req = makeRequest({ ...validBody, provider: undefined });
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(400);
  });

  it('returns 400 when model is missing', async () => {
    const req = makeRequest({ ...validBody, model: undefined });
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(400);
  });

  it('returns 400 when prompt is missing', async () => {
    const req = makeRequest({ ...validBody, prompt: undefined });
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(400);
  });
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('POST /api/agent/jobs — happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeTransactionMock() {
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
      };
      await fn(tx);
    });
  }

  it('returns 201 with productionJobId and aiGenerationId for OWNER', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));
    makeTransactionMock();

    const req = makeRequest(validBody);
    const res = await POST(req as unknown as NextRequest);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.productionJobId).toBe('test-uuid');
    expect(body.aiGenerationId).toBe('test-uuid');
  });

  it('returns 201 with productionJobId and aiGenerationId for ADMIN_OPERATIONS', async () => {
    mockAuth.mockResolvedValue(makeSession('ADMIN_OPERATIONS'));
    makeTransactionMock();

    const req = makeRequest(validBody);
    const res = await POST(req as unknown as NextRequest);

    expect(res.status).toBe(201);
  });

  // DR 0080 §2.3: ProductionJob must be AI_GENERATION type and QUEUED; AiGeneration REQUESTED
  it('inserts ProductionJob with job_type=AI_GENERATION and status=QUEUED', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));

    let capturedJobInsert: Record<string, unknown> | null = null;
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockImplementation((vals: unknown) => {
            const v = vals as Record<string, unknown>;
            if (v.job_type) capturedJobInsert = v;
            return Promise.resolve([]);
          }),
        })),
      };
      await fn(tx);
    });

    const req = makeRequest(validBody);
    await POST(req as unknown as NextRequest);

    expect(capturedJobInsert).not.toBeNull();
    expect(capturedJobInsert!.job_type).toBe('AI_GENERATION');
    expect(capturedJobInsert!.status).toBe('QUEUED');
    expect(capturedJobInsert!.organization_id).toBe('org1');
    expect(capturedJobInsert!.order_id).toBe('order1');
  });

  it('inserts AiGeneration with status=REQUESTED', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));

    let capturedGenInsert: Record<string, unknown> | null = null;
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockImplementation((vals: unknown) => {
            const v = vals as Record<string, unknown>;
            if (v.provider) capturedGenInsert = v;
            return Promise.resolve([]);
          }),
        })),
      };
      await fn(tx);
    });

    const req = makeRequest(validBody);
    await POST(req as unknown as NextRequest);

    expect(capturedGenInsert).not.toBeNull();
    expect(capturedGenInsert!.status).toBe('REQUESTED');
    expect(capturedGenInsert!.provider).toBe('higgsfield');
    expect(capturedGenInsert!.model).toBe('hf-video-01');
  });

  // DR 0080 §2.7: PRODUCTION_JOB_CREATED audit event emitted with correct actor identity
  it('emits PRODUCTION_JOB_CREATED audit event with user actor identity', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));

    let capturedAuditInsert: Record<string, unknown> | null = null;
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockImplementation((vals: unknown) => {
            const v = vals as Record<string, unknown>;
            if (v.action) capturedAuditInsert = v;
            return Promise.resolve([]);
          }),
        })),
      };
      await fn(tx);
    });

    const req = makeRequest(validBody);
    await POST(req as unknown as NextRequest);

    expect(capturedAuditInsert).not.toBeNull();
    expect(capturedAuditInsert!.action).toBe('PRODUCTION_JOB_CREATED');
    expect(capturedAuditInsert!.actor_id).toBe('user1');
    expect(capturedAuditInsert!.actor_role).toBe('OWNER');
    expect(capturedAuditInsert!.entity_type).toBe('production_job');
  });

  it('accepts request with no params field (uses empty object)', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));
    makeTransactionMock();

    const req = makeRequest({ orderId: 'order1', provider: 'higgsfield', model: 'hf-video-01', prompt: 'test' });
    const res = await POST(req as unknown as NextRequest);

    expect(res.status).toBe(201);
  });
});

// ─── Transaction failure ──────────────────────────────────────────────────────

describe('POST /api/agent/jobs — transaction failure', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 500 when transaction throws', async () => {
    mockAuth.mockResolvedValue(makeSession('OWNER'));
    mockTransaction.mockRejectedValue(new Error('constraint violation'));

    const req = makeRequest(validBody);
    const res = await POST(req as unknown as NextRequest);

    expect(res.status).toBe(500);
  });
});
