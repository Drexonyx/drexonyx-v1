# DR 0109 — Second Specialist Agent: Prompt Optimization

**Status:** APPROVED — Owner approved 2026-09-17.
**Phase:** Complex Agent — Specialist Agents (P3, second agent)
**Date:** 2026-09-17
**Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `45cc40f`
**Relationship to prior records:** Depends on DR 0075 (AGENT_ALLOWLIST — no expansion),
DR 0072 (skill architecture), DR 0108 (first specialist agent, registry pattern).
Does not modify Decision Records 0001–0108.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout this record set.

---

## 1. Context

**FACT:** The Complex Agent core (Phase 1 + Phase 2) is complete. The first
specialist agent (`qc-metadata`) is implemented and registered (DR 0108, commit
`45cc40f`). The `SPECIALIST_AGENT_REGISTRY` pattern and `PlanStep.input` field
are established.

**FACT (DR 0075 §2.2):** `utility.prompt.optimize` is already on the
AGENT_ALLOWLIST. DR 0075 §2.2 prohibits expansion without a new/amended
decision record.

**FACT:** `OPTIMIZE_BRIEF_PROMPTS` is an approved `IntentType` (orchestration
schema CHECK constraint). The rule-based planner maps it to
`utility.prompt.optimize`.

**FACT:** The `utility.prompt.optimize` skill (`lib/skills/utility/prompt-optimize.ts`)
accepts `{ originalPrompt: string; objectives?: string; targetModel?: string; }`
and returns `{ optimizedPrompt: string; changes: string[]; rationale: string; }`.
It calls `callAi()` and validates its output before returning.

**FACT:** `PlanStep.input` (DR 0108) is in place. The runner passes
`step.input ?? null` when materializing step rows. No further changes to
`types.ts` or `runner.ts` are required by this record.

---

## 2. Decision

### 2.1 Agent Identity

- **ID:** `prompt-optimize`
- **Name:** Prompt Optimization Specialist Agent
- **Module:** `lib/agents/prompt-optimize-specialist.ts`
- **Purpose:** Optimizes a single AI generation prompt for specificity, visual
  clarity, style direction, and technical quality. Returns structured output:
  `optimizedPrompt`, `changes`, and `rationale`. Does not modify any entity
  record; output is advisory data consumed by the parent task.

### 2.2 Authorized Skills

`utility.prompt.optimize` — already in AGENT_ALLOWLIST per DR 0075 §2.2.

**No AGENT_ALLOWLIST expansion is required or permitted by this record.**

### 2.3 Delegation Trigger

The specialist agent is invoked by calling `delegatePromptOptimize()` exported
from `lib/agents/prompt-optimize-specialist.ts`. This wraps `delegateSubTask()`
with specialist-specific plan construction and input validation.

Typical triggers from the Complex Agent:
1. A `COORDINATE_BATCH_OPERATION` task delegates per-prompt sub-tasks for a
   brief that requires multiple optimized prompts.
2. An admin system creates an `OPTIMIZE_BRIEF_PROMPTS` task for a specific
   prompt.

Sub-tasks are created with `parent_task_id` set to the parent task's ID.
Top-level usage (no parent) is not authorized by this record.

### 2.4 Plan Structure

The specialist agent always produces a single-step plan:

```
steps: [{
  step_index: 0,
  step_type: 'SKILL',
  skill_id: 'utility.prompt.optimize',
  input: { originalPrompt, objectives?, targetModel? }
}]
```

`PlanStep.input` is already supported (DR 0108). No schema or runner changes
are required.

### 2.5 Initiator / Role Restrictions

The sub-task inherits the parent task's `initiator_role` unchanged (delegated-
authority model, Phase 2). Valid initiator roles: `OWNER`, `ADMIN_OPERATIONS`,
`CREATIVE_PRODUCTION`, `QC`. `CLIENT` and `AGENT` may not initiate.

