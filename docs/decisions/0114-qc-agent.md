# DR 0114 — QC Agent

**Status:** PROPOSED — Design authorized. Implementation blocked on §2.3 blockers.
**Phase:** QC Agent
**Date:** 2026-09-17
**Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `b4f8b3c`
**Relationship to prior records:** Extends DR 0072 (skill architecture), DR 0075 (AGENT_ALLOWLIST),
DR 0090 (two-step QC model — machine recommends, human decides), DR 0089 (QC/approval/delivery gates),
DR 0108 (specialist agent pattern, `qc-metadata`). Does not modify Decision Records 0001–0113.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout this record set.

---

## 1. Context

**FACT (DR 0090 §2.1):** A QC skill invocation is a machine recommendation only.
It stores a `SkillResult` in `production.skill_outputs`. It does not insert into
`production.qc_reviews`, does not update `production.assets.status`, and carries
no binding authority over asset state.

**FACT (DR 0090 §2.2):** An authoritative QC verdict is established only when an
authorized human (role: `OWNER`, `ADMIN_OPERATIONS`, or `QC`) submits via `createQcReview`.
This is the only path that transitions an asset out of `READY_FOR_QC`.

**FACT (DR 0090 §2.4):** The AGENT is excluded from `createQcReview`. No mechanism
in Phases 1–13 allows an AGENT to cause an Asset status transition via a QC path.

**FACT (DR 0090 §2.5):** Any future automation producing a binding QC verdict without
human submission requires a new, explicitly authorized Decision Record. That record
does not exist. The QC Agent does not authorize binding verdicts.

**FACT (DR 0075 §2.2, `lib/skills/authority.ts`):** AGENT_ALLOWLIST: `utility.prompt.optimize`
and `qc.asset.metadata`. Skills `qc.script.review` and `qc.brand.alignment` are
HUMAN_SKILL_AUTHORITY only — NOT on the AGENT_ALLOWLIST. The QC Agent cannot invoke
them without Owner-approved AGENT_ALLOWLIST expansion (blocker B2).

**FACT (DR 0108):** The `qc-metadata` specialist agent is implemented and registered.
It invokes `qc.asset.metadata` (already on AGENT_ALLOWLIST). The QC Agent may delegate
to it without expansion.

**FACT:** The orchestration `IntentType` CHECK constraint does not include a QC
coordination type. A new IntentType is required — constitutes a schema change,
requires Owner approval (blocker B1).

**FACT:** The orchestration runner handles `QC_GATE` step type. A `QC_GATE` step
pauses execution pending a human QC review resolution. This is the correct step type
for enforcing the human verdict gate (DR 0090 §2.2).

---

## 2. Decision

### 2.1 Purpose

Authorize the design of a QC Agent that coordinates machine QC skill recommendations,
aggregates results for human review, and enforces the mandatory human verdict gate
(DR 0090) before any asset status transition:

```
[for each QC skill] Delegate → Collect recommendations
  → QC_GATE: human reviewer submits verdict via createQcReview
  → [PASS] → NOTIFICATION: asset is CLIENT_PREVIEW, trigger delivery workflow
  → [FAIL] → Escalate: asset is REVISION_REQUIRED, trigger revision workflow
```

The QC Agent does not issue verdicts. The QC_GATE step is architecturally mandatory.

### 2.2 Operational Flow

#### Step 1 — QC Skill Sub-tasks (parallel delegation)

The QC Agent delegates per-skill sub-tasks as the approved AGENT_ALLOWLIST permits:

| Sub-task | Skill | AGENT_ALLOWLIST status |
|---|---|---|
| Asset metadata QC | `qc.asset.metadata` | APPROVED — via `qc-metadata` specialist (DR 0108) |
| Script review | `qc.script.review` | NOT listed — requires expansion (blocker B2) |
| Brand alignment | `qc.brand.alignment` | NOT listed — requires expansion (blocker B2) |

Until B2 is resolved: only `qc.asset.metadata` sub-tasks are delegated. Script review
and brand alignment remain human-only steps presented via the existing admin UI.

Sub-tasks run with `parent_task_id` set. Each returns a `SkillResult` stored in
`production.skill_outputs`. No asset status change occurs at this step.

#### Step 2 — Collect Recommendations

