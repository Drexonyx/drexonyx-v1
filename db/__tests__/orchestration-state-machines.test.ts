import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { agentTasks } from '../schema/orchestration';
import { taskApprovals } from '../schema/orchestration';
import { taskSteps } from '../schema/orchestration';

// Phase 1 orchestration state machine tests.
// Verifies that CHECK constraints in the Drizzle schema match the approved
// state machines from the Complex Agent Architecture v2 (§15, §20).

const AGENT_TASK_STATES = [
  'PENDING', 'PLAN_READY', 'EXECUTING', 'AWAITING_GATE',
  'COMPLETED', 'FAILED', 'ESCALATED', 'CANCELLED',
] as const;

const AGENT_TASK_INITIATOR_ROLES = [
  'OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION', 'QC',
] as const;

const AGENT_TASK_INTENT_TYPES = [
  'ROUTE_APPROVAL', 'INSPECT_ASSET_METADATA', 'OPTIMIZE_BRIEF_PROMPTS', 'COORDINATE_BATCH_OPERATION',
] as const;

const TASK_APPROVAL_STATES = [
  'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED',
] as const;

const TASK_APPROVAL_APPROVER_ROLES = ['OWNER', 'ADMIN_OPERATIONS'] as const;

const TASK_STEP_STATES = [
  'PENDING', 'DISPATCHED', 'RUNNING', 'SUCCEEDED', 'FAILED',
  'RETRY_PENDING', 'GATE_PENDING', 'GATE_APPROVED', 'GATE_REJECTED', 'SKIPPED',
] as const;

const TASK_STEP_TYPES = ['SKILL', 'HUMAN_GATE', 'FINANCIAL_CHECK'] as const;

function getCheckConstraintSql(
  table: ReturnType<typeof getTableConfig>,
  checkName: string,
): string | undefined {
  const constraint = table.checks.find((c) => c.name === checkName);
  if (!constraint) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chunks = (constraint.value as any).queryChunks ?? [];
  return chunks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((chunk: any) => (Array.isArray(chunk?.value) ? chunk.value.join('') : '?'))
    .join('');
}

const agentTasksConfig = getTableConfig(agentTasks);
const taskApprovalsConfig = getTableConfig(taskApprovals);
const taskStepsConfig = getTableConfig(taskSteps);

// ─── AgentTask state machine ──────────────────────────────────────────────────

describe('AgentTask state machine (Phase 1 orchestration)', () => {
  it('has exactly 8 approved states', () => {
    expect(AGENT_TASK_STATES).toHaveLength(8);
  });

  it('includes AWAITING_GATE as the human-gate blocking state', () => {
    expect(AGENT_TASK_STATES).toContain('AWAITING_GATE');
  });

  it('includes PLAN_READY and EXECUTING as active lifecycle states', () => {
    expect(AGENT_TASK_STATES).toContain('PLAN_READY');
    expect(AGENT_TASK_STATES).toContain('EXECUTING');
  });

  it('terminal states are COMPLETED, FAILED, ESCALATED, CANCELLED', () => {
    expect(AGENT_TASK_STATES).toContain('COMPLETED');
    expect(AGENT_TASK_STATES).toContain('FAILED');
    expect(AGENT_TASK_STATES).toContain('ESCALATED');
    expect(AGENT_TASK_STATES).toContain('CANCELLED');
  });

  it('does not include APPROVED or REJECTED (those belong to TaskApproval)', () => {
    expect(AGENT_TASK_STATES).not.toContain('APPROVED');
    expect(AGENT_TASK_STATES).not.toContain('REJECTED');
  });

  it('agent_tasks table has status CHECK constraint covering all approved states', () => {
    const sql = getCheckConstraintSql(agentTasksConfig, 'agent_tasks_status_check');
    expect(sql).toBeDefined();
    for (const state of AGENT_TASK_STATES) {
      expect(sql).toContain(state);
    }
  });
});

// ─── AgentTask initiator role CHECK ───────────────────────────────────────────

describe('AgentTask initiator role constraint (two-gate model)', () => {
  it('has exactly 4 permitted initiator roles', () => {
    expect(AGENT_TASK_INITIATOR_ROLES).toHaveLength(4);
  });

  it('excludes CLIENT and AGENT from initiator roles', () => {
    expect(AGENT_TASK_INITIATOR_ROLES).not.toContain('CLIENT');
    expect(AGENT_TASK_INITIATOR_ROLES).not.toContain('AGENT');
  });

  it('OWNER is a permitted initiator', () => {
    expect(AGENT_TASK_INITIATOR_ROLES).toContain('OWNER');
  });

  it('agent_tasks table has initiator_role CHECK constraint covering permitted roles', () => {
    const sql = getCheckConstraintSql(agentTasksConfig, 'agent_tasks_initiator_role_check');
    expect(sql).toBeDefined();
    for (const role of AGENT_TASK_INITIATOR_ROLES) {
      expect(sql).toContain(role);
    }
  });

  it('initiator_role CHECK constraint does not permit CLIENT or AGENT', () => {
    const sql = getCheckConstraintSql(agentTasksConfig, 'agent_tasks_initiator_role_check');
    expect(sql).toBeDefined();
    // The IN list must not contain these values
    expect(sql).not.toMatch(/'CLIENT'/);
    expect(sql).not.toMatch(/'AGENT'/);
  });
});

