import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSelect } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: { select: mockSelect },
}));

// ─── Chain builder ────────────────────────────────────────────────────────────
// Builds a Drizzle-like fluent chain that resolves to `result` at any terminal
// point: await on where(), orderBy(), or limit().

function makeSelectChain(result: unknown[]) {
  const asPromise = Promise.resolve(result);

  const withLimit = {
    then: asPromise.then.bind(asPromise),
    limit: vi.fn().mockResolvedValue(result),
  };

  const terminal: Record<string, unknown> = {
    then: asPromise.then.bind(asPromise),
    orderBy: vi.fn().mockReturnValue(withLimit),
    limit: vi.fn().mockResolvedValue(result),
  };

  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    where: vi.fn().mockReturnValue(terminal),
    orderBy: vi.fn().mockReturnValue(terminal),
  };
  chain.from.mockReturnValue(chain);
  return chain;
}

import {
  getPaymentStatuses,
  getPaymentAlerts,
  getRecentLedgerEntries,
  getOrderBudgetStatuses,
  getExpenseSummaries,
  getProviderCreditStatuses,
  getReserveStatuses,
  buildFinancialStatusReport,
} from '../monitoring';

const ORG = 'org-abc';
const NOW = new Date('2026-09-17T00:00:00Z');

// ─── getPaymentStatuses ────────────────────────────────────────────────────────

describe('getPaymentStatuses', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns payment summaries from the DB', async () => {
    const rows = [
      { id: 'p1', order_id: 'o1', status: 'PAID', currency: 'AED', paid_at: NOW, refunded_at: null, created_at: NOW },
    ];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getPaymentStatuses(ORG);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
    expect(result[0].status).toBe('PAID');
  });

  it('returns empty array when no payments exist', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const result = await getPaymentStatuses(ORG);

    expect(result).toEqual([]);
  });

  it('calls select and chains from+where', async () => {
    const chain = makeSelectChain([]);
    mockSelect.mockReturnValue(chain);

    await getPaymentStatuses(ORG);

    expect(mockSelect).toHaveBeenCalled();
    expect(chain.from).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalled();
  });
});

// ─── getPaymentAlerts ──────────────────────────────────────────────────────────

describe('getPaymentAlerts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps FAILED payments to FAILED alertType', async () => {
    const rows = [{ id: 'p1', order_id: 'o1', status: 'FAILED', currency: 'AED', created_at: NOW }];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getPaymentAlerts(ORG);

    expect(result).toHaveLength(1);
    expect(result[0].alertType).toBe('FAILED');
    expect(result[0].paymentId).toBe('p1');
  });

  it('maps CHARGEBACK payments to CHARGEBACK alertType', async () => {
    const rows = [{ id: 'p2', order_id: 'o2', status: 'CHARGEBACK', currency: 'AED', created_at: NOW }];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getPaymentAlerts(ORG);

    expect(result[0].alertType).toBe('CHARGEBACK');
  });

  it('maps REFUNDED payments to REFUNDED alertType', async () => {
    const rows = [{ id: 'p3', order_id: 'o3', status: 'REFUNDED', currency: 'AED', created_at: NOW }];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getPaymentAlerts(ORG);

    expect(result[0].alertType).toBe('REFUNDED');
  });

  it('maps overdue PENDING payments to PENDING_OVERDUE alertType', async () => {
    const oldDate = new Date(Date.now() - 2 * 86_400_000); // 2 days ago
    const rows = [{ id: 'p4', order_id: 'o4', status: 'PENDING', currency: 'AED', created_at: oldDate }];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getPaymentAlerts(ORG);

    expect(result[0].alertType).toBe('PENDING_OVERDUE');
  });

  it('returns empty array when no alert conditions exist', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const result = await getPaymentAlerts(ORG);

    expect(result).toEqual([]);
  });

  it('does not expose payment amounts', async () => {
    const rows = [{ id: 'p1', order_id: 'o1', status: 'FAILED', currency: 'AED', created_at: NOW }];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getPaymentAlerts(ORG);

    // Verify no amount field is present in the alert object
    expect(result[0]).not.toHaveProperty('amount');
  });
});

// ─── getRecentLedgerEntries ────────────────────────────────────────────────────

describe('getRecentLedgerEntries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns ledger entry summaries', async () => {
    const rows = [
      {
        id: 'le1',
        entry_type: 'CLIENT_PAYMENT',
        currency: 'AED',
        reference_entity_type: 'payment',
        reference_entity_id: 'p1',
        created_at: NOW,
      },
    ];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getRecentLedgerEntries(ORG);

    expect(result).toHaveLength(1);
    expect(result[0].entry_type).toBe('CLIENT_PAYMENT');
  });

  it('does not include amount in returned entries', async () => {
    const rows = [
      {
        id: 'le1',
        entry_type: 'CLIENT_PAYMENT',
        currency: 'AED',
        reference_entity_type: 'payment',
        reference_entity_id: 'p1',
        created_at: NOW,
      },
    ];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getRecentLedgerEntries(ORG);

    expect(result[0]).not.toHaveProperty('amount');
  });

  it('returns empty array when no ledger entries exist', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const result = await getRecentLedgerEntries(ORG);

    expect(result).toEqual([]);
  });
});