The agent aggregates sub-task `SkillResult` outputs into a structured summary:
- Per-skill verdict (`PASS` / `FAIL`), score, findings, recommendations
- Overall recommendation: `PASS_ALL` | `FAIL_ANY` | `INCOMPLETE`

This summary is advisory. It does not bind the human reviewer.

#### Step 3 — QC_GATE: Human Verdict (mandatory)

A `QC_GATE` step pauses the agent task. The step input carries:
- `assetId` — the asset under review
- Aggregated QC recommendation summary (Step 2 output)
- Link to the admin QC review UI

The gate resolves only when an authorized human (role: `OWNER`, `ADMIN_OPERATIONS`,
or `QC`) submits a verdict via `createQcReview` (existing `lib/admin/qc.ts`).
`createQcReview` performs the actual asset status transition (READY_FOR_QC →
CLIENT_PREVIEW on PASS, or READY_FOR_QC → REVISION_REQUIRED on FAIL).

**This gate is architecturally mandatory per DR 0090 §2.2 and cannot be removed.**
The agent is not involved in the verdict decision.

#### Step 4 — Branch on Verdict

After QC_GATE resolution the runner reads the gate outcome:
- `APPROVED` (PASS) → Step 5: Notify delivery workflow
- `REJECTED` (FAIL) → Step 5: Escalate, trigger revision workflow

#### Step 5 — NOTIFICATION

On PASS: `NOTIFICATION` step writes a `QC_PASS_NOTIFY` audit event and (best-effort)
alerts `ADMIN_OPERATIONS` that the asset is in `CLIENT_PREVIEW` and ready for
delivery/approval workflow.

On FAIL: escalate via `escalateTask()` to `ADMIN_OPERATIONS` or `CREATIVE_PRODUCTION`
for revision. The agent writes a `QC_FAIL_NOTIFY` audit event. Asset status is
already `REVISION_REQUIRED` (set by `createQcReview` in Step 3).

### 2.3 Blockers (Implementation Gated)

| # | Blocker | Required Decision |
|---|---------|-------------------|
| B1 | `COORDINATE_QC_REVIEW` IntentType | Owner approval + schema migration to add to `agent_tasks.intent_type` CHECK constraint |
| B2 | AGENT_ALLOWLIST expansion | Owner approval for `qc.script.review` and `qc.brand.alignment` — requires new or amended DR per DR 0075 §2.2 |
| B3 | `qc-review` specialist agent | Owner approval to add to `SPECIALIST_AGENT_REGISTRY` (following DR 0108 pattern) |

Until B2 is resolved, the QC Agent coordinates only `qc.asset.metadata` (via existing
`qc-metadata` specialist). Script review and brand alignment remain human-invoked skills
presented through the existing admin UI. Implementation may begin for the partial
(metadata-only) flow once B1 and B3 are resolved; the full three-skill flow requires B2.

### 2.4 Complex Agent Delegation

The QC Agent is a new specialist agent in the `SPECIALIST_AGENT_REGISTRY`
(pattern: DR 0108). Delegation function: `delegateQcReview()` in
`lib/agents/qc-review-specialist.ts`.

Delegation triggered by a `COORDINATE_QC_REVIEW` agent task.
Initiator roles: `OWNER`, `ADMIN_OPERATIONS`, `QC`.

Sub-tasks the QC Agent MAY create:
- `INSPECT_ASSET_METADATA` sub-task → `qc-metadata` specialist (DR 0108, no expansion needed)
- (Blocked on B2) sub-tasks for `qc.script.review` and `qc.brand.alignment`

The QC Agent MAY NOT:
- Call `createQcReview` or any function that writes to `production.qc_reviews`
- Transition `production.assets.status` by any path
- Approve its own `QC_GATE` step — only human reviewers may resolve it
- Invoke `qc.script.review` or `qc.brand.alignment` before B2 is resolved
- Access `financial.*` tables
- Spawn sub-tasks outside the approved AGENT_ALLOWLIST

### 2.5 Permissions

- Initiator roles: `OWNER`, `ADMIN_OPERATIONS`, `QC`
- Sub-task initiator role: inherited from parent (delegated-authority model, DR 0108)
- `CLIENT` and `AGENT` may not initiate
- `CREATIVE_PRODUCTION` may not initiate
- QC_GATE resolution: `OWNER`, `ADMIN_OPERATIONS`, `QC` only (enforced by existing `createQcReview`)

