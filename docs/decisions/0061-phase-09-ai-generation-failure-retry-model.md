# Decision Record 0061 — Phase 09: AI Generation Failure and Retry Model

- **Decision Round:** Phase 09
- **Phase:** 09 — Agent Runtime
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 09 pre-BUILD blocker: what happens when an AI generation
  fails — transient vs. permanent failure taxonomy, retry eligibility, maximum
  attempts, and the path to ProductionJob FAILED after exhaustion.
- **Relationship to prior records:** Does not modify Decision Records 0001–0054.
  All remain authoritative and unchanged. Depends on DR 0053 (AiGeneration state
  machine), DR 0056 (runtime authority scope), DR 0058 (generation lifecycle
  driver), DR 0063 (ProductionJob terminal authority), DR 0069 (retry_count
  schema addition).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0054. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0053 §4):** AiGeneration terminal states: SUCCEEDED, FAILED,
CANCELLED. FAILED is terminal — a FAILED AiGeneration record is not mutated
back to REQUESTED or RUNNING.

**FACT (DR 0048 §3.1, §3.3):** Analogy from payment retry model: each retry
attempt is a separate record; FAILED records are preserved; no code path mutates
a terminal record back to an active state.

**FACT (Phase 09 PLAN):** The generation driver (DR 0058) may encounter transient
provider errors (timeouts, rate limits, temporary unavailability) that could
succeed on retry, vs. permanent failures (invalid prompt, provider-rejected
content) that will not succeed on retry.

---

## 2. Decision

**PROPOSED (Owner instruction, Phase 09 pre-BUILD):**

### 2.1 Maximum Attempts — 3 Total (retry_count 0 to 2)

**PROPOSED:** The maximum number of AI generation attempts per ProductionJob is
three (3) total. This is tracked by `ai_generations.retry_count` (DR 0069):

- First attempt: `retry_count = 0`
- Second attempt (first retry): `retry_count = 1`
- Third attempt (second retry): `retry_count = 2`

No further retry is permitted when `retry_count = 2`. After the third attempt
fails, the AiGeneration reaches FAILED in terminal state, and ProductionJob
RUNNING → FAILED becomes eligible per DR 0063.

### 2.2 Transient vs. Permanent Failure Taxonomy

**PROPOSED:** The driver classifies each failure as transient or permanent:

**Transient failures (retry eligible):**
- Provider timeout (no response within the polling window).
- Provider rate limit error (HTTP 429 or equivalent).
- Provider temporary unavailability (HTTP 503, connection error).
- Provider returns a non-terminal failure status that indicates temporary
  unavailability.

**Permanent failures (no retry):**
- Provider rejects the generation as invalid (content policy, malformed prompt,
  unsupported model).
- Provider returns an explicit permanent failure status.
- Any error condition that the provider indicates is not recoverable.

**PROPOSED:** When the failure classification is ambiguous, the driver must
treat the failure as permanent (do not retry). Retrying a permanent failure
wastes provider capacity and may incur unnecessary cost.

### 2.3 Only Transient Failures Increment retry_count

**PROPOSED:** `retry_count` is incremented only for transient failure retries.
A permanent failure does not increment `retry_count` — it immediately terminates
the retry sequence. The `retry_count` atomic increment guard (DR 0069 §2.3):
`SET retry_count = retry_count + 1 WHERE retry_count < 2 RETURNING retry_count`
ensures atomicity and enforces the maximum.

### 2.4 Each Retry Is a New AiGeneration Record

**PROPOSED:** Each retry attempt creates a new `production.ai_generations` row
with a new UUID, starting in REQUESTED status, with `retry_count` initialized
from the previous attempt's `retry_count + 1`. The FAILED AiGeneration record
from the previous attempt is preserved as a historical record. It is not mutated.

This preserves the append-only spirit of the data model and maintains a complete
history of all generation attempts for a given ProductionJob.

### 2.5 After Retry Exhaustion — Path to ProductionJob FAILED

**PROPOSED:** When the third attempt (retry_count = 2) results in a FAILED
AiGeneration:
1. The AiGeneration reaches FAILED (terminal).
2. ProductionJob RUNNING → FAILED becomes eligible per DR 0063 §2.3
   (unrecoverable failure condition: retry exhaustion).
3. The mechanism that evaluates and performs the ProductionJob terminal
   transition is separate from the driver, per DR 0063.

### 2.6 No Automatic Retry for Permanent Failures

**PROPOSED:** No retry occurs for permanent failures (§2.2). The AiGeneration
reaches FAILED immediately. ProductionJob RUNNING → FAILED becomes eligible per
DR 0063 §2.3.

### 2.7 Idempotency per Attempt

**PROPOSED:** Each generation attempt is idempotent via `system.idempotency_keys`
(DR 0002 D4, DR 0048 §3.5 analogy). A replayed provider callback for an already-
processed attempt does not create duplicate state transitions or duplicate
financial events (DR 0060 §2.4).

### 2.8 No Financial Side Effects from Retry

**PROPOSED:** Retry logic does not create or modify financial records. Each
failed attempt may or may not incur provider cost (Higgsfield-contract-dependent).
If cost data becomes available for a failed attempt, it is recorded through the
financial service boundary (DR 0067) when authoritative data is available. The
retry mechanism itself does not touch financial tables.

### 2.9 CANCELLED Is Not a Retry Trigger

**PROPOSED:** AiGeneration RUNNING → CANCELLED (DR 0056 §2.1 item 5) does not
trigger a retry. CANCELLED is a deliberate termination, not a failure. The
ProductionJob terminal path following CANCELLED is a BUILD-phase concern not
resolved in Phase 09.

### 2.10 Open Gap — retry_count Schema Addition (Resolved by DR 0069)

**DEFERRED / RESOLVED BY DR 0069:** The `retry_count` column does not exist in
the current `production.ai_generations` schema. DR 0069 specifies the column
definition, default value, maximum value, and atomic increment mechanism.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume more than 3 total attempts are permitted — maximum is 3 (§2.1).
- Do not assume a FAILED AiGeneration record may be mutated to REQUESTED or
  RUNNING — it may not (§2.4, DR 0053 §4).
- Do not assume ambiguous failure classifications are treated as transient —
  they are treated as permanent (§2.2).
- Do not assume retry_count is incremented for permanent failures — only transient
  failures increment it (§2.3).
- Do not assume retry creates duplicate financial events — idempotency prevents
  this (§2.7).
- Do not assume CANCELLED triggers a retry — it does not (§2.9).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0054 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

**No implementation is authorized by approval of this record alone.**
Phase 09 BUILD authorization is a separate, subsequent decision.