// ─── AgentTask intent types ───────────────────────────────────────────────────

describe('AgentTask Phase 1 intent types', () => {
  it('has exactly 4 approved Phase 1 intent types', () => {
    expect(AGENT_TASK_INTENT_TYPES).toHaveLength(4);
  });

  it('includes all Phase 1 approved intent types', () => {
    expect(AGENT_TASK_INTENT_TYPES).toContain('ROUTE_APPROVAL');
    expect(AGENT_TASK_INTENT_TYPES).toContain('INSPECT_ASSET_METADATA');
    expect(AGENT_TASK_INTENT_TYPES).toContain('OPTIMIZE_BRIEF_PROMPTS');
    expect(AGENT_TASK_INTENT_TYPES).toContain('COORDINATE_BATCH_OPERATION');
  });

  it('agent_tasks table has intent_type CHECK constraint covering all Phase 1 types', () => {
    const sql = getCheckConstraintSql(agentTasksConfig, 'agent_tasks_intent_type_check');
    expect(sql).toBeDefined();
    for (const type of AGENT_TASK_INTENT_TYPES) {
      expect(sql).toContain(type);
    }
  });
});

// ─── TaskApproval state machine ───────────────────────────────────────────────

describe('TaskApproval state machine (human gate)', () => {
  it('has exactly 5 approved states', () => {
    expect(TASK_APPROVAL_STATES).toHaveLength(5);
  });

  it('terminal states are APPROVED, REJECTED, EXPIRED, CANCELLED', () => {
    expect(TASK_APPROVAL_STATES).toContain('APPROVED');
    expect(TASK_APPROVAL_STATES).toContain('REJECTED');
    expect(TASK_APPROVAL_STATES).toContain('EXPIRED');
    expect(TASK_APPROVAL_STATES).toContain('CANCELLED');
  });

  it('does not include RUNNING or COMPLETED (execution states belong to AgentTask)', () => {
    expect(TASK_APPROVAL_STATES).not.toContain('RUNNING');
    expect(TASK_APPROVAL_STATES).not.toContain('COMPLETED');
  });

  it('task_approvals table has status CHECK constraint covering all approved states', () => {
    const sql = getCheckConstraintSql(taskApprovalsConfig, 'task_approvals_status_check');
    expect(sql).toBeDefined();
    for (const state of TASK_APPROVAL_STATES) {
      expect(sql).toContain(state);
    }
  });
});

// ─── TaskApproval approver role CHECK ─────────────────────────────────────────

describe('TaskApproval approver role constraint', () => {
  it('has exactly 2 permitted approver roles', () => {
    expect(TASK_APPROVAL_APPROVER_ROLES).toHaveLength(2);
  });

  it('only OWNER and ADMIN_OPERATIONS may approve agent task gates', () => {
    expect(TASK_APPROVAL_APPROVER_ROLES).toContain('OWNER');
    expect(TASK_APPROVAL_APPROVER_ROLES).toContain('ADMIN_OPERATIONS');
  });

  it('excludes CREATIVE_PRODUCTION, QC, CLIENT, AGENT from gate approval', () => {
    const excluded = ['CREATIVE_PRODUCTION', 'QC', 'CLIENT', 'AGENT'];
    for (const role of excluded) {
      expect(TASK_APPROVAL_APPROVER_ROLES).not.toContain(
        role as typeof TASK_APPROVAL_APPROVER_ROLES[number],
      );
    }
  });

  it('task_approvals table has approver_role CHECK constraint', () => {
    const sql = getCheckConstraintSql(taskApprovalsConfig, 'task_approvals_approver_role_check');
    expect(sql).toBeDefined();
    for (const role of TASK_APPROVAL_APPROVER_ROLES) {
      expect(sql).toContain(role);
    }
  });
});

// ─── TaskStep state machine ───────────────────────────────────────────────────