Input validation enforces that `originalPrompt` is a non-empty string before
delegation. `delegateSubTask()` enforces the role constraint via the
`agent_tasks` CHECK constraint.

### 2.6 Authority Boundaries

The specialist agent MAY:
- Invoke `utility.prompt.optimize` through the existing runner/executor
- Write standard orchestration audit events
- Return structured optimization output (optimizedPrompt, changes, rationale)

The specialist agent MAY NOT:
- Create, update, or delete Assets, ProductionJobs, AiGenerations, Briefs, or
  any other entity
- Read or write any `financial.*` table or `commercial.order_budgets`
- Authorize any approval or gate resolution
- Modify quotes, orders, campaigns, briefs, or any commercial record
- Escalate independently; escalation is the parent task's responsibility
- Spawn its own sub-tasks

### 2.7 Financial Restrictions

Zero financial authority. No access to financial records. No `FINANCIAL_CHECK`
step in the specialist plan. No pricing data read or written.

### 2.8 Approval / Gate Requirements

None. The specialist agent's single-step plan has no gates. If
`utility.prompt.optimize` returns a failure, the sub-task's step status
becomes FAILED and the sub-task itself becomes FAILED. The parent task
interprets the failure and decides whether to retry or escalate.

### 2.9 Failure / Retry / Escalation

- **Transient failures:** retried up to 2 times (`MAX_STEP_RETRIES` from
  `lib/orchestration/retry.ts`), governed by the existing runner
- **Non-transient failures:** sub-task immediately transitions to FAILED
- **Escalation:** the specialist agent does NOT escalate independently.
  Sub-task FAILED status propagates to the parent task; the parent task's
  own escalation path applies.

### 2.10 Audit Requirements

Standard orchestration audit events apply (no specialist-specific events):
`TASK_CREATED`, `PLAN_GENERATED`, `STEP_DISPATCHED`, `STEP_SUCCEEDED`,
`STEP_FAILED`, `TASK_COMPLETED`, `TASK_FAILED`.

### 2.11 Registry

**APPROVED:** Add `'prompt-optimize'` entry to `SPECIALIST_AGENT_REGISTRY`
in `lib/agents/registry.ts` (pattern established by DR 0108).

### 2.12 AGENT_ALLOWLIST

**NOT EXPANDED.** `utility.prompt.optimize` is already approved (DR 0075 §2.2).
This record does not authorize adding any other skill to the AGENT_ALLOWLIST.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume this record authorizes any AGENT_ALLOWLIST expansion.
- Do not assume the specialist agent may escalate independently.
- Do not assume the specialist agent may create or modify any entity beyond
  writing its audit events.
- Do not assume `CLIENT` or `AGENT` roles may initiate delegation.
- Do not assume the optimized prompt output authorizes any AI generation —
  the output is advisory data returned to the parent task only.
- Do not assume this record authorizes schema changes or migrations.

---

## 4. Impact

| File | Change |
|---|---|
| `docs/decisions/0109-specialist-agent-prompt-optimize.md` | New — this DR |
| `lib/agents/prompt-optimize-specialist.ts` | New — specialist agent module |
| `lib/agents/registry.ts` | Add `'prompt-optimize'` entry |
| `lib/agents/index.ts` | Add exports |
| `lib/agents/__tests__/prompt-optimize-specialist.test.ts` | New — tests |

No changes to `lib/orchestration/types.ts` or `lib/orchestration/runner.ts`.

---

## 5. Owner Approval

Owner approved 2026-09-17.

1. Prompt Optimization Specialist Agent (`prompt-optimize`) approved as second specialist agent.
2. Single-step plan with `utility.prompt.optimize` only; no AGENT_ALLOWLIST expansion.
3. `PlanStep.input` already in place (DR 0108); no types/runner changes needed.
4. `SPECIALIST_AGENT_REGISTRY` entry added following DR 0108 pattern.
5. Delegated-authority model preserved; specialist agent inherits parent initiator role.
