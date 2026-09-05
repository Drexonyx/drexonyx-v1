# Decision Record 0063 — Phase 09: ProductionJob Terminal-Transition Authority

- **Decision Round:** Phase 09
- **Phase:** 09 — Agent Runtime
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** DR 0056 §2.6 (ProductionJob terminal-transition authority,
  DEFERRED/REQUIRES OWNER DECISION) and DR 0058 §2.9 (same gap identified in
  the lifecycle driver). This is the intentionally standalone, authoritative
  record for ProductionJob terminal-transition authority in Phase 09.
- **Relationship to prior records:** Does not modify Decision Records 0001–0062.
  All remain authoritative and unchanged. This record is intentionally separate
  from DR 0056 (Agent Runtime Authority Scope). DR 0056 explicitly does not
  authorize ProductionJob terminal transitions. This record fills that gap without
  modifying or reinterpreting DR 0056. Depends on DR 0053 (ProductionJob state
  machine), DR 0056 (runtime authority baseline), DR 0058 (driver halts without
  performing terminal transitions), DR 0061 (failure and retry model).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0062. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0056 §2.4, §2.6):** DR 0056 explicitly prohibits the runtime from
performing ProductionJob RUNNING → COMPLETED and RUNNING → FAILED. These were
marked DEFERRED/REQUIRES OWNER DECISION in DR 0056 §2.6, to be resolved by a
separate decision record. This is that record.

**FACT (DR 0058 §2.6):** The generation lifecycle driver halts at Step 6.
ProductionJob remains in RUNNING status after the driver halts. The driver does
not perform ProductionJob terminal transitions.

**FACT (DR 0053 §3):** ProductionJob terminal states: COMPLETED, FAILED,
CANCELLED.

**FACT (DR 0061 §2.5):** After retry exhaustion (AiGeneration retry_count = 2,
third attempt FAILED), ProductionJob RUNNING → FAILED becomes eligible.

---

## 2. Decision

**PROPOSED (Owner instruction, Phase 09 pre-BUILD — standalone terminal authority):**

### 2.1 This Record Is Intentionally Separate from DR 0056

**PROPOSED:** This record grants ProductionJob terminal-transition authority that
DR 0056 explicitly withheld. DR 0056 is not modified, reinterpreted, or
superseded by this record. The two records are complementary. For all Phase 09
implementation purposes, this record is the authoritative source for ProductionJob
terminal-transition authority.

### 2.2 ProductionJob RUNNING → COMPLETED — Conditions and CAS Guard

**PROPOSED:** ProductionJob RUNNING → COMPLETED is authorized when ALL of the
following conditions are confirmed by server-side database query:

1. All `production.ai_generations` records with `production_job_id = $job_id`
   and `organization_id = $org_id` have `status = 'SUCCEEDED'`.
2. All `production.assets` records associated with the ProductionJob's order
   have `status = 'READY_FOR_QC'`.
3. No AiGeneration records in REQUESTED, RUNNING, or any non-terminal status
   remain for the job.

**PROPOSED:** The transition is performed with a CAS guard:
```
UPDATE production.production_jobs
SET status = 'COMPLETED', updated_at = NOW()
WHERE id = $job_id
  AND organization_id = $org_id
  AND status = 'RUNNING'
RETURNING id
```
An empty RETURNING result means the job has already transitioned (by another
process or a concurrent evaluation). Treat as no-op — do not retry or error.

### 2.3 ProductionJob RUNNING → FAILED — Conditions and CAS Guard

**PROPOSED:** ProductionJob RUNNING → FAILED is authorized when ANY of the
following conditions is confirmed:

1. **Unrecoverable failure:** A permanent AiGeneration failure per DR 0061 §2.2
   (provider rejected, content policy, malformed) where no retry is eligible.
2. **Retry exhaustion:** The AiGeneration `retry_count = 2` and the most recent
   attempt has reached `status = 'FAILED'` (three total attempts exhausted,
   per DR 0061 §2.1 and §2.5).

**PROPOSED:** The transition is performed with the same CAS guard pattern:
```
UPDATE production.production_jobs
SET status = 'FAILED', updated_at = NOW()
WHERE id = $job_id
  AND organization_id = $org_id
  AND status = 'RUNNING'
RETURNING id
```
An empty RETURNING result: no-op.

### 2.4 ProductionJob RUNNING → CANCELLED — Not Authorized in Phase 09

**PROPOSED:** ProductionJob RUNNING → CANCELLED is NOT authorized in Phase 09.
This transition requires a future Decision Record specifying the cancellation
authority, conditions, and mechanism.

### 2.5 Condition Verification Before Transition

**PROPOSED:** The conditions in §2.2 and §2.3 must be verified by server-side
database query immediately before the CAS update. The verification and the CAS
update must occur within the same database transaction to prevent TOCTOU races.

### 2.6 Audit Events Required

**PROPOSED:** Every ProductionJob terminal transition authorized by this record
must write a `system.audit_events` entry in the same transaction as the status
update. Actor identity: `actor_role = 'AGENT'`, `actor_id = production_job_id`
per DR 0064. The audit event must include the terminal status reached and the
triggering condition.

### 2.7 Mechanism Is a Separate Service Function

**PROPOSED:** The mechanism that evaluates conditions and performs ProductionJob
terminal transitions is a separate service function from the generation lifecycle
driver (DR 0058). The driver halts (Step 6) and signals or triggers this
evaluation. The exact triggering mechanism (direct call, queue message, event)
is a BUILD-phase implementation detail.

### 2.8 Tenant Isolation

**PROPOSED:** All condition queries and the CAS update must include
`AND organization_id = $org_id` where `$org_id` comes from the Scoped Service
Token's validated scope (DR 0055, DR 0065). No organization_id from external
input is used.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume the driver (DR 0058) performs ProductionJob terminal transitions
  — it does not (§2.7, DR 0058 §2.6).
- Do not assume RUNNING → CANCELLED is authorized in Phase 09 — it is not (§2.4).
- Do not assume CAS guard is optional — required for every terminal transition
  (§2.2, §2.3).
- Do not assume condition verification and CAS update may occur in separate
  transactions — same transaction required (§2.5).
- Do not assume DR 0056 is modified by this record — it is not (§2.1).
- Do not assume organization_id may come from external input — server-side
  scope only (§2.8).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0062 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

**No implementation is authorized by approval of this record alone.**
Phase 09 BUILD authorization is a separate, subsequent decision.