// ─── getOrderBudgetStatuses ───────────────────────────────────────────────────

describe('getOrderBudgetStatuses', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns budget status (no amounts exposed)', async () => {
    const rows = [
      {
        order_id: 'o1',
        estimated_amount: '1000',
        actual_amount: '950',
        created_at: NOW,
        updated_at: NOW,
      },
    ];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getOrderBudgetStatuses(ORG);

    expect(result).toHaveLength(1);
    expect(result[0].order_id).toBe('o1');
    expect(result[0].hasActualAmount).toBe(true);
    expect(result[0].hasEstimatedAmount).toBe(true);
    // Raw amounts must not be exposed
    expect(result[0]).not.toHaveProperty('estimated_amount');
    expect(result[0]).not.toHaveProperty('actual_amount');
    expect(result[0]).not.toHaveProperty('planned_amount');
  });

  it('reports hasActualAmount: false when actual_amount is null', async () => {
    const rows = [
      {
        order_id: 'o2',
        estimated_amount: '1000',
        actual_amount: null,
        created_at: NOW,
        updated_at: NOW,
      },
    ];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getOrderBudgetStatuses(ORG);

    expect(result[0].hasActualAmount).toBe(false);
    expect(result[0].hasEstimatedAmount).toBe(true);
  });

  it('reports hasEstimatedAmount: false when estimated_amount is null', async () => {
    const rows = [
      {
        order_id: 'o3',
        estimated_amount: null,
        actual_amount: null,
        created_at: NOW,
        updated_at: NOW,
      },
    ];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getOrderBudgetStatuses(ORG);

    expect(result[0].hasEstimatedAmount).toBe(false);
    expect(result[0].hasActualAmount).toBe(false);
  });
});

// ─── getExpenseSummaries ───────────────────────────────────────────────────────

describe('getExpenseSummaries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns expense summaries without amounts', async () => {
    const rows = [
      {
        id: 'e1',
        order_budget_id: 'ob1',
        currency: 'AED',
        expense_type: 'AI_GENERATION_EXPENSE',
        created_at: NOW,
      },
    ];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getExpenseSummaries(ORG);

    expect(result).toHaveLength(1);
    expect(result[0].expense_type).toBe('AI_GENERATION_EXPENSE');
    expect(result[0]).not.toHaveProperty('amount');
  });

  it('returns empty array when no expenses exist', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const result = await getExpenseSummaries(ORG);

    expect(result).toEqual([]);
  });
});

// ─── getProviderCreditStatuses ─────────────────────────────────────────────────

describe('getProviderCreditStatuses', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns provider credit statuses', async () => {
    const rows = [
      {
        id: 'pc1',
        provider: 'higgsfield',
        currency: 'USD',
        status: 'ACTIVE',
        expires_at: new Date(Date.now() + 30 * 86_400_000),
        archived_at: null,
        created_at: NOW,
      },
    ];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getProviderCreditStatuses(ORG);

    expect(result).toHaveLength(1);
    expect(result[0].provider).toBe('higgsfield');
    expect(result[0].status).toBe('ACTIVE');
    expect(result[0]).not.toHaveProperty('amount');
  });

  it('marks credits expiring within 7 days as isExpiringSoon=true', async () => {
    const soonExpiry = new Date(Date.now() + 2 * 86_400_000); // 2 days
    const rows = [
      {
        id: 'pc2',
        provider: 'higgsfield',
        currency: 'USD',
        status: 'ACTIVE',
        expires_at: soonExpiry,
        archived_at: null,
        created_at: NOW,
      },
    ];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getProviderCreditStatuses(ORG);

    expect(result[0].isExpiringSoon).toBe(true);
  });

  it('marks credits NOT expiring soon as isExpiringSoon=false', async () => {
    const farExpiry = new Date(Date.now() + 30 * 86_400_000); // 30 days
    const rows = [
      {
        id: 'pc3',
        provider: 'higgsfield',
        currency: 'USD',
        status: 'ACTIVE',
        expires_at: farExpiry,
        archived_at: null,
        created_at: NOW,
      },
    ];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getProviderCreditStatuses(ORG);

    expect(result[0].isExpiringSoon).toBe(false);
  });

  it('marks CONSUMED credits as isExpiringSoon=false regardless of expiry date', async () => {
    const rows = [
      {
        id: 'pc4',
        provider: 'higgsfield',
        currency: 'USD',
        status: 'CONSUMED',
        expires_at: new Date(Date.now() + 1 * 86_400_000),
        archived_at: null,
        created_at: NOW,
      },
    ];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getProviderCreditStatuses(ORG);

    expect(result[0].isExpiringSoon).toBe(false);
  });

  it('marks credits with no expiry date as isExpiringSoon=false', async () => {
    const rows = [
      {
        id: 'pc5',
        provider: 'higgsfield',
        currency: 'USD',
        status: 'ACTIVE',
        expires_at: null,
        archived_at: null,
        created_at: NOW,
      },
    ];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getProviderCreditStatuses(ORG);

    expect(result[0].isExpiringSoon).toBe(false);
  });
});

