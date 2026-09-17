# DR 0113 — Production Agent

**Status:** APPROVED — Design authorized. Blockers B1 and B2 resolved. Implementation complete.
**Phase:** Production Agent
**Date:** 2026-09-17
**Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `b4f8b3c`
**Relationship to prior records:** Extends DR 0072 (skill architecture), DR 0075 (AGENT_ALLOWLIST),
DR 0080 (ProductionJob creation boundary), DR 0083 (AI cost governance), DR 0108/0109
(specialist agent pattern). Does not modify Decision Records 0001–0112.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout this record set.

---

## 1. Context

**FACT:** The production infrastructure (`lib/agent/`) is complete: async driver,
terminal transitions, materialization, cost recording, provider polling, and Higgsfield
adapter. The orchestration runner handles `PRODUCTION_JOB` and `STATUS_TRANSITION`
step types.

**FACT (DR 0080 §2.1):** A `ProductionJob` of type `AI_GENERATION` may only be
created by an authenticated human with role `OWNER` or `ADMIN_OPERATIONS`. The
agent runtime is NOT authorized to create `ProductionJob` records autonomously.
This constraint applies to the Production Agent and cannot be overridden by this record.

**FACT (DR 0058 §2.1):** The generation lifecycle driver is asynchronous and runs
independently. It does not block human-initiated creation calls.

**FACT (DR 0083):** AI generation cost recording is implemented in `lib/agent/cost-recording.ts`.
The agent does not autonomously authorize AI generation spend beyond the cost governance
guards already implemented.

**FACT:** The orchestration `IntentType` CHECK constraint (`lib/orchestration/types.ts`)
does not include a production coordination type. A new IntentType is required — it
constitutes a schema change and requires Owner approval (blocker B1).

**FACT:** The AGENT_ALLOWLIST contains `utility.prompt.optimize` and `qc.asset.metadata`.
These two skills are available to the Production Agent without expansion. All other
production-relevant skills (`script.ad.generate`, `hook.video.generate`, etc.) are
HUMAN_SKILL_AUTHORITY only and are NOT on the AGENT_ALLOWLIST.

**FACT:** The `qc-metadata` and `prompt-optimize` specialist agents (DR 0108, DR 0109)
are implemented and registered. The Production Agent may delegate sub-tasks to both
without AGENT_ALLOWLIST expansion.

---

## 2. Decision

### 2.1 Purpose

Authorize the design of a Production Agent that coordinates the multi-step production
pipeline from approved brief to asset materialization ready for QC:

```
Prompt Optimize → [HUMAN_GATE: Job Approval] → PRODUCTION_JOB dispatch
  → Monitor → [COMPLETED] → Notify QC ready
  → [FAILED] → Escalate
```

The Production Agent orchestrates around the human creation gate (DR 0080).
It does not create ProductionJobs, does not authorize AI generation spend
beyond existing cost guards, and does not issue QC verdicts.

### 2.2 Operational Flow

#### Step 1 — Prompt Optimize (sub-task delegation)

The Production Agent delegates prompt optimization to the existing `prompt-optimize`
specialist agent (DR 0109). Input: the approved brief prompt and generation parameters.
Output: `optimizedPrompt`, `changes`, `rationale`.

No AGENT_ALLOWLIST expansion is required — `utility.prompt.optimize` is already approved.

#### Step 2 — HUMAN_GATE: Job Approval

A mandatory `HUMAN_GATE` step requires `OWNER` or `ADMIN_OPERATIONS` approval before
any `ProductionJob` is created. The gate records:
- Optimized prompt from Step 1
- Generation parameters (provider, model, estimated credits)
- Order ID and organization ID

**This gate is architecturally required by DR 0080 §2.1 and cannot be removed.**
The human reviewer creates the `ProductionJob` record manually (or via the existing
`POST /api/agent/jobs` endpoint) after approving the gate.

#### Step 3 — PRODUCTION_JOB Step

After the human creates the ProductionJob, the agent creates a `PRODUCTION_JOB`
step referencing the approved `productionJobId` (provided in gate resolution input).
The existing runner handles the `PRODUCTION_JOB` step type — it monitors the job
status via `lib/agent/driver.ts`, `lib/agent/polling.ts`, and transitions through
the existing terminal authority (`lib/agent/terminal.ts`).

The agent does not dispatch to Higgsfield directly — the existing driver handles
provider dispatch.

#### Step 4 — Monitor and Branch

The runner's `PRODUCTION_JOB` step completes when the ProductionJob reaches a
terminal state:

- `COMPLETED` → proceed to Step 5 (Notify QC Ready)
- `FAILED` → sub-task FAILED; escalate to `ADMIN_OPERATIONS` or `OWNER`

#### Step 5 — Notify QC Ready (NOTIFICATION step)

On `COMPLETED`, the agent creates a `NOTIFICATION` step that writes a
`PRODUCTION_COMPLETED` audit event and (best-effort) sends an escalation alert
to `ADMIN_OPERATIONS` via the existing `sendEscalationEmail` path, signalling
that assets are ready for QC. The notification does not modify asset status.

### 2.3 Blockers (Implementation Gated)

