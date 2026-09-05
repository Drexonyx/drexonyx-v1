# Decision Record 0062 — Phase 09: ProductionJob Terminal State Authority (First Draft)

- **Decision Round:** Phase 09
- **Phase:** 09 — Agent Runtime
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Relationship to DR 0063:** This record is the first batch draft of the
  ProductionJob terminal-transition authority decision, produced in the same
  decision batch as DR 0055–0061. DR 0063 is the standalone, authoritative
  record produced per explicit Owner instruction to formalize this decision
  independently of DR 0056. The substantive content of this record and DR 0063
  is the same. DR 0063 is the authoritative record for all implementation
  purposes. This record is preserved per formalization rules and does not
  supersede DR 0063.
- **Relationship to prior records:** Does not modify Decision Records 0001–0061.
  All remain authoritative and unchanged. This record is intentionally separate
  from DR 0056 (Agent Runtime Authority Scope), which explicitly does not
  authorize ProductionJob terminal transitions.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0061. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0056 §2.4, §2.6):** DR 0056 explicitly does not authorize
ProductionJob RUNNING → COMPLETED or RUNNING → FAILED. These transitions were
marked as DEFERRED/REQUIRES OWNER DECISION in DR 0056 §2.6. This record (and
DR 0063) provides the Owner decision that resolves that gap.

**FACT (DR 0053 §3):** ProductionJob terminal states: COMPLETED, FAILED,
CANCELLED.

**FACT (DR 0058 §2.6):** The generation lifecycle driver halts after Step 6
without performing any ProductionJob terminal transition. The authority for
those transitions is in this record and DR 0063.

---

## 2. Decision

**PROPOSED (Owner instruction, Phase 09 pre-BUILD):**

### 2.1 ProductionJob RUNNING → COMPLETED — Conditions

**PROPOSED:** ProductionJob RUNNING → COMPLETED is authorized when ALL of the
following conditions are met:

1. All AiGeneration records associated with the ProductionJob have reached
   SUCCEEDED status.
2. All Asset records associated with the ProductionJob have reached
   READY_FOR_QC status.
3. No incomplete processing steps remain for any entity in the ProductionJob's
   scope.

A CAS guard is required: `WHERE status = 'RUNNING' RETURNING id`. An empty
RETURNING result means the job has already transitioned; treat as no-op.

### 2.2 ProductionJob RUNNING → FAILED — Conditions

**PROPOSED:** ProductionJob RUNNING → FAILED is authorized when ANY of the
following conditions are met:

1. An unrecoverable failure has occurred — a permanent AiGeneration failure
   (per DR 0061 §2.2) with no retry remaining.
2. Retry exhaustion has occurred — `retry_count = 2` and the most recent
   AiGeneration attempt has reached FAILED (per DR 0061 §2.5).

A CAS guard is required: `WHERE status = 'RUNNING' RETURNING id`. An empty
RETURNING result means the job has already transitioned; treat as no-op.

### 2.3 ProductionJob RUNNING → CANCELLED — Not Authorized in Phase 09

**PROPOSED:** ProductionJob RUNNING → CANCELLED is NOT authorized in Phase 09.
If cancellation is needed in a future phase, it requires a separate Decision
Record.

### 2.4 Separation from DR 0056

**PROPOSED:** This record grants authority for ProductionJob terminal transitions
that DR 0056 explicitly withheld. DR 0056 is not modified by this record. The
two records are complementary and intentionally separate.

### 2.5 Audit Events

**PROPOSED:** Every ProductionJob terminal transition authorized by this record
must write a `system.audit_events` entry. Actor identity: `actor_role = 'AGENT'`,
`actor_id = production_job_id` per DR 0064.

---

## 3. Note on Relationship to DR 0063

DR 0063 is the standalone authoritative record for ProductionJob terminal-
transition authority, produced per explicit Owner instruction. For all
implementation purposes, DR 0063 is the record to reference. This record (DR 0062)
is preserved as the first batch draft and is not superseded in the sense of being
invalidated — both records carry APPROVED status and the same substantive content.

---

## 4. Explicitly Prohibited Assumptions

- Do not assume the runtime driver (DR 0058) performs ProductionJob terminal
  transitions — it does not; they are performed by a separate mechanism.
- Do not assume RUNNING → CANCELLED is authorized in Phase 09 — it is not (§2.3).
- Do not assume CAS guard is optional — required for every transition (§2.1, §2.2).
- Do not assume DR 0056 is modified by this record — it is not (§2.4).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0061 have been altered, reinterpreted,
  or superseded.

---

## 5. Owner Approval

Owner approved 2026-09-05.

**No implementation is authorized by approval of this record alone.**
Phase 09 BUILD authorization is a separate, subsequent decision.
