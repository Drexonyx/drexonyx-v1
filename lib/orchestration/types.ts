// Types derived from orchestration schema CHECK constraints (§15, §20 Architecture v2).

// ── Status and role literals ───────────────────────────────────────────────

export type TaskStatus =
  | 'PENDING'
  | 'PLAN_READY'
  | 'EXECUTING'
  | 'AWAITING_GATE'
  | 'COMPLETED'
  | 'FAILED'
  | 'ESCALATED'
  | 'CANCELLED';

export type InitiatorRole =
  | 'OWNER'
  | 'ADMIN_OPERATIONS'
  | 'CREATIVE_PRODUCTION'
  | 'QC';

export type IntentType =
  | 'ROUTE_APPROVAL'
  | 'INSPECT_ASSET_METADATA'
  | 'OPTIMIZE_BRIEF_PROMPTS'
  | 'COORDINATE_BATCH_OPERATION'
  | 'COORDINATE_PRODUCTION_RUN'
  | 'COORDINATE_QC_REVIEW';

export type ApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type ApproverRole = 'OWNER' | 'ADMIN_OPERATIONS' | 'QC';

// Phase 2: PRODUCTION_JOB, STATUS_TRANSITION, QC_GATE, NOTIFICATION, VERIFY added.
export type StepType =
  | 'SKILL'
  | 'HUMAN_GATE'
  | 'FINANCIAL_CHECK'
  | 'PRODUCTION_JOB'
  | 'STATUS_TRANSITION'
  | 'QC_GATE'
  | 'NOTIFICATION'
  | 'VERIFY';

export type StepStatus =
  | 'PENDING'
  | 'DISPATCHED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'RETRY_PENDING'
  | 'GATE_PENDING'
  | 'GATE_APPROVED'
  | 'GATE_REJECTED'
  | 'SKIPPED';

// ── Plan structures (stored in agent_tasks.plan jsonb) ────────────────────

export interface PlanStep {
  step_index: number;
  step_type: StepType;
  skill_id?: string;
  // Specialist-constructed plans only; the AI planner does not set this.
  input?: Record<string, unknown>;
}

export interface TaskPlan {
  steps: PlanStep[];
  generated_at: string;
}

// ── Task context (stored in agent_tasks.context jsonb) ────────────────────

export interface TaskContext {
  campaign_id?: string;
  order_id?: string;
  brief_id?: string;
}

// ── Intent (intent_type + context, input to the rule-based plan builder) ──

export interface TaskIntent {
  intent_type: IntentType;
  context: TaskContext;
}
