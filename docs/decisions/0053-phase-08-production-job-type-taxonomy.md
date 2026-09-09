# Decision Record 0053 — Phase 08: Production Job Type Taxonomy

- **Decision Round:** Phase 08
- **Phase:** 08 — Production Queue
- **Status:** APPROVED — Owner-approved 2026-09-05.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 08 PLAN — "New DR required: Production Job Type taxonomy.
  Define supported production job types. At minimum distinguish AI_GENERATION
  and MANUAL_UPLOAD."
- **Relationship to prior records:** Does not modify Decision Records 0001–0052.
  All remain authoritative and unchanged. Extends DR 0008 (ProductionJob state
  machine) by adding a `job_type` classification that determines the execution
  path of a ProductionJob without changing the state machine itself.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**. No statement is promoted above
FACT unless directly grounded in an approved Decision Record or verified schema.

---

## 1. Problem

**FACT:** The `production.production_jobs` table has no `job_type` column.
All ProductionJobs are undifferentiated in the schema.

**FACT (Phase 08 PLAN item 6):** `productionJobs` is missing `job_type`
(distinguishes AI generation from manual), `description`, and `metadata jsonb`.

**FACT (Phase 08 PLAN D5):** Higgsfield integration is DEFERRED from Phase 08.
Phase 08 prepares provider-agnostic production infrastructure only.

**FACT:** Without a `job_type` taxonomy, Phase 08 cannot implement different
execution paths for jobs that involve AI generation versus those involving
manual asset upload. The state machine is identical for both, but the
operational workflow differs.

---

## 2. Decision

**PROPOSED — presented for Owner approval:**

### 2.1 V1 Job Types

The V1 ProductionJob type set is: **{AI_GENERATION, MANUAL_UPLOAD}**.

**AI_GENERATION** — A ProductionJob that creates one or more Asset rows via
an AI provider. In Phase 08, this job type exercises the internal
ProductionJob and AiGeneration state machines without a live provider
connection (Higgsfield is DEFERRED). An AI_GENERATION job creates
AiGeneration record(s) and eventually produces Asset rows.

**MANUAL_UPLOAD** — A ProductionJob that produces Asset rows via direct
operator file upload. No AiGeneration records are created for a MANUAL_UPLOAD
job. An operator (CREATIVE_PRODUCTION, ADMIN_OPERATIONS, or OWNER) uploads
asset files; the job transitions QUEUED → RUNNING → COMPLETED when the
upload is confirmed and the Asset row is created.

### 2.2 Physical Schema Addition

The `production.production_jobs` table requires:

```sql
ALTER TABLE production.production_jobs
  ADD COLUMN job_type    TEXT NOT NULL,
  ADD COLUMN description TEXT,
  ADD COLUMN metadata    JSONB;

ALTER TABLE production.production_jobs
  ADD CONSTRAINT production_jobs_job_type_check
  CHECK (job_type IN ('AI_GENERATION', 'MANUAL_UPLOAD'));
```

- `job_type` — immutable; set at creation.
- `description` — optional human-readable description. Nullable. Mutable
  (may be updated by OWNER/ADMIN_OPERATIONS while the job is QUEUED or RUNNING).
- `metadata` — optional JSONB for provider-agnostic parameters (e.g., prompt
  parameters for AI_GENERATION; file metadata for MANUAL_UPLOAD). Nullable.
  Structure is job-type-specific and not schema-enforced in V1.

### 2.3 Job Type Is Immutable After Creation

`job_type` is set at creation and may never be changed. A job's type determines
its execution path from the start; changing it mid-lifecycle is not permitted.

### 2.4 State Machine Is Unchanged

**APPROVED (DR 0008 reaffirmed):** The ProductionJob state machine
(`QUEUED → RUNNING → COMPLETED | FAILED | CANCELLED` and
`QUEUED → CANCELLED`) is unchanged. Both job types share the same state
machine. `job_type` determines the execution logic inside each transition,
not the states themselves.

### 2.5 AiGeneration Records

For `AI_GENERATION` jobs:
- One or more `AiGeneration` records are created and associated with the
  ProductionJob.
- The ProductionJob is COMPLETED when all associated AiGeneration records are
  in SUCCEEDED state and the resulting Asset rows exist.
- The ProductionJob is FAILED if any AiGeneration reaches FAILED state and
  no retry produces a SUCCEEDED result.

For `MANUAL_UPLOAD` jobs:
- No AiGeneration records are created.
- The ProductionJob is COMPLETED when the uploaded Asset row exists and is
  in UPLOADED or PROCESSING state (upload confirmed).

### 2.6 Provider-Agnostic Infrastructure

**PROPOSED (D5):** Phase 08 implements the internal execution model only.
The `AiGeneration` record's `provider` field (to be added in Phase 08 migration)
records the intended provider (e.g., `'higgsfield'`) but the actual provider
API call is not made in Phase 08. Provider integration is DEFERRED.

For AI_GENERATION jobs in Phase 08:
- AiGeneration records are created with status `REQUESTED`.
- Transition to `RUNNING` and beyond requires provider integration (DEFERRED).
- Phase 08 may allow manual admin advancement of AiGeneration status for
  testing purposes, subject to Owner authorization.

---

## 3. Scope

This record governs:
- The `job_type` column and CHECK constraint on `production.production_jobs`.
- The semantics of `AI_GENERATION` and `MANUAL_UPLOAD` job types.
- The `description` and `metadata` columns on `production.production_jobs`.
- The AiGeneration creation rule for each job type.

---

## 4. Non-Goals

- **Higgsfield-specific behavior:** DEFERRED (D5). No Higgsfield API call
  parameters, authentication, or webhook handling are defined here.
