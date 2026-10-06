import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── DB mock ───────────────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockUpdate } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('@/db/index', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  },
}));

vi.mock('uuidv7', () => ({ uuidv7: () => 'test-uuid-generated' }));

import {
  checkSalesDeduplicate,
  handleSalesStatusTransition,
} from '../orchestration/sales-writer';

// ── Chain helpers ─────────────────────────────────────────────────────────────

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

// ── Task steps prior output ───────────────────────────────────────────────────

function mockPriorSteps(steps: Array<{ step_index: number; skill_id: string | null; output: Record<string, unknown> }>) {
  // First select call = leadSources dedup (returns [])
  // Second+ calls = taskSteps for getPriorStepOutputs
  let callCount = 0;
  mockSelect.mockImplementation(() => {
    callCount++;
    const result = callCount === 1 ? [] : steps;
    const fromFn = makeSelectChain(result as unknown[]);
    return { from: fromFn };
  });
}

beforeEach(() => vi.clearAllMocks());

// ── checkSalesDeduplicate ─────────────────────────────────────────────────────

describe('checkSalesDeduplicate', () => {
  it('returns false when no matching source exists', async () => {
    const fromFn = makeSelectChain([]);
    mockSelect.mockReturnValue({ from: fromFn });

    const result = await checkSalesDeduplicate({ platform: 'instagram', identifier: '@acme' });
    expect(result).toBe(false);
  });

  it('returns true when a matching source exists', async () => {
    const fromFn = makeSelectChain([{ id: 'existing-id' }]);
    mockSelect.mockReturnValue({ from: fromFn });

    const result = await checkSalesDeduplicate({ platform: 'instagram', identifier: '@acme' });
    expect(result).toBe(true);
  });
});

// ── handleSalesStatusTransition ───────────────────────────────────────────────

