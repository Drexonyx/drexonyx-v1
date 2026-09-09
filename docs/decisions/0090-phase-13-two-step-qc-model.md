# Decision Record 0090 — Phase 13: Two-Step QC — Skill Recommendation vs Human Verdict

- **Decision Round:** Phase 13
- **Phase:** 13 — QC & Revision Engine
- **Status:** APPROVED — Owner approved 2026-09-08. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-08
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
  — Base commit 1ffd894 (Phase 12 final)
- **Clarifies:** The boundary between QC Skill invocation (machine recommendation)
  and QC Review submission (authoritative human verdict) — a distinction established
  in DR 0072 and DR 0075 but not codified as a standalone record.
- **Relationship to prior records:** Does not modify Decision Records 0001–0089.
  All remain authoritative and unchanged. Depends on DR 0072 (skill architecture),
  DR 0075 (skill invocation authority), DR 0006 (Asset state machine), DR 0089
  (QC gates).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0089. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0072 §2.1):** Skills are modular service functions invoked via the
POST `/api/skills/[skillId]` route. A skill's `execute()` method returns a
`SkillResult` that is persisted to `production.skill_outputs`. A skill does
not write to any other table unless explicitly authorized by its own DR.

**FACT (DR 0075 §2.3):** The following QC skills exist:
- `qc.asset.metadata` — authorized for OWNER, ADMIN_OPERATIONS, QC (human roles)
  and AGENT (machine).
- `qc.script.review` — authorized for OWNER, ADMIN_OPERATIONS, QC (human roles);
  AGENT is NOT authorized.
- CREATIVE_PRODUCTION is excluded from all QC skill invocations.
- CLIENT is excluded from all skill invocations.

**FACT (lib/skills/authority.ts, Phase 13 inspection):** The AGENT allowlist
for skill invocation is `['utility.prompt.optimize', 'qc.asset.metadata']`.
An AGENT may invoke `qc.asset.metadata` but not `qc.script.review`.

**FACT (lib/skills/qc/script-review.ts, Phase 13 inspection):** The
`qc.script.review` skill returns a `SkillResult` containing `verdict`,
`findings`, `score`, and `recommendations`. This result is stored in
`production.skill_outputs`. The skill does not write to `production.qc_reviews`.
The skill does not update `production.assets.status`.

**FACT (lib/admin/qc.ts, Phase 13 inspection):** `createQcReview` is the
only function that inserts a row into `production.qc_reviews` and transitions
`production.assets.status` from READY_FOR_QC to CLIENT_PREVIEW (PASS) or
REVISION_REQUIRED (FAIL). It is called by the admin server action
`actionCreateQcReview`, which requires an authenticated session with a QC_ROLE.

**FACT (DR 0075 §2.2, lib/skills/authority.ts):** QC_ROLES for skill
invocation: `['OWNER', 'ADMIN_OPERATIONS', 'QC']`. CREATIVE_PRODUCTION is
excluded.

---

## 2. Decision: The Two-Step Model

### 2.1 Step 1 — QC Skill Invocation: Machine Recommendation Only

**APPROVED (existing behavior, DR 0072, DR 0075):** When a QC skill (such as
`qc.asset.metadata` or `qc.script.review`) is invoked:

1. The skill's `execute()` method runs and returns a `SkillResult`.
2. The `SkillResult` is persisted to `production.skill_outputs` exactly once.
3. No `production.qc_reviews` row is created.
4. No `production.assets.status` transition occurs.
5. No audit event with `action = 'ASSET_CLIENT_PREVIEW'` or
   `action = 'ASSET_REVISION_REQUIRED'` is written.

A QC skill result is a machine recommendation. It carries no binding authority
over the Asset's status.

### 2.2 Step 2 — QC Review Submission: Authoritative Human Verdict

**APPROVED (existing behavior, lib/admin/qc.ts):** An authoritative QC verdict
is established only when an authorized human admin submits a QC review via
`createQcReview` (called through `actionCreateQcReview`). This action:

1. Inserts a row into `production.qc_reviews` with the human-supplied `verdict`
   (PASS or FAIL) and optional `notes`.
2. Transitions the Asset status:
   - PASS → CLIENT_PREVIEW
   - FAIL → REVISION_REQUIRED
3. Writes an audit event (`ASSET_CLIENT_PREVIEW` or `ASSET_REVISION_REQUIRED`).
4. Requires the actor's role to be in QC_ROLES: `['OWNER', 'ADMIN_OPERATIONS', 'QC']`.

