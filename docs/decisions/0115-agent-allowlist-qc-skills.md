# DR 0115 — AGENT_ALLOWLIST Expansion: QC Skills

**Status:** APPROVED — Owner-authorized AGENT_ALLOWLIST expansion for `qc.script.review`
and `qc.brand.alignment`. Implements DR 0075 §2.2 expansion gate.
**Phase:** QC Agent
**Date:** 2026-09-17
**Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `f71f0fc`
**Relationship to prior records:** Resolves DR 0114 blocker B2. Amends DR 0075 §2.2
(AGENT_ALLOWLIST). Does not modify Decision Records 0001–0114 in any other respect.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout this record set.

---

## 1. Context

**FACT (DR 0075 §2.2):** The AGENT_ALLOWLIST is an explicit, enumerated set. Any
expansion requires Owner approval and a new or amended Decision Record. This record
provides that approval and amendment.

**FACT (DR 0075 §2.2):** The current AGENT_ALLOWLIST contains exactly:
- `utility.prompt.optimize`
- `qc.asset.metadata`

**FACT (DR 0114 §2.3 B2):** DR 0114 (QC Agent) identifies AGENT_ALLOWLIST expansion
for `qc.script.review` and `qc.brand.alignment` as blocker B2, required before the
QC Agent may delegate these skills as sub-tasks.

**FACT:** `qc.script.review` is implemented in `lib/skills/qc/script-review.ts`.
It evaluates a script for brand voice, clarity, and compliance. It produces a
`SkillResult` written to `production.skill_outputs`. It does not modify asset status.

**FACT:** `qc.brand.alignment` is implemented in `lib/skills/qc/brand-alignment.ts`.
It evaluates an asset against brand guidelines. It produces a `SkillResult` written to
`production.skill_outputs`. It does not modify asset status.

**FACT:** Both skills are purely advisory. Their output is a machine recommendation only.
Neither skill issues a binding QC verdict, modifies `production.assets.status`, or
writes to `production.qc_reviews`. Binding verdict authority remains exclusively with
authorized human reviewers via `createQcReview` (DR 0090 §2.2).

---

## 2. Decision

### 2.1 AGENT_ALLOWLIST Expansion

**APPROVED:** Add the following two skill IDs to the AGENT_ALLOWLIST in
`lib/skills/authority.ts`:

| Skill ID | File | Purpose |
|---|---|---|
| `qc.script.review` | `lib/skills/qc/script-review.ts` | Script quality and compliance review |
| `qc.brand.alignment` | `lib/skills/qc/brand-alignment.ts` | Brand guideline alignment check |

The AGENT_ALLOWLIST after this expansion:
```
utility.prompt.optimize     (DR 0075)
qc.asset.metadata           (DR 0075)
qc.script.review            (this record — DR 0115)
qc.brand.alignment          (this record — DR 0115)
```

### 2.2 Scope and Constraints

These skills, when invoked by an AGENT task, operate under the same constraints as
all AGENT_ALLOWLIST skills:

- Authorized AGENT roles may invoke them via sub-task delegation only (not directly)
- Each invocation produces a `SkillResult` in `production.skill_outputs` — advisory only
- Neither skill may write to `production.qc_reviews` (DR 0090 §2.4 — human-only path)
- Neither skill may modify `production.assets.status` by any path
- Neither skill may access `financial.*` tables
- Sub-tasks run with `parent_task_id` set; organization-scoped; no cross-org access
- Initiator roles for sub-tasks: inherited from parent task (delegated-authority model, DR 0108)
- QC skill output may not contain internal production cost, AI generation cost, margin,
  or any internal financial data

### 2.3 QC Machine Recommendation vs. Binding Verdict

**FACT (DR 0090 §2.2):** An authoritative QC verdict is established only when an
authorized human submits via `createQcReview`. The AGENT_ALLOWLIST expansion for
`qc.script.review` and `qc.brand.alignment` does NOT authorize:
- AGENT calls to `createQcReview`
- AGENT-driven asset status transitions
- AGENT auto-resolution of `QC_GATE` steps

This expansion authorizes machine recommendations only, consistent with DR 0090 §2.1.

### 2.4 Permissions

- Initiator roles permitted to delegate these skills as sub-tasks: `OWNER`, `ADMIN_OPERATIONS`, `QC`
- `CLIENT` and `AGENT` may not initiate tasks that delegate these skills
- `CREATIVE_PRODUCTION` may not initiate QC tasks

---

## 3. Explicitly Prohibited Assumptions

- Do not assume this record authorizes any additional AGENT_ALLOWLIST expansion beyond
  the two skills listed above.
- Do not assume AGENT invocation of `qc.script.review` or `qc.brand.alignment` produces
  a binding QC verdict — machine recommendation only (DR 0090 §2.1).
- Do not assume the QC Agent may call `createQcReview` — still excluded (DR 0090 §2.4).
- Do not assume the QC Agent may transition `production.assets.status` by any path.
- Do not assume the QC_GATE may be auto-resolved — mandatory human input (DR 0090 §2.2).
- Do not assume any financial authority is granted by this expansion.

---

## 4. Impact

| File | Change |
|------|--------|
| `docs/decisions/0115-agent-allowlist-qc-skills.md` | New — this DR |
| `lib/skills/authority.ts` | Add `qc.script.review` and `qc.brand.alignment` to AGENT_ALLOWLIST |

---

## 5. Owner Approval

**Status: APPROVED.**

This record constitutes the Owner-approved AGENT_ALLOWLIST expansion required by
DR 0114 §2.3 blocker B2. Implementation may proceed: update `lib/skills/authority.ts`
to add `qc.script.review` and `qc.brand.alignment` to the `AGENT_ALLOWLIST` set.
