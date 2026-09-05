# Decision Record 0058 — Phase 09: Generation Lifecycle Driver Architecture

- **Decision Round:** Phase 09
- **Phase:** 09 — Agent Runtime
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 09 pre-BUILD blocker: architecture of the async driver
  that executes an AI production job — how it claims a job, dispatches to the
  provider, awaits the result, and halts. Establishes that ProductionJob terminal
  transitions are NOT performed by the driver (resolved separately by DR 0063).
- **Relationship to prior records:** Does not modify Decision Records 0001–0054.
  All remain authoritative and unchanged. Depends on DR 0053, DR 0055, DR 0056,
  DR 0057, DR 0059 (callback architecture), DR 0061 (failure and retry model),
  DR 0063 (ProductionJob terminal authority), DR 0068 (provider_job_id),
  DR 0069 (retry_count).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0054. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0053 §5):** ProductionJob creation is human-initiated (OWNER or
ADMIN_OPERATIONS role). The runtime driver does not create ProductionJobs.

**FACT (DR 0053 §3, §4):** ProductionJob lifecycle: QUEUED → RUNNING → terminal.
AiGeneration lifecycle: REQUESTED → RUNNING → terminal. The AiGeneration record
is created as part of ProductionJob creation (human-initiated), not by the driver.

**FACT (DR 0056 §2.1):** The runtime is authorized to perform exactly six
transitions. ProductionJob terminal transitions are NOT among them.

**FACT (DR 0053 §10.3):** MANUAL_UPLOAD job type does not involve AI generation
dispatch. The driver in this record applies exclusively to AI_GENERATION job type.

---

## 2. Decision

**PROPOSED (Owner instruction, Phase 09 pre-BUILD):**

### 2.1 Async Driver — Not Synchronous Dispatch

**PROPOSED:** The generation lifecycle driver is asynchronous. It does not block
the `createProductionJob` call or any human-initiated service function. The driver
runs independently of the request that created the ProductionJob.

No synchronous AI generation dispatch occurs inside any human-initiated service
function call.

### 2.2 Driver Lifecycle — Six Steps

**PROPOSED:** The driver executes the following steps in order for each
AI_GENERATION ProductionJob:

**Step 1 — Validate and locate job.**
The driver receives a `production_job_id` and `organization_id`. It loads the
ProductionJob from the database, verifying it exists, belongs to the specified
organization, is of type `AI_GENERATION`, and is in QUEUED status.

**Step 2 — Atomic CAS claim.**
The driver transitions ProductionJob QUEUED → RUNNING using a CAS guard:
`UPDATE ... SET status = 'RUNNING' WHERE id = $id AND organization_id = $org
AND status = 'QUEUED' RETURNING id`. An empty RETURNING result means the job
was already claimed by another runner; the driver exits without error.

**Step 3 — Locate AiGeneration and dispatch.**
The driver loads the associated AiGeneration record (status = REQUESTED). It
transitions AiGeneration REQUESTED → RUNNING and dispatches to the provider
via the adapter (DR 0057). The `provider_job_id` (DR 0068) is set atomically
with the REQUESTED → RUNNING transition when the provider returns a job identifier.

**Step 4 — Await provider result.**
The driver waits for the provider result via the callback architecture (DR 0059):
webhook-first, polling fallback. Result correlation uses `provider_job_id`.

**Step 5 — Handle result.**
On provider success: transition AiGeneration RUNNING → SUCCEEDED, store result
reference (file_key per DR 0054), transition Asset PROCESSING → READY_FOR_QC.
On provider failure: transition AiGeneration RUNNING → FAILED, record
`failure_reason`. Retry eligibility is evaluated per DR 0061.

**Step 6 — HALT.**
The driver halts. It does NOT transition ProductionJob to a terminal state.
ProductionJob remains in RUNNING status. ProductionJob terminal transitions
(RUNNING → COMPLETED, RUNNING → FAILED) are authorized exclusively by DR 0063
and performed by a separate mechanism.

### 2.3 MANUAL_UPLOAD Is Excluded

**PROPOSED:** The driver in this record applies exclusively to `AI_GENERATION`
job type. `MANUAL_UPLOAD` jobs are not driven by this driver. MANUAL_UPLOAD
lifecycle is a separate BUILD-phase concern not addressed in Phase 09.

### 2.4 AiGeneration Record Is Not Created by the Driver

**PROPOSED:** The AiGeneration record is created as part of ProductionJob
creation (human-initiated, Phase 08). The driver loads an existing AiGeneration
record in REQUESTED status. If no REQUESTED AiGeneration record exists for the
job, the driver logs a diagnostic and exits. The driver does not create
AiGeneration records.

### 2.5 CAS Guard on Every Transition

**PROPOSED:** Every state transition performed by the driver (Steps 2, 3, 5)
uses a CAS guard per DR 0056 §2.2. Empty RETURNING results are treated as
no-ops, not errors.

### 2.6 Runtime Does NOT Transition ProductionJob to Terminal State

**PROPOSED:** The driver (Steps 1–6) does not transition ProductionJob to
COMPLETED, FAILED, or CANCELLED. After Step 6 (HALT), ProductionJob remains
in RUNNING status. The authority and conditions for ProductionJob terminal
transitions are established exclusively in DR 0063.

### 2.7 Retry on Transient Failure

**PROPOSED:** If Step 5 results in a transient AiGeneration FAILED outcome and
retry is permitted per DR 0061 (retry_count < 2), the driver may initiate a
retry: create a new AiGeneration record attempt, reset state, and re-execute
from Step 3. The retry_count is incremented atomically per DR 0069.

After retry exhaustion (retry_count = 2, total attempts = 3), the driver
performs no further retry. AiGeneration reaches FAILED in terminal state.
The ProductionJob terminal transition to FAILED is then eligible per DR 0063.

### 2.8 Audit Events

**PROPOSED:** The driver writes audit events for each state transition it
performs. Actor identity: `actor_role = 'AGENT'`, `actor_id = production_job_id`
per DR 0064.

### 2.9 Open Gap — ProductionJob Terminal Transitions (Resolved by DR 0063)

**DEFERRED / RESOLVED BY DR 0063:** The runtime driver does NOT perform
ProductionJob terminal transitions. DR 0063 establishes the authority, conditions,
and mechanism for RUNNING → COMPLETED and RUNNING → FAILED. Nothing in the driver
lifecycle (Steps 1–6) conflicts with DR 0063; the two records are complementary.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume synchronous dispatch occurs inside any human-initiated service
  function — it does not (§2.1).
- Do not assume the driver creates AiGeneration records — it does not (§2.4).
- Do not assume the driver transitions ProductionJob to COMPLETED or FAILED —
  it does not (§2.6). See DR 0063.
- Do not assume MANUAL_UPLOAD jobs use this driver — they do not (§2.3).
- Do not assume CAS guard is optional — required for every transition (§2.5).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0054 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

**No implementation is authorized by approval of this record alone.**
Phase 09 BUILD authorization is a separate, subsequent decision.