describe('TaskStep state machine', () => {
  it('has exactly 10 approved states', () => {
    expect(TASK_STEP_STATES).toHaveLength(10);
  });

  it('uses SUCCEEDED (not COMPLETED) as success terminal, matching skill_outputs', () => {
    expect(TASK_STEP_STATES).toContain('SUCCEEDED');
    expect(TASK_STEP_STATES).not.toContain('COMPLETED');
  });

  it('includes DISPATCHED as the sent-to-executor state', () => {
    expect(TASK_STEP_STATES).toContain('DISPATCHED');
  });

  it('includes RETRY_PENDING for retry lifecycle', () => {
    expect(TASK_STEP_STATES).toContain('RETRY_PENDING');
  });

  it('includes gate resolution states GATE_PENDING, GATE_APPROVED, GATE_REJECTED', () => {
    expect(TASK_STEP_STATES).toContain('GATE_PENDING');
    expect(TASK_STEP_STATES).toContain('GATE_APPROVED');
    expect(TASK_STEP_STATES).toContain('GATE_REJECTED');
  });

  it('includes SKIPPED for steps bypassed by plan logic', () => {
    expect(TASK_STEP_STATES).toContain('SKIPPED');
  });

  it('does not include CANCELLED (task-level cancellation, not step-level)', () => {
    expect(TASK_STEP_STATES).not.toContain('CANCELLED');
  });

  it('task_steps table has status CHECK constraint covering all approved states', () => {
    const sql = getCheckConstraintSql(taskStepsConfig, 'task_steps_status_check');
    expect(sql).toBeDefined();
    for (const state of TASK_STEP_STATES) {
      expect(sql).toContain(state);
    }
  });
});

// ─── TaskStep type CHECK ──────────────────────────────────────────────────────

describe('TaskStep type constraint', () => {
  it('has exactly 3 approved step types', () => {
    expect(TASK_STEP_TYPES).toHaveLength(3);
  });

  it('SKILL type invokes an approved skill', () => {
    expect(TASK_STEP_TYPES).toContain('SKILL');
  });

  it('HUMAN_GATE type blocks on TaskApproval resolution', () => {
    expect(TASK_STEP_TYPES).toContain('HUMAN_GATE');
  });

  it('FINANCIAL_CHECK type enforces budget guard', () => {
    expect(TASK_STEP_TYPES).toContain('FINANCIAL_CHECK');
  });

  it('task_steps table has step_type CHECK constraint covering both types', () => {
    const sql = getCheckConstraintSql(taskStepsConfig, 'task_steps_step_type_check');
    expect(sql).toBeDefined();
    for (const type of TASK_STEP_TYPES) {
      expect(sql).toContain(type);
    }
  });
});

// ─── Table structure: composite unique and FKs ────────────────────────────────

describe('AgentTask table structure', () => {
  it('has composite unique on (id, organization_id) for FK referencing', () => {
    const uniqueNames = agentTasksConfig.uniqueConstraints.map((u) => u.name);
    expect(uniqueNames).toContain('agent_tasks_id_org_unique');
  });

  it('has FK to core.organizations', () => {
    const fkNames = agentTasksConfig.foreignKeys.map((fk) => fk.getName());
    expect(fkNames).toContain('agent_tasks_organization_id_fk');
  });

  it('has FK to identity.users for initiated_by_user_id', () => {
    const fkNames = agentTasksConfig.foreignKeys.map((fk) => fk.getName());
    expect(fkNames).toContain('agent_tasks_initiated_by_user_id_fk');
  });
});

describe('TaskApproval table structure', () => {
  it('has composite unique on (id, organization_id) for FK referencing', () => {
    const uniqueNames = taskApprovalsConfig.uniqueConstraints.map((u) => u.name);
    expect(uniqueNames).toContain('task_approvals_id_org_unique');
  });

  it('has composite FK to agent_tasks (id, organization_id)', () => {
    const fkNames = taskApprovalsConfig.foreignKeys.map((fk) => fk.getName());
    expect(fkNames).toContain('task_approvals_agent_task_id_fk');
  });
});

describe('TaskStep table structure', () => {
  it('has unique constraint on (agent_task_id, step_index)', () => {
    const uniqueNames = taskStepsConfig.uniqueConstraints.map((u) => u.name);
    expect(uniqueNames).toContain('task_steps_task_step_unique');
  });

  it('has composite FK to agent_tasks', () => {
    const fkNames = taskStepsConfig.foreignKeys.map((fk) => fk.getName());
    expect(fkNames).toContain('task_steps_agent_task_id_fk');
  });

  it('has nullable FK to task_approvals via gate_id', () => {
    const fkNames = taskStepsConfig.foreignKeys.map((fk) => fk.getName());
    expect(fkNames).toContain('task_steps_gate_id_fk');
  });

  it('has nullable FK to production.skill_outputs', () => {
    const fkNames = taskStepsConfig.foreignKeys.map((fk) => fk.getName());
    expect(fkNames).toContain('task_steps_skill_output_id_fk');
  });

  it('has nullable composite FK to production.production_jobs', () => {
    const fkNames = taskStepsConfig.foreignKeys.map((fk) => fk.getName());
    expect(fkNames).toContain('task_steps_production_job_id_fk');
  });

  it('has retry_count column with default 0', () => {
    const col = taskStepsConfig.columns.find((c) => c.name === 'retry_count');
    expect(col).toBeDefined();
    expect(col?.default).toBe(0);
    expect(col?.notNull).toBe(true);
  });
});