This is the only path that transitions an Asset out of READY_FOR_QC.

### 2.3 Human Reviewer Sovereignty

**PROPOSED:** The human reviewer who submits a QC review (Step 2) is not bound
by the QC skill recommendation from Step 1. The human reviewer may:
- Agree with the skill recommendation and submit the same verdict.
- Disagree with the skill recommendation and submit a different verdict.
- Submit a QC review without having reviewed any skill output.

No implementation may enforce that a Step 1 skill invocation occurred before
a Step 2 review is submitted. The sequence is the recommended workflow, not a
system-enforced precondition.

### 2.4 AGENT Invocation of qc.asset.metadata

**APPROVED (existing behavior, DR 0075, lib/skills/authority.ts):** When the
AGENT invokes `qc.asset.metadata`:

1. The skill executes and its `SkillResult` is stored in `production.skill_outputs`.
2. No `production.qc_reviews` row is created.
3. No `production.assets.status` transition occurs.
4. The AGENT does not gain authority to submit a QC review by virtue of this
   invocation.

The AGENT is excluded from `createQcReview`. AGENT skill invocation is limited
to the allowlist in DR 0075. No mechanism in Phases 1–13 allows an AGENT to
cause an Asset status transition via a QC path.

### 2.5 Future Automation: Requires New DR

**PROPOSED:** Any future automation that would allow a machine to directly
produce a binding QC verdict (i.e., insert a `qc_reviews` row or transition
Asset status) without a human submission requires a new, explicitly authorized
Decision Record. No existing DR authorizes this behavior. Implementing it by
having a service function call `createQcReview` with a synthetic actor identity
is prohibited without such a record.

### 2.6 Skill Output Does Not Expire or Block

**PROPOSED:** A QC skill result stored in `production.skill_outputs` does not
expire, block, or gate the human QC review submission. An admin may submit a
QC review regardless of the age or content of any skill output for the same
asset.

### 2.7 No Changes to Skill Architecture

**PROPOSED:** This record does not modify the skill invocation boundary (DR 0072),
the skill output persistence model (DR 0071), or the skill invocation authority
(DR 0075). Those records remain authoritative. This record clarifies the
relationship between skill output and QC review — it does not add new
capabilities to either.

---

## 3. Sequence Diagram (Informational)

```
Admin (QC role)        QC Skill               qc_reviews         assets.status
      │                    │                       │                    │
      │── invoke skill ───►│                       │                    │
      │                    │── store skill_output ─┤                    │
      │◄─ SkillResult ─────│                       │                    │
      │                    │                       │                    │
      │ (review result)    │                       │                    │
      │                    │                       │                    │
      │── submit verdict ──────────────────────────►── insert row       │
      │                    │                       │          │── CAS ──►│
      │                    │                       │          │  update  │
      │                    │                       │          │          │ READY_FOR_QC
      │                    │                       │          │          │  → CLIENT_PREVIEW (PASS)
      │                    │                       │          │          │  → REVISION_REQUIRED (FAIL)
```

The skill invocation (Step 1) and review submission (Step 2) are separate
round-trips. Step 1 is optional from the system's perspective.

---

## 4. Explicitly Prohibited Assumptions

- Do not assume a QC skill invocation creates a `qc_reviews` row — it does
  not (§2.1).
- Do not assume a QC skill invocation transitions Asset status — it does not (§2.1).
- Do not assume the human reviewer must agree with or reference the skill
  recommendation — reviewer sovereignty applies (§2.3).
- Do not assume Step 1 is a required precondition for Step 2 — it is not (§2.3).
- Do not assume the AGENT may submit a QC review — AGENT is excluded from
  QC_ROLES and from `createQcReview` (§2.4).
- Do not assume an AGENT invocation of `qc.asset.metadata` constitutes a
  QC verdict — it produces a recommendation only (§2.4).
- Do not assume future automation may reuse `createQcReview` with a synthetic
  actor without a new DR — prohibited (§2.5).
- Do not assume CREATIVE_PRODUCTION may invoke QC skills — excluded per DR 0075 (§1).
- Do not assume this record modifies Decision Records 0001–0089 — it does not.
- Do not assume this record authorizes schema changes, migrations, commits,
  or pushes.

---

## 5. Owner Approval

Owner approved 2026-09-08.

**No implementation is authorized by approval of this record alone.**
Phase 13 BUILD authorization is a separate, subsequent decision.
