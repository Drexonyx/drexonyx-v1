# Decision Record 0056 — Phase 09: Agent Runtime Authority Scope

- **Decision Round:** Phase 09
- **Phase:** 09 — Agent Runtime
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 09 pre-BUILD blocker: exact set of state transitions the
  Agent Runtime is authorized to perform. This is an exhaustive list — no
  transitions beyond those in §2.1 are authorized by this record.
- **Relationship to prior records:** Does not modify Decision Records 0001–0054.
  All remain authoritative and unchanged. Depends on DR 0053 (state machines for
  ProductionJob, AiGeneration, Asset), DR 0055 (runtime authentication). DR 0063
  resolves the ProductionJob terminal-transition gap identified in §2.6 of this
  record. This record is intentionally separate from DR 0063.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0054. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0053 §3):** ProductionJob state machine: QUEUED → RUNNING → COMPLETED
| FAILED | CANCELLED.

**FACT (DR 0053 §4):** AiGeneration state machine: REQUESTED → RUNNING →
SUCCEEDED | FAILED | CANCELLED.

**FACT (DR 0053 §5):** ProductionJob creation is human-initiated (OWNER or
ADMIN_OPERATIONS). The runtime does not create ProductionJobs.

**FACT (DR 0053 §10.8):** AGENT is excluded from all ProductionJob mutations at
creation. This prohibition is preserved in full.

**FACT (Phase 09 PLAN):** The runtime must claim and drive production jobs.
Claiming requires at minimum transitioning ProductionJob QUEUED → RUNNING.
Driving requires AiGeneration and Asset state transitions.

---

## 2. Decision

**PROPOSED (Owner instruction, Phase 09 pre-BUILD):**

### 2.1 Exhaustive List of Authorized Runtime Transitions

**PROPOSED:** The Agent Runtime is authorized to perform exactly the following
six state transitions, and NO OTHERS:

1. **ProductionJob: QUEUED → RUNNING** — atomic CAS claim of a queued job.
2. **AiGeneration: REQUESTED → RUNNING** — dispatch to provider accepted.
3. **AiGeneration: RUNNING → SUCCEEDED** — provider confirms successful generation.
4. **AiGeneration: RUNNING → FAILED** — provider confirms failure or error condition.
5. **AiGeneration: RUNNING → CANCELLED** — cancellation of an in-progress generation.
6. **Asset: PROCESSING → READY_FOR_QC** — asset ready for quality check after
   successful generation and file storage.

This list is exhaustive. Any transition not in this list is not authorized by
this record.

### 2.2 CAS Guard Required for All Transitions

**PROPOSED:** Every transition in §2.1 must be performed using a
Compare-And-Swap (CAS) guard: the `WHERE status = '<expected>' RETURNING id`
pattern. An empty RETURNING result indicates the entity has already been
transitioned by another process; the runtime must treat this as a no-op
and must not retry the transition as if it were an error.

### 2.3 Tenant Isolation — organizationId from Token Scope Only

**PROPOSED:** For all authorized transitions, the `organization_id` used in
the WHERE clause of every mutation must come from the Scoped Service Token's
validated scope (DR 0055, DR 0065). It must never come from a caller-supplied
parameter, URL path, or request body.

### 2.4 Explicitly Prohibited Transitions — ProductionJob Terminal States

**PROPOSED:** The runtime is explicitly NOT authorized to perform:

1. **ProductionJob: RUNNING → COMPLETED** — DEFERRED/REQUIRES OWNER DECISION
   (see §2.6). Authorized by DR 0063.
2. **ProductionJob: RUNNING → FAILED** — DEFERRED/REQUIRES OWNER DECISION
   (see §2.6). Authorized by DR 0063.
3. **ProductionJob: RUNNING → CANCELLED** — NOT authorized in Phase 09.
4. Any other ProductionJob transition beyond QUEUED → RUNNING (item 1 in §2.1).

No inference of authority from the desired production lifecycle is permitted.
If the runtime encounters a condition that would logically require a ProductionJob
terminal transition, it must HALT and preserve state per DR 0058 §2.2 step 6.

### 2.5 Runtime State-Transition Authority Table

| Entity | Transition | Authorized | Authority |
|---|---|---|---|
| ProductionJob | QUEUED → RUNNING | ✓ | §2.1 item 1 |
| ProductionJob | RUNNING → COMPLETED | ✗† | DR 0063 |
| ProductionJob | RUNNING → FAILED | ✗† | DR 0063 |
| ProductionJob | RUNNING → CANCELLED | ✗ | Not authorized |
| AiGeneration | REQUESTED → RUNNING | ✓ | §2.1 item 2 |
| AiGeneration | RUNNING → SUCCEEDED | ✓ | §2.1 item 3 |
| AiGeneration | RUNNING → FAILED | ✓ | §2.1 item 4 |
| AiGeneration | RUNNING → CANCELLED | ✓ | §2.1 item 5 |
| Asset | PROCESSING → READY_FOR_QC | ✓ | §2.1 item 6 |
| Asset | UPLOADED → PROCESSING | ✗ | Not authorized by this record |
| Any entity | Any other transition | ✗ | Not authorized |

✗† = The prohibition in this record is superseded by DR 0063, which grants these
transitions under the conditions specified in that record. DR 0063 is intentionally
separate from this record and does not modify it.

### 2.6 Open Gap — ProductionJob Terminal Transitions (Resolved by DR 0063)

**DEFERRED / RESOLVED BY DR 0063:** The ProductionJob RUNNING → COMPLETED and
RUNNING → FAILED transitions are not authorized by this record. These transitions
are necessary for the complete production lifecycle but require a separate,
explicit Owner decision specifying the completion conditions and failure conditions.

DR 0063 — ProductionJob Terminal-Transition Authority — is that separate decision.
It is intentionally independent of this record. Nothing in DR 0063 modifies or
reinterprets this record.

### 2.7 No Runtime Creation Authority

**PROPOSED:** The runtime may not create any of the following entities:
ProductionJob, AiGeneration, Asset, Order, Quote, Campaign, Approval, Delivery,
Payment, or any financial record. Creation of these entities remains in the
authority of human-role service functions (OWNER, ADMIN_OPERATIONS, etc.).

### 2.8 No Human-Role Authority Expansion

**PROPOSED:** The runtime authority defined in this record does not expand the
authority of any human role. Human roles retain their existing authority as defined
in DR 0001–0054. This record defines runtime-only authority, not human-role
authority.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume any transition beyond the six in §2.1 is authorized — it is not.
- Do not assume ProductionJob RUNNING → COMPLETED is authorized by this record —
  it is not; see DR 0063 (§2.4, §2.6).
- Do not assume ProductionJob RUNNING → FAILED is authorized by this record —
  it is not; see DR 0063 (§2.4, §2.6).
- Do not assume ProductionJob RUNNING → CANCELLED is authorized in Phase 09 —
  it is not (§2.4 item 3).
- Do not assume CAS guard is optional — it is required for every transition (§2.2).
- Do not assume organization_id may come from caller input — server-side scope
  only (§2.3).
- Do not assume the runtime may create any entity — creation is not authorized (§2.7).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0054 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

**No implementation is authorized by approval of this record alone.**
Phase 09 BUILD authorization is a separate, subsequent decision.