// ─── getReserveStatuses ────────────────────────────────────────────────────────

describe('getReserveStatuses', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns reserve statuses without amounts', async () => {
    const rows = [
      {
        id: 'r1',
        currency: 'AED',
        reserve_type: 'OPERATIONAL',
        status: 'ACTIVE',
        archived_at: null,
        created_at: NOW,
        updated_at: NOW,
      },
    ];
    mockSelect.mockReturnValue(makeSelectChain(rows));

    const result = await getReserveStatuses(ORG);

    expect(result).toHaveLength(1);
    expect(result[0].reserve_type).toBe('OPERATIONAL');
    expect(result[0]).not.toHaveProperty('amount');
  });

  it('returns empty array when no reserves exist', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const result = await getReserveStatuses(ORG);

    expect(result).toEqual([]);
  });
});

// ─── buildFinancialStatusReport ────────────────────────────────────────────────

describe('buildFinancialStatusReport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a report with organizationId and generatedAt', async () => {
    // 3 db.select() calls: getPaymentAlerts, getProviderCreditStatuses, getRecentLedgerEntries
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))  // getPaymentAlerts
      .mockReturnValueOnce(makeSelectChain([]))  // getProviderCreditStatuses
      .mockReturnValueOnce(makeSelectChain([])); // getRecentLedgerEntries

    const result = await buildFinancialStatusReport(ORG);

    expect(result.organizationId).toBe(ORG);
    expect(typeof result.generatedAt).toBe('string');
  });

  it('hasAlerts=false when no alerts exist', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const result = await buildFinancialStatusReport(ORG);

    expect(result.hasAlerts).toBe(false);
    expect(result.paymentAlerts).toHaveLength(0);
    expect(result.expiringCredits).toHaveLength(0);
  });

  it('hasAlerts=true when payment alerts exist', async () => {
    const failedPayment = [{ id: 'p1', order_id: 'o1', status: 'FAILED', currency: 'AED', created_at: NOW }];
    mockSelect
      .mockReturnValueOnce(makeSelectChain(failedPayment))  // getPaymentAlerts
      .mockReturnValueOnce(makeSelectChain([]))              // getProviderCreditStatuses
      .mockReturnValueOnce(makeSelectChain([]));             // getRecentLedgerEntries

    const result = await buildFinancialStatusReport(ORG);

    expect(result.hasAlerts).toBe(true);
    expect(result.paymentAlerts).toHaveLength(1);
  });

  it('hasAlerts=true when expiring credits exist', async () => {
    const soonExpiry = new Date(Date.now() + 2 * 86_400_000);
    const expiringCredit = [{
      id: 'pc1',
      provider: 'higgsfield',
      currency: 'USD',
      status: 'ACTIVE',
      expires_at: soonExpiry,
      archived_at: null,
      created_at: NOW,
    }];
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))            // getPaymentAlerts
      .mockReturnValueOnce(makeSelectChain(expiringCredit)) // getProviderCreditStatuses
      .mockReturnValueOnce(makeSelectChain([]));            // getRecentLedgerEntries

    const result = await buildFinancialStatusReport(ORG);

    expect(result.hasAlerts).toBe(true);
    expect(result.expiringCredits).toHaveLength(1);
  });

  it('does not expose amounts in the report', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const result = await buildFinancialStatusReport(ORG);

    expect(result).not.toHaveProperty('totalRevenue');
    expect(result).not.toHaveProperty('grossMargin');
    expect(result).not.toHaveProperty('estimatedCost');
    expect(result).not.toHaveProperty('aiCost');
  });

  it('ledgerEntryCount reflects returned ledger entries', async () => {
    const ledgerRows = [
      { id: 'le1', entry_type: 'CLIENT_PAYMENT', currency: 'AED', reference_entity_type: 'payment', reference_entity_id: 'p1', created_at: NOW },
      { id: 'le2', entry_type: 'CLIENT_PAYMENT', currency: 'AED', reference_entity_type: 'payment', reference_entity_id: 'p2', created_at: NOW },
    ];
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain(ledgerRows));

    const result = await buildFinancialStatusReport(ORG);

    expect(result.ledgerEntryCount).toBe(2);
  });
});
