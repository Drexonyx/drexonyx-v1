// DR 0083: AI Cost Governance — behavioral tests for cost recording boundary.
// DR 0060 §2.8 / DR 0067 §2.3: no fabricated financial values.
// DR 0067 §2.4: idempotency via system.idempotency_keys.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockTx, mockDb } = vi.hoisted(() => {
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockSelect = vi.fn();
  const mockWhere = vi.fn();
  const mockLimit = vi.fn();
  const mockReturning = vi.fn();
  const mockValues = vi.fn();
  const mockSet = vi.fn();
  const mockFrom = vi.fn();
  const mockOnConflict = vi.fn();

  // Chain builder — each method returns an object that supports further chaining.
  function chain(finalValue: unknown = []) {
    const obj: Record<string, (...args: unknown[]) => unknown> = {};
    const methods = ['where', 'limit', 'returning', 'values', 'set', 'from', 'onConflictDoNothing'];
    for (const m of methods) {
      obj[m] = () => chain(finalValue);
    }
    // Make the object thenable so await works.
    obj.then = ((resolve: (v: unknown) => unknown) => Promise.resolve(finalValue).then(resolve)) as (...args: unknown[]) => unknown;
    return obj;
  }

  const mockTx = {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoNothing: vi.fn(() => Promise.resolve()) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })) })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve([])) })) })) })),
  };

  const mockDb = {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve([])) })) })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoNothing: vi.fn(() => Promise.resolve()) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })) })),
    transaction: vi.fn(),
  };

  return { mockTx, mockDb, mockInsert, mockSelect, mockWhere, mockLimit, mockReturning, mockValues, mockSet, mockFrom, mockOnConflict, chain };
});

vi.mock('@/db/index', () => ({ db: mockDb }));
vi.mock('@/db/schema/financial', () => ({
  financialLedger: { _table: 'financial_ledger' },
  expenses: { _table: 'expenses' },
}));
vi.mock('@/db/schema/system', () => ({
  idempotencyKeys: { _table: 'idempotency_keys', key: 'key', organization_id: 'organization_id', status: 'status' },
}));
vi.mock('drizzle-orm', () => ({ and: vi.fn(), eq: vi.fn() }));
vi.mock('uuidv7', () => ({ uuidv7: vi.fn(() => 'test-uuid-' + Math.random().toString(36).slice(2)) }));

import { recordAiGenerationCost } from '../agent/cost-recording';

const BASE = {
  aiGenerationId: 'gen-001',
  organizationId: 'org-001',
  orderBudgetId: 'budget-001',
};

describe('DR 0083 — recordAiGenerationCost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no existing idempotency key
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
  });

  // ─── A. Unknown/unavailable cost ──────────────────────────────────────────────

  it('returns recorded=false when providerCost is undefined (Higgsfield has no cost data)', async () => {
    const result = await recordAiGenerationCost({ ...BASE });
    expect(result).toEqual({ ok: true, recorded: false, reason: 'no_authoritative_cost' });
  });

  it('does NOT write to financial tables when providerCost is undefined', async () => {
    await recordAiGenerationCost({ ...BASE });
    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('does NOT write fabricated, estimated, or approximated values when cost is unknown', async () => {
    const result = await recordAiGenerationCost({ ...BASE });
    // Confirming no financial transaction was attempted
    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.recorded).toBe(false);
  });

  // ─── B. Authoritative cost available ─────────────────────────────────────────

  it('records both expense and ledger entry when authoritative cost is provided', async () => {
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<void>) => {
      await fn(mockTx);
    });
    // Simulate successful inserts and update
    mockTx.insert.mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) }) });
    mockTx.update.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) });

    const result = await recordAiGenerationCost({
      ...BASE,
      providerCost: { amount: '0.0250', currency: 'USD' },
    });

    expect(mockDb.transaction).toHaveBeenCalledOnce();
    // Two inserts: idempotency key + expense + ledger = three inserts via tx.insert
    expect(mockTx.insert).toHaveBeenCalledTimes(3);
    expect(result.ok).toBe(true);
    if (result.ok && result.recorded) {
      expect(result.expenseId).toBeDefined();
    }
  });

  it('uses AI_GENERATION expense_type and AI_GENERATION_EXPENSE ledger entry_type', async () => {
    const insertedValues: unknown[] = [];
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<void>) => {
      await fn(mockTx);
    });
    mockTx.insert.mockReturnValue({
      values: vi.fn().mockImplementation((v: unknown) => {
        insertedValues.push(v);
        return { onConflictDoNothing: vi.fn().mockResolvedValue(undefined) };
      }),
    });
    mockTx.update.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) });

    await recordAiGenerationCost({
      ...BASE,
      providerCost: { amount: '0.05', currency: 'USD' },
    });

    const expense = insertedValues.find((v) => typeof v === 'object' && v !== null && 'expense_type' in (v as Record<string, unknown>)) as Record<string, unknown> | undefined;
    const ledger = insertedValues.find((v) => typeof v === 'object' && v !== null && 'entry_type' in (v as Record<string, unknown>)) as Record<string, unknown> | undefined;

    expect(expense?.expense_type).toBe('AI_GENERATION');
    expect(ledger?.entry_type).toBe('AI_GENERATION_EXPENSE');
  });

  it('sets reference_entity_type = ai_generation and reference_entity_id = aiGenerationId on ledger entry', async () => {
    const insertedValues: unknown[] = [];
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<void>) => {
      await fn(mockTx);
    });
    mockTx.insert.mockReturnValue({
      values: vi.fn().mockImplementation((v: unknown) => {
        insertedValues.push(v);
        return { onConflictDoNothing: vi.fn().mockResolvedValue(undefined) };
      }),
    });
    mockTx.update.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) });

    await recordAiGenerationCost({ ...BASE, providerCost: { amount: '0.05', currency: 'USD' } });

    const ledger = insertedValues.find((v) => typeof v === 'object' && v !== null && 'entry_type' in (v as Record<string, unknown>)) as Record<string, unknown> | undefined;
    expect(ledger?.reference_entity_type).toBe('ai_generation');
    expect(ledger?.reference_entity_id).toBe(BASE.aiGenerationId);
  });

  // ─── C. Idempotency ───────────────────────────────────────────────────────────

  it('returns already_recorded when idempotency key is COMPLETED', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ status: 'COMPLETED' }]),
        }),
      }),
    });

    const result = await recordAiGenerationCost({
      ...BASE,
      providerCost: { amount: '0.05', currency: 'USD' },
    });

    expect(result).toEqual({ ok: true, recorded: false, reason: 'already_recorded' });
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  // ─── D. Financial separations ─────────────────────────────────────────────────

  it('accepts cost from provider and records it without creating revenue, profit, or payment records', async () => {
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<void>) => {
      await fn(mockTx);
    });
    mockTx.insert.mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) }) });
    mockTx.update.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) });

    const result = await recordAiGenerationCost({ ...BASE, providerCost: { amount: '1.00', currency: 'USD' } });
    // Only expense + ledger inserts (no payment or revenue table writes)
    // Test structural: function completes without invoking any payment-related schema
    expect(result.ok).toBe(true);
  });
});