| # | Blocker | Required Decision |
|---|---------|-------------------|
| B1 | `COORDINATE_PRODUCTION_RUN` IntentType | Owner approval + schema migration to add to `agent_tasks.intent_type` CHECK constraint |
| B2 | `production_run` specialist agent | Owner approval to add to `SPECIALIST_AGENT_REGISTRY` (following DR 0108 pattern) |

No AGENT_ALLOWLIST expansion is required or proposed. The Production Agent uses only
`utility.prompt.optimize` (via `prompt-optimize` sub-task delegation) and references
existing production infrastructure via `PRODUCTION_JOB` step type.

### 2.4 Complex Agent Delegation

The Production Agent is a new specialist agent in the `SPECIALIST_AGENT_REGISTRY`
(pattern: DR 0108). Delegation function: `delegateProductionRun()` in
`lib/agents/production-run-specialist.ts`.

Delegation triggered by a `COORDINATE_PRODUCTION_RUN` agent task.
Initiator roles: `OWNER`, `ADMIN_OPERATIONS` only.

Sub-tasks the Production Agent MAY create:
- `OPTIMIZE_BRIEF_PROMPTS` sub-task → `prompt-optimize` specialist (DR 0109)
- `INSPECT_ASSET_METADATA` sub-task → `qc-metadata` specialist (DR 0108)

The Production Agent MAY NOT:
- Create `ProductionJob` records autonomously (DR 0080 §2.1)
- Dispatch to any AI provider directly
- Authorize AI generation spend beyond existing cost governance guards
- Write to `financial.*` tables
- Issue QC verdicts or modify asset status
- Spawn sub-tasks outside the approved AGENT_ALLOWLIST
- Escalate beyond the existing `escalateTask()` path

### 2.5 Permissions

- Initiator roles: `OWNER`, `ADMIN_OPERATIONS` only
- Sub-task initiator role: inherited from parent (delegated-authority model, DR 0108)
- `CLIENT` and `AGENT` may not initiate
- `CREATIVE_PRODUCTION` and `QC` may not initiate

### 2.6 Financial and Security Boundaries

- Zero autonomous financial authority. Cost recording follows existing `lib/agent/cost-recording.ts`.
- No new financial ledger entry types. Cost governance guards (DR 0083) remain unchanged.
- No provider credentials accessed directly — existing driver uses scoped service tokens (DR 0065).
- No cross-organization production jobs. `organizationId` always resolved from server-side token.
- No external spend authorized beyond existing approved cost guards.

### 2.7 Human Approval Gates

| Gate | Condition | Required approver |
|---|---|---|
| Job Approval (Step 2) | Before any ProductionJob creation | `OWNER` or `ADMIN_OPERATIONS` |
| Production failure escalation | ProductionJob terminal FAILED | `ADMIN_OPERATIONS` or `OWNER` |

The agent does not advance past the Job Approval gate without a recorded `APPROVED`
decision in `orchestration.task_approvals`.

### 2.8 Audit Requirements

| Event | When |
|---|---|
| `PRODUCTION_RUN_STARTED` | Agent task created |
| `PRODUCTION_JOB_GATE_APPROVED` | Human approves Job Approval gate |
| `PRODUCTION_JOB_GATE_REJECTED` | Human rejects Job Approval gate |
| `PRODUCTION_COMPLETED` | ProductionJob reaches COMPLETED |
| `PRODUCTION_FAILED` | ProductionJob reaches FAILED |

Standard orchestration events also apply.

### 2.9 Retry and Escalation

- Prompt optimization sub-task: up to 2 retries (existing `MAX_STEP_RETRIES`); non-transient → escalate
- ProductionJob FAILED: not retried by the agent; new human approval gate required for re-run
- Escalation: existing `escalateTask()` + `sendEscalationEmail()` to `ADMIN_OPERATIONS`/`OWNER`

### 2.10 New Module Structure (PROPOSED — not implemented by this record)

```
lib/agents/
  production-run-specialist.ts          — specialist agent + delegateProductionRun()
  __tests__/production-run-specialist.test.ts
```

No file may be written until blockers B1–B2 are resolved.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume this record authorizes any AGENT_ALLOWLIST expansion.
- Do not assume the Production Agent may create ProductionJob records autonomously — prohibited (DR 0080 §2.1).
- Do not assume the Production Agent may dispatch to Higgsfield or any AI provider directly.
- Do not assume the Production Agent may issue QC verdicts or modify asset status.
- Do not assume `COORDINATE_PRODUCTION_RUN` is an approved IntentType — it is PROPOSED.
- Do not assume any financial authority beyond existing cost governance guards.
- Do not implement any code until blockers B1–B2 are resolved.

---

## 4. Impact

| File | Change |
|------|--------|
| `docs/decisions/0113-production-agent.md` | New — this DR |

No code changes. Implementation blocked pending Owner decisions on §2.3.

---

## 5. Owner Approval

**Status: APPROVED.**

Blockers resolved:
1. `COORDINATE_PRODUCTION_RUN` IntentType approved and schema migration created (B1 — resolved)
2. `production-run` entry approved and registered in `SPECIALIST_AGENT_REGISTRY` (B2 — resolved)

Implementation complete: `lib/agents/production-run-specialist.ts`, `lib/agents/__tests__/production-run-specialist.test.ts`.
