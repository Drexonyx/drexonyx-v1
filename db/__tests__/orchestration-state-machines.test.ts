import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { agentTasks } from '../schema/orchestration';
import { taskApprovals } from '../schema/orchestration';
import { taskSteps } from '../schema/orchestration';

// Phase 1 orchestration state machine tests.
// Verifies that CHECK constraints in the Drizzle schema match the approved
// state machines from the Complex Agent Architecture v2 (§15, §20).

const AGENT_TASK_STATES = [
  'PENDING', 'PLANNING', 'AWAITING_APPROVAL', 'RUNNING',
  'COMPLETED', 'FAILED', 'CANCELLED',
] as const;

const AGENT_TASK_INITIATOR_ROLES = [
  'OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION', 'QC',
] as const;

const AGENT_TASK_INTENT_TYPES = [
  'BATCH_QC_REVIEW', 'BATCH_UPLOAD_REVIEW', 'PROMPT_OPTIMIZE', 'BATCH_COORDINATE',
] as const;

const TASK_APPROVAL_STATES = [
  'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED',
] as const;

const TASK_APPROVAL_APPROVER_ROLES = ['OWNER', 'ADMIN_OPERATIONS'] as const;

const TASK_STEP_STATES = [
  'PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED', 'CANCELLED',
] as const;

const TASK_STEP_TYPES = ['SKILL', 'HUMAN_GATE'] as const;

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
  it('has exactly 7 approved states', () => {
    expect(AGENT_TASK_STATES).toHaveLength(7);
  });

  it('includes AWAITING_APPROVAL as the human-gate blocking state', () => {
    expect(AGENT_TASK_STATES).toContain('AWAITING_APPROVAL');
  });

  it('terminal states are COMPLETED, FAILED, CANCELLED', () => {
    expect(AGENT_TASK_STATES).toContain('COMPLETED');
    expect(AGENT_TASK_STATES).toContain('FAILED');
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
    expect(AGENT_TASK_INTENT_TYPES).toContain('BATCH_QC_REVIEW');
    expect(AGENT_TASK_INTENT_TYPES).toContain('BATCH_UPLOAD_REVIEW');
    expect(AGENT_TASK_INTENT_TYPES).toContain('PROMPT_OPTIMIZE');
    expect(AGENT_TASK_INTENT_TYPES).toContain('BATCH_COORDINATE');
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
  it('has exactly 6 approved states', () => {
    expect(TASK_STEP_STATES).toHaveLength(6);
  });

  it('uses SUCCEEDED (not COMPLETED) as success terminal, matching skill_outputs', () => {
    expect(TASK_STEP_STATES).toContain('SUCCEEDED');
    expect(TASK_STEP_STATES).not.toContain('COMPLETED');
  });

  it('includes SKIPPED for steps bypassed by plan logic', () => {
    expect(TASK_STEP_STATES).toContain('SKIPPED');
  });

  it('terminal states are SUCCEEDED, FAILED, SKIPPED, CANCELLED', () => {
    expect(TASK_STEP_STATES).toContain('SUCCEEDED');
    expect(TASK_STEP_STATES).toContain('FAILED');
    expect(TASK_STEP_STATES).toContain('SKIPPED');
    expect(TASK_STEP_STATES).toContain('CANCELLED');
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
  it('has exactly 2 approved step types', () => {
    expect(TASK_STEP_TYPES).toHaveLength(2);
  });

  it('SKILL type invokes an approved skill', () => {
    expect(TASK_STEP_TYPES).toContain('SKILL');
  });

  it('HUMAN_GATE type blocks on TaskApproval resolution', () => {
    expect(TASK_STEP_TYPES).toContain('HUMAN_GATE');
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
