# DR 0108 — First Specialist Agent: Asset Metadata QC

**Status:** APPROVED — Owner approved 2026-09-17.
**Phase:** Complex Agent — Specialist Agents (P3, first agent)
**Date:** 2026-09-17
**Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `5cab76a`
**Relationship to prior records:** Depends on DR 0075 (AGENT_ALLOWLIST — no expansion),
DR 0072 (skill architecture), Complex Agent Phase 1 (88b30af) and Phase 2 (c30dfc4).
Does not modify Decision Records 0001–0107.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout this record set.

---

## 1. Context

**FACT:** The Complex Agent core (Phase 1 + Phase 2, commits 88b30af–5cab76a) is
complete. `delegateSubTask()` creates sub-tasks with `parent_task_id` and status
`PLAN_READY`. Sub-tasks execute through the existing runner/executor under the
same two-gate authorization rules.

**FACT (DR 0075 §2.2):** `qc.asset.metadata` is already on the AGENT_ALLOWLIST.
DR 0075 §2.2 prohibits expansion without a new/amended decision record.

**FACT:** `INSPECT_ASSET_METADATA` is an approved `IntentType` (orchestration
schema CHECK constraint). The rule-based planner maps it to `qc.asset.metadata`.

**FACT:** The current `PlanStep` interface (`lib/orchestration/types.ts`) does not
carry step-level input. The runner materializes step DB rows with `input: null`.
A specialist agent producing a SKILL step requires carrying `assetName`,
`assetType`, and optional `metadata` through the plan to the step's `input`
column so `qc.asset.metadata` has real data to evaluate.

---

## 2. Decision

### 2.1 Agent Identity

- **ID:** `qc-metadata`
- **Name:** Asset Metadata QC Specialist Agent
- **Module:** `lib/agents/qc-metadata-specialist.ts`
- **Purpose:** Inspects a single production asset's metadata for completeness
  and correctness. Returns structured findings: `verdict` (PASS/FAIL), `issues`,
  `completeness` score, and `recommendations`. Does not modify any record.

### 2.2 Authorized Skills

`qc.asset.metadata` — already in AGENT_ALLOWLIST per DR 0075 §2.2.

**No AGENT_ALLOWLIST expansion is required or permitted by this record.**

### 2.3 Delegation Trigger

The specialist agent is invoked by calling `delegateQcMetadata()` exported from
`lib/agents/qc-metadata-specialist.ts`. This wraps `delegateSubTask()` with
specialist-specific plan construction and input validation.

Typical triggers from the Complex Agent:
1. A `COORDINATE_BATCH_OPERATION` task delegates a per-asset sub-task for each
   asset requiring QC.
2. An admin system creates an `INSPECT_ASSET_METADATA` task for a specific asset.

Sub-tasks are created with `parent_task_id` set to the parent task's ID.
Top-level usage (no parent) is not authorized by this record.

### 2.4 Plan Structure

The specialist agent always produces a single-step plan:

```
steps: [{
  step_index: 0,
  step_type: 'SKILL',
  skill_id: 'qc.asset.metadata',
  input: { assetName, assetType, metadata? }
}]
```

**APPROVED:** Add optional `input?: Record<string, unknown>` to the `PlanStep`
interface in `lib/orchestration/types.ts`. The runner uses `step.input ?? null`
when materializing step DB rows. This is backward-compatible: existing plans
without `input` produce `null` in the step row, preserving current behavior.

### 2.5 Initiator / Role Restrictions

The sub-task inherits the parent task's `initiator_role` unchanged (delegated-
authority model, Phase 2). Valid initiator roles: `OWNER`, `ADMIN_OPERATIONS`,
`CREATIVE_PRODUCTION`, `QC`. `CLIENT` and `AGENT` may not initiate.

Input validation enforces that `assetName` and `assetType` are non-empty strings
before delegation. `delegateSubTask()` enforces the role constraint via the
`agent_tasks` CHECK constraint.

### 2.6 Authority Boundaries

The specialist agent MAY:
- Invoke `qc.asset.metadata` through the existing runner/executor
- Write standard orchestration audit events
- Return structured QC output (verdict, issues, completeness score, recommendations)

The specialist agent MAY NOT:
- Create, update, or delete Assets, ProductionJobs, AiGenerations, or any other entity
- Read or write any `financial.*` table or `commercial.order_budgets`
- Authorize any approval or gate resolution
- Modify quotes, orders, campaigns, briefs, or any commercial record
- Escalate independently; escalation is the parent task's responsibility
- Spawn its own sub-tasks

### 2.7 Financial Restrictions

Zero financial authority. No access to financial records. No `FINANCIAL_CHECK`
step in the specialist plan. No pricing data read or written.

### 2.8 Approval / Gate Requirements

None. The specialist agent's single-step plan has no gates. If `qc.asset.metadata`
returns FAIL findings, the sub-task's step status becomes FAILED and the sub-task
itself becomes FAILED. The parent task interprets the failure and decides whether
to escalate.

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

**APPROVED:** A `SPECIALIST_AGENT_REGISTRY` in `lib/agents/registry.ts`
mirrors the `SKILL_REGISTRY` pattern. Maps agent ID string to an object with
`id` and `delegate` function. The first entry is `'qc-metadata'`.

### 2.12 AGENT_ALLOWLIST

**NOT EXPANDED.** `qc.asset.metadata` is already approved (DR 0075 §2.2).
This record does not authorize adding any other skill to the AGENT_ALLOWLIST.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume this record authorizes any AGENT_ALLOWLIST expansion.
- Do not assume the specialist agent may escalate independently.
- Do not assume the specialist agent may create or modify any entity
  beyond writing its audit events.
- Do not assume `CLIENT` or `AGENT` roles may initiate delegation.
- Do not assume adding `input` to `PlanStep` authorizes carrying
  unrestricted data through plans — only specialist-constructed plans
  supply this field; the AI planner does not set it.
- Do not assume this record authorizes schema changes or migrations.

---

## 4. Impact

| File | Change |
|---|---|
| `docs/decisions/0108-specialist-agent-qc-metadata.md` | New — this DR |
| `lib/orchestration/types.ts` | Add optional `input` to `PlanStep` |
| `lib/orchestration/runner.ts` | Use `step.input ?? null` when materializing step rows |
| `lib/agents/qc-metadata-specialist.ts` | New — specialist agent module |
| `lib/agents/registry.ts` | New — SPECIALIST_AGENT_REGISTRY |
| `lib/agents/index.ts` | New — exports |
| `lib/agents/__tests__/qc-metadata-specialist.test.ts` | New — tests |

---

## 5. Owner Approval

Owner approved 2026-09-17.

1. Asset Metadata QC Specialist Agent (`qc-metadata`) approved as first specialist agent.
2. Single-step plan with `qc.asset.metadata` only; no AGENT_ALLOWLIST expansion.
3. `PlanStep.input` optional field approved (backward-compatible).
4. `SPECIALIST_AGENT_REGISTRY` pattern approved.
5. Delegated-authority model preserved; specialist agent inherits parent initiator role.