describe('handleSalesStatusTransition', () => {
  const BASE_PARAMS = {
    taskId: 'task-123',
    organizationId: 'org-test',
    stepIndex: 2,
  };

  describe('unknown entity type', () => {
    it('returns ok:false for unrecognised entity type', async () => {
      const fromFn = makeSelectChain([]);
      mockSelect.mockReturnValue({ from: fromFn });

      const result = await handleSalesStatusTransition({
        ...BASE_PARAMS,
        entityType: 'sales_unknown',
        entityId: undefined,
        newStatus: 'NEW',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain('Unknown sales entity type');
    });
  });

  describe('sales_lead: create (NEW)', () => {
    function setupLeadCreate(discoverOutput: Record<string, unknown>) {
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        const rows = callCount === 1
          ? [{ step_index: 1, skill_id: 'sales.lead.discover', output: discoverOutput }]
          : [];
        const fromFn = makeSelectChain(rows);
        return { from: fromFn };
      });
      const valuesFn = makeInsertChain();
      mockInsert.mockReturnValue({ values: valuesFn });
    }

    it('inserts a new lead and returns ok:true with created:true', async () => {
      setupLeadCreate({ businessName: 'Acme Fashion', country: 'UAE' });
      const result = await handleSalesStatusTransition({
        ...BASE_PARAMS,
        entityType: 'sales_lead',
        entityId: undefined,
        newStatus: 'NEW',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.created).toBe(true);
        expect(typeof result.entityId).toBe('string');
      }
    });

    it('returns ok:false when businessName is missing from discover output', async () => {
      setupLeadCreate({ country: 'UAE' });
      const result = await handleSalesStatusTransition({
        ...BASE_PARAMS,
        entityType: 'sales_lead',
        entityId: undefined,
        newStatus: 'NEW',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain('businessName');
    });

    it('calls db.insert exactly once for a new lead', async () => {
      setupLeadCreate({ businessName: 'Test Co' });
      await handleSalesStatusTransition({
        ...BASE_PARAMS,
        entityType: 'sales_lead',
        entityId: undefined,
        newStatus: 'NEW',
      });
      expect(mockInsert).toHaveBeenCalledOnce();
    });
  });

  describe('sales_lead: update (existing entityId)', () => {
    function setupLeadUpdate(skillOutputs: Array<{ skill_id: string; output: Record<string, unknown> }>) {
      const rows = skillOutputs.map((s, i) => ({ step_index: i, ...s }));
      const fromFn = makeSelectChain(rows);
      mockSelect.mockReturnValue({ from: fromFn });
      const setFn = makeUpdateChain();
      mockUpdate.mockReturnValue({ set: setFn });
    }

    it('updates existing lead and returns ok:true with created:false', async () => {
      setupLeadUpdate([
        { skill_id: 'sales.lead.score', output: { score: 75, priority: 'HOT' } },
        { skill_id: 'sales.lead.qualify', output: { qualificationReason: 'Good fit' } },
      ]);
      const result = await handleSalesStatusTransition({
        ...BASE_PARAMS,
        entityType: 'sales_lead',
        entityId: 'lead-abc',
        newStatus: 'QUALIFIED',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.created).toBe(false);
        expect(result.entityId).toBe('lead-abc');
      }
    });

    it('calls db.update once for an existing lead', async () => {
      setupLeadUpdate([]);
      await handleSalesStatusTransition({
        ...BASE_PARAMS,
        entityType: 'sales_lead',
        entityId: 'lead-abc',
        newStatus: 'QUALIFIED',
      });
      expect(mockUpdate).toHaveBeenCalledOnce();
    });
  });

  describe('sales_outreach: create', () => {
    function setupOutreach(draftOutput: Record<string, unknown>) {
      const rows = [{ step_index: 0, skill_id: 'sales.outreach.draft', output: draftOutput }];
      const fromFn = makeSelectChain(rows);
      mockSelect.mockReturnValue({ from: fromFn });
      const valuesFn = makeInsertChain();
      mockInsert.mockReturnValue({ values: valuesFn });
    }

    it('inserts outreach message and returns ok:true', async () => {
      setupOutreach({ messageText: 'Hello Acme!', approvalStatus: 'NOT_REQUIRED' });
      const result = await handleSalesStatusTransition({
        ...BASE_PARAMS,
        entityType: 'sales_outreach',
        entityId: 'lead-abc',
        newStatus: 'DRAFT',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.created).toBe(true);
      }
    });

    it('inserts approval record when approvalStatus is PENDING', async () => {
      setupOutreach({ messageText: 'Proposal draft', approvalStatus: 'PENDING', approvalType: 'PROPOSAL' });
      await handleSalesStatusTransition({
        ...BASE_PARAMS,
        entityType: 'sales_outreach',
        entityId: 'lead-abc',
        newStatus: 'DRAFT',
      });
      // Two inserts: outreachMessages + outreachApprovals
      expect(mockInsert).toHaveBeenCalledTimes(2);
    });

    it('does NOT insert approval record when approvalStatus is NOT_REQUIRED', async () => {
      setupOutreach({ messageText: 'Simple email', approvalStatus: 'NOT_REQUIRED' });
      await handleSalesStatusTransition({
        ...BASE_PARAMS,
        entityType: 'sales_outreach',
        entityId: 'lead-abc',
        newStatus: 'DRAFT',
      });
      // Only one insert: outreachMessages
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    it('returns ok:false when messageText is missing', async () => {
      setupOutreach({ approvalStatus: 'PENDING' });
      const result = await handleSalesStatusTransition({
        ...BASE_PARAMS,
        entityType: 'sales_outreach',
        entityId: 'lead-abc',
        newStatus: 'DRAFT',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain('messageText');
    });

    it('returns ok:false when entityId (leadId) is missing', async () => {
      setupOutreach({ messageText: 'Hello', approvalStatus: 'NOT_REQUIRED' });
      const result = await handleSalesStatusTransition({
        ...BASE_PARAMS,
        entityType: 'sales_outreach',
        entityId: undefined,
        newStatus: 'DRAFT',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain('entityId');
    });
  });

  describe('sales_followup: create', () => {
    function setupFollowUp(qualifyOutput: Record<string, unknown>) {
      const rows = [{ step_index: 0, skill_id: 'sales.lead.qualify', output: qualifyOutput }];
      const fromFn = makeSelectChain(rows);
      mockSelect.mockReturnValue({ from: fromFn });
      const valuesFn = makeInsertChain();
      mockInsert.mockReturnValue({ values: valuesFn });
    }

    it('inserts follow-up and returns ok:true', async () => {
      setupFollowUp({ recommendedChannel: 'email' });
      const result = await handleSalesStatusTransition({
        ...BASE_PARAMS,
        entityType: 'sales_followup',
        entityId: 'lead-abc',
        newStatus: 'PENDING',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.created).toBe(true);
      }
    });

    it('returns ok:false when entityId is missing', async () => {
      setupFollowUp({ recommendedChannel: 'email' });
      const result = await handleSalesStatusTransition({
        ...BASE_PARAMS,
        entityType: 'sales_followup',
        entityId: undefined,
        newStatus: 'PENDING',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain('entityId');
    });

    it('falls back to email channel when qualify output has no recommendedChannel', async () => {
      setupFollowUp({});
      const result = await handleSalesStatusTransition({
        ...BASE_PARAMS,
        entityType: 'sales_followup',
        entityId: 'lead-abc',
        newStatus: 'PENDING',
      });
      expect(result.ok).toBe(true);
    });
  });
});