### 2.6 Financial and Security Boundaries

- Zero financial authority. The QC Agent reads no `financial.*` tables.
- QC recommendations may not contain internal production cost, estimated cost,
  margin, or AI generation cost data.
- No pricing, settlement, or budget modifications.
- All operations are org-scoped; no cross-organization asset access.

### 2.7 Human Approval Gates

| Gate | Condition | Required approver |
|---|---|---|
| QC_GATE (Step 3) | Before any asset status transition | `OWNER`, `ADMIN_OPERATIONS`, or `QC` (via `createQcReview`) |
| QC FAIL escalation | Verdict is FAIL | `ADMIN_OPERATIONS` or `CREATIVE_PRODUCTION` for revision |

**The QC_GATE is architecturally mandatory (DR 0090 §2.2). It cannot be bypassed.**

### 2.8 Audit Requirements

| Event | When |
|---|---|
| `QC_REVIEW_STARTED` | QC agent task created |
| `QC_SKILL_DISPATCHED` | Each skill sub-task started |
| `QC_SKILL_RESULT` | Each skill sub-task completed |
| `QC_GATE_PENDING` | QC_GATE step entered, awaiting human verdict |
| `QC_PASS_NOTIFY` | Verdict PASS, delivery workflow notified |
| `QC_FAIL_NOTIFY` | Verdict FAIL, revision workflow triggered |

Standard orchestration events also apply. Note: asset status transition audit events
(`ASSET_CLIENT_PREVIEW`, `ASSET_REVISION_REQUIRED`) are written by `createQcReview`
(existing `lib/admin/qc.ts`) — not by the QC Agent.

### 2.9 Retry and Escalation

- QC skill sub-task transient failures: up to 2 retries (existing `MAX_STEP_RETRIES`)
- QC skill sub-task non-transient failures: escalate to `ADMIN_OPERATIONS`; human reviewer
  may still submit a verdict via the admin UI independently of the agent task state
- QC_GATE timeout/expiry: escalate to `OWNER`; gate does not auto-resolve
- Escalation: existing `escalateTask()` + `sendEscalationEmail()` to `ADMIN_OPERATIONS`/`OWNER`

### 2.10 New Module Structure (PROPOSED — not implemented by this record)

```
lib/agents/
  qc-review-specialist.ts          — specialist agent + delegateQcReview()
  __tests__/qc-review-specialist.test.ts
```

No file may be written until blockers B1 and B3 are resolved. Full three-skill flow
additionally requires B2.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume this record authorizes any AGENT_ALLOWLIST expansion.
- Do not assume the QC Agent may call `createQcReview` — it is excluded (DR 0090 §2.4).
- Do not assume the QC Agent may transition asset status by any path (DR 0090 §2.4).
- Do not assume the QC_GATE may be auto-resolved without human input (DR 0090 §2.2).
- Do not assume `qc.script.review` or `qc.brand.alignment` are on the AGENT_ALLOWLIST
  — they are not; expansion requires new DR (DR 0075 §2.2).
- Do not assume `COORDINATE_QC_REVIEW` is an approved IntentType — it is PROPOSED.
- Do not assume the QC Agent has any financial authority.
- Do not implement code until blockers B1 and B3 are resolved (partial flow)
  or until B2 is also resolved (full three-skill flow).

---

## 4. Impact

| File | Change |
|------|--------|
| `docs/decisions/0114-qc-agent.md` | New — this DR |

No code changes. Implementation blocked pending Owner decisions on §2.3.

---

## 5. Owner Approval

**Status: PENDING.**

Required Owner decisions before implementation may begin:
1. Approve `COORDINATE_QC_REVIEW` IntentType and associated schema migration (B1)
2. Explicitly approve AGENT_ALLOWLIST expansion for `qc.script.review` and
   `qc.brand.alignment` — requires new or amended DR (B2)
3. Approve `qc-review` entry in `SPECIALIST_AGENT_REGISTRY` (B3)

Partial implementation (metadata-only QC flow) may proceed once B1 and B3 are resolved.
Full three-skill flow requires all three.