- **Additional job types** (e.g., REVISION, QC_RESUBMISSION): DEFERRED.
  V1 supports AI_GENERATION and MANUAL_UPLOAD only.
- **`metadata` schema enforcement:** the JSONB structure of `metadata` is
  not schema-enforced in V1. Application-layer validation is DEFERRED.
- **Expense recording** for AI_GENERATION jobs: DEFERRED (D6).
- **Notifications on job completion:** DEFERRED (D10).

---

## 5. Role Authority

**Owner-approved (D11) — who may create ProductionJobs:**

| Action | OWNER | ADMIN_OPS | CREATIVE_PROD | QC | CLIENT | AGENT |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Create AI_GENERATION job | ✓ | ✓ | ✓ | — | — | — |
| Create MANUAL_UPLOAD job | ✓ | ✓ | ✓ | — | — | — |
| Cancel ProductionJob | ✓ | ✓ | — | — | — | — |

**Rationale for CREATIVE_PRODUCTION create authority (D11):** CREATIVE_PRODUCTION
is authorized by Owner decision D11 to create ProductionJobs of any type.
Creating production jobs (both AI-driven and manual upload) is core to that
role's production execution function. Cancellation authority is reserved for
OWNER/ADMIN_OPERATIONS per D8.

**AGENT exclusion (D11):** An AGENT actor is not authorized to create or cancel
ProductionJobs. All ProductionJob mutations are human-initiated operations.

---

## 6. Tenant Isolation

1. All ProductionJob creation and mutation operations include:
   `WHERE id = :jobId AND organization_id = :orgId` (for updates/cancellations).
2. The `organization_id` on a new ProductionJob is set from the JWT session.
3. AiGeneration records created for a job carry the same `organization_id`.

---

## 7. Audit Requirements

**Canonical audit action strings (D14, Owner-approved):**

| Event | `action` string |
|---|---|
| ProductionJob created | `PRODUCTION_JOB_CREATED` |
| ProductionJob QUEUED → RUNNING | `PRODUCTION_JOB_RUNNING` |
| ProductionJob RUNNING → COMPLETED | `PRODUCTION_JOB_COMPLETED` |
| ProductionJob RUNNING → FAILED | `PRODUCTION_JOB_FAILED` |
| ProductionJob → CANCELLED | `PRODUCTION_JOB_CANCELLED` |
| AiGeneration created (REQUESTED) | `AI_GENERATION_REQUESTED` |
| AiGeneration REQUESTED → RUNNING | `AI_GENERATION_RUNNING` |
| AiGeneration RUNNING → SUCCEEDED | `AI_GENERATION_SUCCEEDED` |
| AiGeneration RUNNING → FAILED | `AI_GENERATION_FAILED` |
| AiGeneration → CANCELLED | `AI_GENERATION_CANCELLED` |

All audit events include `organization_id`, `actor_id`, `actor_role`, and the
relevant entity IDs (job_id, order_id, ai_generation_id where applicable) in
the payload.

---

## 8. Failure / Idempotency

- A MANUAL_UPLOAD job with a failed upload may be retried by creating a new
  ProductionJob (the failed job is terminal). Retry semantics for individual
  jobs are not idempotent at the job level.
- An AI_GENERATION job where an AiGeneration fails may be retried by:
  (a) creating a new AiGeneration record within the same job (DEFERRED —
  multi-generation retry is not specified for Phase 08), or (b) cancelling
  the job and creating a new one.
- ProductionJob creation should use a `idempotency_key` field (DEFERRED —
  not specified in current schema; may be added in a future migration).

---

## 9. Dependencies

- DR 0008 — ProductionJob state machine (unchanged).
- DR 0009 — AiGeneration state machine (unchanged).
- Phase 08 migration — `job_type`, `description`, `metadata` columns on
  `production.production_jobs`; `provider`, `model`, `prompt`, `params`,
  `result_url` columns on `production.ai_generations`.
- DR 0035 Phase 08 — cancellation authority.
- DR 0054 Phase 08 — Asset file storage model (MANUAL_UPLOAD produces Asset rows).

---

## 10. Deferred Items

1. **Higgsfield provider integration** — DEFERRED (D5).
2. **Additional job types** (REVISION, QC_RESUBMISSION, etc.) — DEFERRED.
3. **`metadata` JSONB schema enforcement** — DEFERRED.
4. **Expense recording on AI_GENERATION completion** — DEFERRED (D6).
5. **Multi-generation retry within a single job** — DEFERRED.
6. **ProductionJob idempotency key** — DEFERRED.
7. **Notifications on job state change** — DEFERRED (D10).
8. **AGENT role** — AGENT is excluded from all ProductionJob mutations (D11).
   If automated agent-driven job creation is required in a future phase, a
   separate DR defining AGENT authority scope is required.

---

## 11. Owner Approval

This record is APPROVED by Owner 2026-09-05.

**Upon Owner approval:**
- V1 job type set {AI_GENERATION, MANUAL_UPLOAD} is confirmed.
- `production.production_jobs` gains `job_type`, `description`, `metadata` columns.
- Role authority matrix in §5 is authoritative (CREATIVE_PRODUCTION create
  authority confirmed by D11; AGENT exclusion confirmed by D11).

---

## Explicitly Prohibited Assumptions

- Do not assume any Higgsfield-specific behavior is implemented in Phase 08.
- Do not assume `metadata` JSONB structure is validated at the database layer.
- Do not assume CREATIVE_PRODUCTION may cancel a ProductionJob.
- Do not assume job type may be changed after creation.
- Do not assume expense recording occurs on AI_GENERATION job completion.
- Do not assume this record authorizes schema changes, migrations, or code.
