import {
  pgSchema,
  uuid,
  text,
  timestamp,
  check,
  foreignKey,
  unique,
  index,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { organizations } from './core';
import { users } from './identity';
import { skillOutputs, productionJobs } from './production';

export const orchestrationSchema = pgSchema('orchestration');

// ─── Agent Tasks ──────────────────────────────────────────────────────────────
// DR 0071 §3.1: Top-level orchestration unit. Initiated by admin roles only;
// CLIENT and AGENT are excluded per the two-gate authorization model.
// Status lifecycle: PENDING → PLANNING → AWAITING_APPROVAL → RUNNING → terminal.

export const agentTasks = orchestrationSchema.table(
  'agent_tasks',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    organization_id: uuid('organization_id').notNull(),
    initiated_by_user_id: uuid('initiated_by_user_id').notNull(),
    initiator_role: text('initiator_role').notNull(),
    intent_type: text('intent_type').notNull(),
    title: text('title'),
    context: jsonb('context'),
    plan: jsonb('plan'),
    status: text('status').notNull().default('PENDING'),
    budget_cents: integer('budget_cents'),
    execution_started_at: timestamp('execution_started_at', { withTimezone: true }),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    failure_reason: text('failure_reason'),
    archived_at: timestamp('archived_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'agent_tasks_status_check',
      sql`${t.status} IN ('PENDING','PLANNING','AWAITING_APPROVAL','RUNNING','COMPLETED','FAILED','CANCELLED')`,
    ),
    check(
      'agent_tasks_initiator_role_check',
      sql`${t.initiator_role} IN ('OWNER','ADMIN_OPERATIONS','CREATIVE_PRODUCTION','QC')`,
    ),
    check(
      'agent_tasks_intent_type_check',
      sql`${t.intent_type} IN ('BATCH_QC_REVIEW','BATCH_UPLOAD_REVIEW','PROMPT_OPTIMIZE','BATCH_COORDINATE')`,
    ),
    foreignKey({
      columns: [t.organization_id],
      foreignColumns: [organizations.id],
      name: 'agent_tasks_organization_id_fk',
    }),
    foreignKey({
      columns: [t.initiated_by_user_id],
      foreignColumns: [users.id],
      name: 'agent_tasks_initiated_by_user_id_fk',
    }),
    unique('agent_tasks_id_org_unique').on(t.id, t.organization_id),
    index('agent_tasks_org_idx').on(t.organization_id),
    index('agent_tasks_status_idx').on(t.status),
    index('agent_tasks_user_idx').on(t.initiated_by_user_id),
  ],
);

// ─── Task Approvals ───────────────────────────────────────────────────────────
// DR 0071 §3.4: Human gate records that block task execution until a senior
// role (OWNER or ADMIN_OPERATIONS) explicitly approves or rejects.
// Distinct from production.approvals which gate content, not orchestration.

export const taskApprovals = orchestrationSchema.table(
  'task_approvals',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    agent_task_id: uuid('agent_task_id').notNull(),
    organization_id: uuid('organization_id').notNull(),
    approver_role: text('approver_role').notNull(),
    status: text('status').notNull().default('PENDING'),
    decided_by_user_id: uuid('decided_by_user_id'),
    decision_reason: text('decision_reason'),
    expires_at: timestamp('expires_at', { withTimezone: true }),
    decided_at: timestamp('decided_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'task_approvals_status_check',
      sql`${t.status} IN ('PENDING','APPROVED','REJECTED','EXPIRED','CANCELLED')`,
    ),
    check(
      'task_approvals_approver_role_check',
      sql`${t.approver_role} IN ('OWNER','ADMIN_OPERATIONS')`,
    ),
    foreignKey({
      columns: [t.agent_task_id, t.organization_id],
      foreignColumns: [agentTasks.id, agentTasks.organization_id],
      name: 'task_approvals_agent_task_id_fk',
    }),
    unique('task_approvals_id_org_unique').on(t.id, t.organization_id),
    index('task_approvals_task_idx').on(t.agent_task_id),
    index('task_approvals_org_idx').on(t.organization_id),
    index('task_approvals_status_idx').on(t.status),
  ],
);

// ─── Task Steps ───────────────────────────────────────────────────────────────
// DR 0071 §3.3: Ordered execution steps within an agent task plan.
// SKILL steps invoke an approved skill and link back to production.skill_outputs.
// HUMAN_GATE steps block until the referenced task_approval is resolved.
// (agent_task_id, step_index) uniqueness makes plan position immutable once set.
// gate_id FK is nullable: only HUMAN_GATE steps reference a task_approval.
// production_job_id FK is nullable: only steps that spawn a production job use it.

export const taskSteps = orchestrationSchema.table(
  'task_steps',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    agent_task_id: uuid('agent_task_id').notNull(),
    organization_id: uuid('organization_id').notNull(),
    step_index: integer('step_index').notNull(),
    step_type: text('step_type').notNull(),
    skill_id: text('skill_id'),
    status: text('status').notNull().default('PENDING'),
    input: jsonb('input'),
    output: jsonb('output'),
    error: text('error'),
    gate_id: uuid('gate_id'),
    skill_output_id: uuid('skill_output_id'),
    production_job_id: uuid('production_job_id'),
    retry_count: integer('retry_count').notNull().default(0),
    started_at: timestamp('started_at', { withTimezone: true }),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'task_steps_status_check',
      sql`${t.status} IN ('PENDING','RUNNING','SUCCEEDED','FAILED','SKIPPED','CANCELLED')`,
    ),
    check(
      'task_steps_step_type_check',
      sql`${t.step_type} IN ('SKILL','HUMAN_GATE')`,
    ),
    foreignKey({
      columns: [t.agent_task_id, t.organization_id],
      foreignColumns: [agentTasks.id, agentTasks.organization_id],
      name: 'task_steps_agent_task_id_fk',
    }),
    foreignKey({
      columns: [t.gate_id, t.organization_id],
      foreignColumns: [taskApprovals.id, taskApprovals.organization_id],
      name: 'task_steps_gate_id_fk',
    }),
    foreignKey({
      columns: [t.skill_output_id],
      foreignColumns: [skillOutputs.id],
      name: 'task_steps_skill_output_id_fk',
    }),
    foreignKey({
      columns: [t.production_job_id, t.organization_id],
      foreignColumns: [productionJobs.id, productionJobs.organization_id],
      name: 'task_steps_production_job_id_fk',
    }),
    unique('task_steps_task_step_unique').on(t.agent_task_id, t.step_index),
    index('task_steps_task_idx').on(t.agent_task_id),
    index('task_steps_org_idx').on(t.organization_id),
    index('task_steps_status_idx').on(t.status),
  ],
);
