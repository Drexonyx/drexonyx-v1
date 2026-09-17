import { describe, it, expect, vi, beforeEach } from 'vitest';

// Tests specialist agent sub-task delegation: creates a PLAN_READY sub-task
// linked to a parent task, with the same organization_id and initiator context.

const { mockInsert, mockAuditTaskCreated, mockAuditPlanGenerated } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockAuditTaskCreated: vi.fn().mockResolvedValue(undefined),
  mockAuditPlanGenerated: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/db/index', () => ({ db: { insert: mockInsert } }));
vi.mock('uuidv7', () => ({ uuidv7: () => 'sub-task-uuid' }));
vi.mock('../audit', () => ({
  auditTaskCreated: mockAuditTaskCreated,
  auditPlanGenerated: mockAuditPlanGenerated,
}));

import { delegateSubTask } from '../delegation';

const BASE_PLAN = {
  steps: [{ step_index: 0, step_type: 'SKILL' as const, skill_id: 'utility.prompt.optimize' }],
  generated_at: '',
};

describe('specialist agent delegation — delegateSubTask', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a sub-task with PLAN_READY status', async () => {
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const result = await delegateSubTask({
      parentTaskId: 'parent-task-id',
      organizationId: 'org-1',
      initiatedByUserId: 'user-1',
      initiatorRole: 'OWNER',
      intentType: 'OPTIMIZE_BRIEF_PROMPTS',
      title: 'Sub-task: optimize prompts',
      context: {},
      plan: BASE_PLAN,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.subTaskId).toBe('sub-task-uuid');
  });

  it('inserts a sub-task record with parent_task_id', async () => {
    const mockValues = vi.fn().mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: mockValues });

    await delegateSubTask({
      parentTaskId: 'parent-task-id',
      organizationId: 'org-1',
      initiatedByUserId: 'user-1',
      initiatorRole: 'ADMIN_OPERATIONS',
      intentType: 'INSPECT_ASSET_METADATA',
      context: {},
      plan: BASE_PLAN,
    });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        parent_task_id: 'parent-task-id',
        status: 'PLAN_READY',
        organization_id: 'org-1',
      }),
    );
  });

  it('writes TASK_CREATED and PLAN_GENERATED audit events', async () => {
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    await delegateSubTask({
      parentTaskId: 'parent-task-id',
      organizationId: 'org-1',
      initiatedByUserId: 'user-1',
      initiatorRole: 'OWNER',
      intentType: 'ROUTE_APPROVAL',
      context: {},
      plan: { steps: [{ step_index: 0, step_type: 'HUMAN_GATE' as const }], generated_at: '' },
    });

    expect(mockAuditTaskCreated).toHaveBeenCalledOnce();
    expect(mockAuditPlanGenerated).toHaveBeenCalledOnce();
  });

  it('returns an error when db insert fails', async () => {
    mockInsert.mockReturnValue({
      values: vi.fn().mockRejectedValue(new Error('DB write failed')),
    });

    const result = await delegateSubTask({
      parentTaskId: 'parent-task-id',
      organizationId: 'org-1',
      initiatedByUserId: 'user-1',
      initiatorRole: 'OWNER',
      intentType: 'ROUTE_APPROVAL',
      context: {},
      plan: BASE_PLAN,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('DB write failed');
  });
});
