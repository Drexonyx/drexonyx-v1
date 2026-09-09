# Decision Record 0067 — Phase 09: Actual AI Generation Cost Recording

- **Decision Round:** Phase 09
- **Phase:** 09 — Agent Runtime
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** DR 0060 §2.7 (actual AI cost recording mechanism, open item)
  and DR 0060 §2.8 (authoritative-data requirement, partially). Establishes
  the Expense boundary for actual AI generation cost recording, the
  AI_GENERATION_EXPENSE entry type pathway, atomicity and idempotency requirements,
  and the DEFERRED trigger condition.
- **Relationship to prior records:** Does not modify Decision Records 0001–0066.
  All remain authoritative and unchanged. Depends on DR 0001 §6 (financial
  architecture), DR 0052 §7 item 5 (expense entries deferred from Phase 07),
  DR 0055 (runtime authentication), DR 0056 (runtime authority scope), DR 0060
  (financial boundary for AI generation cost). Consistent with DR 0048 §3.5
  (idempotency model).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0066. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0052 §7 item 5):** Expense entries for provider AI/production costs
were explicitly deferred from Phase 07: "post-production events; out of Phase 07
scope. DEFERRED."

**FACT (DR 0060 §2.3):** The `AI_GENERATION_EXPENSE` financial ledger entry type
is introduced in Phase 09. It records the actual cost of an AI generation
incurred with the provider.

**FACT (DR 0060 §2.8):** `AI_GENERATION_EXPENSE` entries are written only when
authoritative cost data is available from the provider. Estimated or approximated
cost entries are prohibited.

**FACT (verified schema, `financial.expenses`):** Expense table exists with
columns including `amount`, `currency`, `expense_type`, `description`,
`order_budget_id`, `organization_id`, `created_at`.

**FACT (verified schema, `financial.financial_ledger`):** Append-only ledger with
`entry_type` (TEXT, no CHECK constraint), `amount`, `currency`,
`reference_entity_type`, `reference_entity_id`, `description`, `organization_id`,
`created_at`.

---

## 2. Decision

**PROPOSED (Owner instruction, Phase 09 pre-BUILD):**

### 2.1 Cost Recording Is NOT Performed by the Runtime

**PROPOSED:** The Agent Runtime (async generation driver, DR 0058) is not
authorized to write to `financial.expenses` or `financial.financial_ledger`.
Actual AI generation cost recording is performed by an authorized financial
service function, not by the runtime directly.

### 2.2 Expense Boundary — financial.expenses + financial.financial_ledger

**PROPOSED:** When authoritative AI generation cost data is available, recording
consists of two writes in one atomic database transaction:

1. An entry in `financial.expenses` with:
   - `expense_type = 'AI_GENERATION'` (or equivalent canonical string — BUILD-phase
     implementation detail within the approved expense taxonomy)
   - `amount` = confirmed cost from provider (authoritative data only)
   - `currency` = provider-reported currency
   - `organization_id` = from internal state (not caller input)

2. An entry in `financial.financial_ledger` with:
   - `entry_type = 'AI_GENERATION_EXPENSE'` (DR 0060 §2.3)
   - `amount` = same confirmed cost
   - `currency` = same
   - `reference_entity_type = 'ai_generation'`
   - `reference_entity_id = ai_generations.id` (the UUID of the SUCCEEDED
     AiGeneration for which cost is being recorded)
   - `organization_id` = from internal state

Both writes succeed together or roll back together. A committed expense with no
corresponding ledger entry is not permitted. A ledger entry with no corresponding
committed expense is not permitted.

### 2.3 Authoritative Data Only — No Estimated Costs

**PROPOSED:** `AI_GENERATION_EXPENSE` entries are written only when the provider
supplies authoritative cost data for a specific completed generation. Authoritative
data means the provider has confirmed the exact cost for that generation (e.g.,
in the webhook payload, in an API response for the specific job).

Estimated, approximated, or modeled cost values are prohibited in the financial
ledger and expense table.

### 2.4 Idempotency — system.idempotency_keys

**PROPOSED:** The cost recording write is idempotent via `system.idempotency_keys`
(DR 0002 D4). The idempotency key is scoped to:
- `ai_generation_id` (the UUID of the specific AiGeneration)
- Operation type: `'ai_generation_cost_recorded'`
- `organization_id`

A replayed trigger (e.g., a duplicate webhook that includes cost data) must not
create a second expense record or a second `AI_GENERATION_EXPENSE` ledger entry.
The idempotency check precedes the atomic write transaction (§2.2).

### 2.5 Exactly Once per SUCCEEDED AiGeneration

**PROPOSED:** At most one `AI_GENERATION_EXPENSE` entry exists per AiGeneration
record. Cost is recorded for SUCCEEDED generations only. FAILED AiGeneration
records may have incurred provider cost (Higgsfield-contract-dependent), but
recording such cost for FAILED attempts is a BUILD-phase discovery item and is
not addressed in this record.

### 2.6 Trigger Is DEFERRED — Higgsfield Contract Dependent

**DEFERRED (REQUIRES DISCOVERY DURING BUILD):** Whether Higgsfield exposes
authoritative per-generation cost data in its webhook response or API, and when
that data becomes available (immediately at generation completion, or via a
separate cost query), is not yet confirmed.

If Higgsfield does not expose authoritative cost data for individual generations,
`AI_GENERATION_EXPENSE` ledger entries are not written until a mechanism to obtain
authoritative data is available and approved.

### 2.7 Financial Separations Preserved

**PROPOSED:** Recording `AI_GENERATION_EXPENSE` does not constitute:
- Revenue recognition.
- Profit calculation.
- Owner settlement.
- Provider Credit consumption (separate event, DR 0066).

The expense entry records a cash or credit cost incurred; it is not a profit
or settlement event. Financial separations per DR 0001 §6 are preserved.

### 2.8 Open Items Resolved

- DR 0060 §2.7: Actual AI cost recording mechanism → established by this record
  (§2.2, §2.4). ✓
- DR 0060 §2.8: Authoritative-data requirement → confirmed (§2.3). ✓

---

## 3. Explicitly Prohibited Assumptions

- Do not assume the runtime performs cost recording — it does not (§2.1).
- Do not assume estimated or approximated costs may be recorded — authoritative
  data only (§2.3).
- Do not assume a second expense or ledger entry may be written for the same
  AiGeneration — idempotency prevents this (§2.4).
- Do not assume cost recording triggers in Phase 09 Build without Higgsfield
  contract confirmation — trigger is DEFERRED (§2.6).
- Do not assume AI_GENERATION_EXPENSE is a revenue or profit event — it is not
  (§2.7, DR 0001 §6).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0066 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

**No implementation is authorized by approval of this record alone.**
Phase 09 BUILD authorization is a separate, subsequent decision.
