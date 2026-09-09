# Decision Record 0069 — Phase 09: ai_generations.retry_count Schema Addition

- **Decision Round:** Phase 09
- **Phase:** 09 — Agent Runtime
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** DR 0061 §2.10 (retry_count schema gap). Specifies the column
  definition, default value, maximum value, atomic increment mechanism, and
  durability requirements for tracking AI generation retry attempts.
- **Relationship to prior records:** Does not modify Decision Records 0001–0068.
  All remain authoritative and unchanged. Depends on DR 0053 (AiGeneration entity),
  DR 0061 (failure and retry model — establishes the 3-attempt maximum).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0068. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0061 §2.1):** Maximum total AI generation attempts per ProductionJob:
3. Tracked by retry_count: first attempt = 0, second = 1, third = 2.
No retry is permitted when retry_count = 2.

**FACT (DR 0061 §2.3):** Only transient failures increment retry_count. Permanent
failures do not increment retry_count.

**FACT (verified schema, `production.ai_generations`):** No `retry_count` column
exists in the current schema. This record specifies the addition.

**FACT (DR 0048 §3.1, analogy):** The append-only principle: each retry is a
new AiGeneration record. retry_count is a property of each AiGeneration record,
tracking how many retries have been attempted at the ProductionJob level when
this record was created.

---

## 2. Decision

**PROPOSED (Owner instruction, Phase 09 pre-BUILD):**

### 2.1 Column Definition — retry_count

**PROPOSED:** Add a column `retry_count` to `production.ai_generations`:

```
retry_count    INTEGER NOT NULL DEFAULT 0
```

- **Type:** INTEGER. Retry counts are small non-negative integers; INTEGER is
  appropriate.
- **NOT NULL:** retry_count is always known; NULL is not a valid state.
- **DEFAULT 0:** A newly created AiGeneration record starts with retry_count = 0
  (first attempt). No explicit value is required at creation time.

### 2.2 Meaning of retry_count Values

**PROPOSED:**

| retry_count | Meaning |
|---|---|
| 0 | First attempt (no retries yet) |
| 1 | Second attempt (first retry) |
| 2 | Third attempt (second retry); maximum reached |

When retry_count = 2, no further retry is permitted. The AiGeneration failure
at retry_count = 2 triggers ProductionJob RUNNING → FAILED eligibility per
DR 0063 §2.3.

### 2.3 Atomic Increment Mechanism

**PROPOSED:** When a transient failure triggers a retry, retry_count is incremented
atomically at the database level using the following pattern on the new AiGeneration
record created for the retry:

The new AiGeneration record is created with `retry_count` equal to the previous
attempt's `retry_count + 1`. The guard preventing exceeding the maximum is
applied before creating the new record:

```
-- Before creating a new AiGeneration for retry:
-- Verify the previous attempt's retry_count < 2
SELECT retry_count FROM production.ai_generations
WHERE id = $previous_ai_generation_id
  AND organization_id = $org_id
  AND retry_count < 2
```

If no row is returned (retry_count = 2), no new AiGeneration record is created
and the retry sequence terminates.

The guard condition ensures the maximum is enforced at the database level before
any retry state is created.

### 2.4 Durability — Survives Restarts

**PROPOSED:** `retry_count` is persisted in the database, not in application memory.
A runtime process restart or container restart does not reset retry_count. When
a runner picks up a ProductionJob that was in progress before a restart, it loads
the current retry_count from the most recent AiGeneration record to determine
retry eligibility.

### 2.5 Only Transient Failures Increment retry_count

**PROPOSED (reaffirming DR 0061 §2.3):** retry_count is incremented only when
a transient failure retry is initiated. Permanent failures (DR 0061 §2.2) do not
increment retry_count — the current AiGeneration reaches FAILED immediately and
no new AiGeneration record with an incremented retry_count is created.

### 2.6 No Financial Side Effects from retry_count

**PROPOSED:** Incrementing retry_count does not create or modify any financial
record. Each retry attempt may or may not incur provider cost (Higgsfield-contract-
dependent). Financial recording for failed attempts is a BUILD-phase discovery
item per DR 0067 §2.5. The retry_count value itself has no financial meaning —
it is an operational tracking field.

### 2.7 Schema Implications (Not Authorized)

**PROPOSED (schema not authorized):** This decision implies adding column
`retry_count INTEGER NOT NULL DEFAULT 0` to `production.ai_generations`.

No CHECK constraint is required for the maximum value of 2 — the application-level
guard (§2.3) enforces the maximum before creating a new record. Whether to add
a CHECK constraint (`retry_count >= 0 AND retry_count <= 2`) is a BUILD-phase
implementation detail.

**PROPOSED:** No schema change is authorized by this record. Any schema migration
requires separate authorization per CLAUDE.md.

### 2.8 Open Item Resolved

- DR 0061 §2.10: retry_count schema gap → resolved by this record. ✓

---

## 3. Explicitly Prohibited Assumptions

- Do not assume retry_count may be NULL — it is NOT NULL with DEFAULT 0 (§2.1).
- Do not assume retry_count > 2 is permitted — maximum is 2 (§2.2, §2.3).
- Do not assume permanent failures increment retry_count — they do not (§2.5).
- Do not assume retry_count is held in application memory and lost on restart —
  it is persisted in the database (§2.4).
- Do not assume retry_count creates financial side effects — it does not (§2.6).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0068 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

**No implementation is authorized by approval of this record alone.**
Phase 09 BUILD authorization is a separate, subsequent decision.
