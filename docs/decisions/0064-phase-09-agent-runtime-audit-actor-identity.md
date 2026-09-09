# Decision Record 0064 — Phase 09: Agent Runtime Audit Actor Identity

- **Decision Round:** Phase 09
- **Phase:** 09 — Agent Runtime
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** DR 0055 §2.9 (audit actor identity for the Agent Runtime).
  Establishes the actor_role and actor_id values written to `system.audit_events`
  for all runtime state transitions.
- **Relationship to prior records:** Does not modify Decision Records 0001–0063.
  All remain authoritative and unchanged. Depends on DR 0002 §6 (audit events
  schema), DR 0053 §7 (D14 audit action strings for Phase 08 entities), DR 0054
  §7 (D14 audit action strings for Asset file operations), DR 0055 (runtime
  authentication), DR 0056 (runtime authority scope).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0063. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0002 §6):** `system.audit_events` schema: `actor_id` (UUID, nullable),
`actor_role` (TEXT), `entity_type` (TEXT), `entity_id` (UUID), `action` (TEXT),
`payload` (JSONB), `organization_id` (UUID), `created_at` (TIMESTAMPTZ).

**FACT (DR 0053 §7, DR 0054 §7):** D14 audit action strings are defined for
Phase 08 and Phase 09 entities. The action strings (e.g., 'production_job.started',
'ai_generation.dispatched', 'asset.ready_for_qc') are established in those records.

**FACT (DR 0055 §2.9):** DR 0055 identified actor identity for runtime audit
events as an open item requiring a separate decision. This record resolves it.

**FACT (DR 0055 §2.8):** Approving the runtime's Scoped Service Token does not
create an Auth.js authentication pathway for the AGENT role. The actor identity
in audit events must reflect the real runtime identity without fabricating a
human actor.

---

## 2. Decision

**PROPOSED (Owner instruction, Phase 09 pre-BUILD):**

### 2.1 actor_role = 'AGENT' for All Runtime Audit Events

**PROPOSED:** For every `system.audit_events` entry written by the Agent Runtime
(the async generation driver, DR 0058; the terminal-transition mechanism, DR 0063),
the `actor_role` field is set to `'AGENT'`.

`'AGENT'` is the canonical role string identifying the runtime process as the
actor. It is consistent with the AGENT role defined in the schema (DR 0053 §10.8)
and does not fabricate a human identity.

### 2.2 actor_id = production_job_id for All Runtime Audit Events

**PROPOSED:** The `actor_id` field in every runtime audit event is set to the
`production_job_id` (the UUID of the ProductionJob being executed at the time of
the event). This provides:

1. **Correlation:** Every audit event written during a production job's execution
   can be grouped by `actor_id = production_job_id`.
2. **Traceability:** The production_job_id traces directly to the ProductionJob
   record, revealing the full context of the runtime action.
3. **Non-fabrication:** The production_job_id is a real entity identifier in the
   system — not a made-up user ID or a system-reserved UUID.

### 2.3 NULL actor_id Is Prohibited for Runtime Audit Events

**PROPOSED:** Runtime audit events must not have `actor_id = NULL`. The
production_job_id is always available to the runtime when performing any
authorized transition; there is no legitimate scenario in which the runtime writes
a state-mutation audit event without knowing the production_job_id.

### 2.4 actor_role = 'AGENT' Does Not Create an Auth.js Pathway

**PROPOSED:** Setting `actor_role = 'AGENT'` in audit events does not create,
imply, or enable any Auth.js authentication pathway for the AGENT role. The
audit event actor identity is an internal record of who performed an action.
It is not an authentication credential.

### 2.5 D14 Audit Action Strings — Already Defined

**PROPOSED:** The audit action strings for Phase 09 runtime events follow the
D14 naming pattern established in DR 0053 §7 and DR 0054 §7. No new D14 action
strings are required for Phase 09 beyond those already defined in DR 0053 and
DR 0054 for ProductionJob, AiGeneration, and Asset transitions. The D14 action
strings were confirmed as complete in the Phase 09 decision planning process.

### 2.6 Audit Events — Tenant Isolation

**PROPOSED:** All runtime audit events include `organization_id` from the Scoped
Service Token's validated scope (DR 0055, DR 0065). The `organization_id` in the
audit event must match the `organization_id` of the entity being mutated.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume `actor_id` may be NULL for runtime audit events — it is prohibited
  (§2.3).
- Do not assume any human user ID may be used as `actor_id` for runtime events —
  `production_job_id` only (§2.2).
- Do not assume `actor_role = 'AGENT'` creates an Auth.js pathway — it does not
  (§2.4).
- Do not assume new D14 action strings are required beyond DR 0053 §7 and
  DR 0054 §7 — they are not (§2.5).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0063 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

**No implementation is authorized by approval of this record alone.**
Phase 09 BUILD authorization is a separate, subsequent decision.
