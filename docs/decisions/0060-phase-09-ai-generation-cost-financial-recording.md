# Decision Record 0060 — Phase 09: AI Generation Cost and Financial Recording

- **Decision Round:** Phase 09
- **Phase:** 09 — Agent Runtime
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 09 pre-BUILD blocker: whether and how AI generation costs
  are recorded in the financial model. Establishes the financial boundary for
  the runtime: the runtime does NOT write financial records. Introduces the
  AI_GENERATION_EXPENSE financial ledger entry type. DR 0066 resolves §2.6
  (Provider Credit consumption). DR 0067 resolves §2.7 and §2.8 (Actual AI cost
  recording mechanism).
- **Relationship to prior records:** Does not modify Decision Records 0001–0054.
  All remain authoritative and unchanged. Depends on DR 0001 §6 (financial
  architecture), DR 0052 (financial ledger entry types), DR 0053 (AiGeneration
  entity), DR 0055 (runtime authentication), DR 0056 (runtime authority scope).
  Supersedes the deferred item in DR 0052 §7 item 5 (expense entries for
  AI/production costs).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0054. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0001 §6):** The approved financial architecture flow:
```
CLIENT PAYMENT → PAYMENT LEDGER → ORDER BUDGET → EXPENSE LEDGER
→ PROVIDER CREDITS → PROFIT CALCULATION → RESERVES
→ DISTRIBUTABLE PROFIT → OWNER SETTLEMENT
```
Provider Credit ≠ Cash/Profit (DR 0001 §6, DR 0052 §3.6).

**FACT (DR 0052 §7 item 5):** Expense entries for provider AI/production costs
were explicitly deferred from Phase 07: "post-production events; out of Phase 07
scope. DEFERRED." Phase 09 is the phase in which these expenses occur and must
be addressed.

**FACT (DR 0052 §6):** Phase 07 explicitly prohibited EXPENSE entries. Phase 09
(this record) is the authorization to introduce AI_GENERATION_EXPENSE as a new
entry type for the financial ledger, conditioned on actual cost data availability.

**FACT (verified schema, `financial.financial_ledger`):** entry_type TEXT with no
CHECK constraint. The column accepts new entry type values without schema migration.

**FACT (Phase 09 PLAN):** Higgsfield's cost model and whether it exposes
authoritative per-generation cost data are not yet confirmed. Cost recording must
be conditioned on authoritative data being available.

---

## 2. Decision

**PROPOSED (Owner instruction, Phase 09 pre-BUILD):**

### 2.1 The Agent Runtime Does NOT Write Financial Records

**PROPOSED:** The Agent Runtime (the async generation driver, DR 0058) is not
authorized to write to `financial.financial_ledger`, `financial.expenses`,
`financial.order_budgets`, or any other financial table directly. The runtime's
authority scope (DR 0056) does not include financial record creation.

### 2.2 AI Generation Cost Is a Post-Generation Financial Event

**PROPOSED:** Recording the cost of an AI generation is a post-generation
financial event. It is not an AiGeneration state transition, not a ProductionJob
state transition, and not part of the runtime driver lifecycle (DR 0058 Steps 1–6).

### 2.3 AI_GENERATION_EXPENSE Entry Type — Introduced in Phase 09

**PROPOSED:** The following financial ledger entry type is introduced in Phase 09:

| Entry Type | Trigger | Multiplicity |
|---|---|---|
| `AI_GENERATION_EXPENSE` | Confirmed AI generation cost (authoritative data available) | Exactly once per SUCCEEDED AiGeneration with confirmed cost |

This entry type records the actual cost of an AI generation incurred with the
provider. It is an expense, not a payment and not revenue.

### 2.4 Provider Credits Are Separate from Cash Cost

**PROPOSED:** If the provider uses a credit model (e.g., Higgsfield credits
consumed per generation), provider credit consumption is separate from the
`AI_GENERATION_EXPENSE` ledger entry. Provider Credits ≠ Cash/Profit (DR 0001 §6).

The relationship between provider credits consumed and actual cash cost (if any)
depends on the provider contract and is a BUILD-phase discovery item. DR 0066
establishes the Provider Credit consumption boundary.

### 2.5 Financial Write Boundary — Through Authorized Financial Service Only

**PROPOSED:** Any financial record write triggered by AI generation costs must
go through an authorized financial service function, not through the runtime
directly. The financial service function is responsible for:
- Validating authoritative cost data.
- Idempotency via `system.idempotency_keys`.
- Atomicity (expense record + ledger entry in same transaction).
- Audit event for the financial write.
- Tenant isolation (organization_id from internal state, not caller input).

### 2.6 Open Gap — Provider Credit Consumption Trigger (Resolved by DR 0066)

**DEFERRED / RESOLVED BY DR 0066:** Whether and how the platform records provider
credit consumption (distinct from cash cost) requires its own decision. DR 0066
establishes the Provider Credit consumption boundary and confirms the runtime is
not authorized to write provider_credits directly.

### 2.7 Open Gap — Actual AI Cost Recording Mechanism (Resolved by DR 0067)

**DEFERRED / RESOLVED BY DR 0067:** The exact mechanism for recording actual AI
generation cost — including what constitutes authoritative cost data, the trigger,
and the financial service function boundary — is specified in DR 0067.

### 2.8 Cost Recording Is DEFERRED Until Authoritative Data Is Available

**PROPOSED:** `AI_GENERATION_EXPENSE` ledger entries are written only when the
platform has access to authoritative cost data from the provider. If the provider
does not expose per-generation cost data in its webhook or API response, cost
recording is deferred until a mechanism to obtain authoritative data is available.

No estimated or approximated cost entries are written to the financial ledger.
Estimated cost ≠ authoritative cost (DR 0001 §6 financial separations).

---

## 3. Explicitly Prohibited Assumptions

- Do not assume the runtime may write financial records — it may not (§2.1).
- Do not assume `AI_GENERATION_EXPENSE` is written by the runtime directly —
  it goes through an authorized financial service (§2.5).
- Do not assume Provider Credit consumption is the same as cash cost — they are
  separate (§2.4, DR 0001 §6).
- Do not assume cost entries may be estimated or approximated — authoritative
  data only (§2.8).
- Do not assume `AI_GENERATION_EXPENSE` was authorized before Phase 09 —
  it was explicitly deferred from Phase 07 (DR 0052 §7 item 5).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0054 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

**No implementation is authorized by approval of this record alone.**
Phase 09 BUILD authorization is a separate, subsequent decision.
