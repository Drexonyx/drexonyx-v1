# Decision Record 0083 — Phase 12: AI Generation Cost Governance

- **Decision Round:** Phase 12
- **Phase:** 12 — Cost Governance, Model Routing & Secure Asset Delivery
- **Status:** APPROVED — Owner approved as part of Phase 12 build. This record
  documents decisions already implemented and validated in Phase 12. No
  additional schema, migration, or implementation is authorized by this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-08
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
  — Base commit c49d4bd (Phase 13 remediation)
- **Resolves:** Gap identified in Phase 11 Final Pass (DR 0082 §6) — financial
  ledger recording for AI generation costs deferred from Phase 11 (DR 0060,
  DR 0066, DR 0067).
- **Relationship to prior records:** Does not modify Decision Records 0001–0082.
  All remain authoritative and unchanged. Implements the cost recording boundary
  deferred in DR 0060 §2, DR 0066 §2, and DR 0067 §2. Depends on DR 0052
  (financial ledger entry types), DR 0064 (audit actor identity), DR 0065
  (agent runtime scoped service token).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0082. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0060 §2):** AI generation cost recording was deferred from Phase 9
pending a verified cost data structure from the Higgsfield provider. The
deferral condition was: "until a response field carrying authoritative cost
data is confirmed."

**FACT (DR 0066 §2, DR 0067 §2):** Provider credit consumption boundary and
actual AI generation cost recording were both deferred to Phase 12 from
Phase 9. No financial ledger entry, expense record, or credit deduction was
permitted without authoritative cost data.

**FACT (DR 0082 §3.2, Phase 11 implementation):** The Higgsfield V2 response
shape (`request_id`, `status_url`, `cancel_url`) contains no authoritative
cost field. The Higgsfield API does not return cost data in any response
confirmed during Phase 11 verification. Any cost data derived from assumptions
or approximations would violate DR 0066 §2.

**FACT (DR 0052, verified schema):** The financial system has two relevant
tables: `finance.expenses` (expense records) and `finance.financial_ledger`
(ledger entries). Phase 12 implements the first writes to both tables for
AI generation cost recording.

**FACT (lib/agent/cost-recording.ts, Phase 12 implementation):** The Phase 12
implementation of `recordAiGenerationCost` is the single authorized path for
writing AI generation cost records. The agent runtime is the sole caller.

---

## 2. Decision

### 2.1 ProviderCost Shape

**APPROVED:** Authoritative provider cost data is represented as:

```typescript
interface ProviderCost {
  amount: string;   // decimal string, e.g. "0.05"
  currency: string; // ISO 4217 code, e.g. "USD"
}
```

This is the only shape accepted by `recordAiGenerationCost`. No other cost
representation is authorized.

### 2.2 Cost Recording Result Contract

**APPROVED:** `recordAiGenerationCost` returns one of three result shapes:

```typescript
type CostRecordingResult =
  | { ok: true; recorded: true; expenseId: string }
  | { ok: true; recorded: false; reason: 'no_authoritative_cost' | 'already_recorded' }
  | { ok: false; error: string };
```

`ok: true, recorded: false` is a non-error outcome: it means the function
succeeded but no financial record was written, either because no authoritative
cost was available or because the record already exists.

### 2.3 No-Cost Path: Higgsfield V2 in V1

**APPROVED:** When `providerCost` is `undefined`, `recordAiGenerationCost`
immediately returns:

```typescript
{ ok: true, recorded: false, reason: 'no_authoritative_cost' }
```

No database write of any kind is performed. No expense record, no ledger
entry, no idempotency key.

**APPROVED:** This is the correct behavior for all Higgsfield V2 generation
responses in V1. Higgsfield V2 does not return cost data in any confirmed
response shape. Fabricating, estimating, or approximating cost data is
explicitly prohibited (see §3).

### 2.4 Cost Recording Path: Authoritative Cost Present

**APPROVED:** When `providerCost` is defined and no prior completed idempotency
key exists, `recordAiGenerationCost` performs the following steps within a
single database transaction:

1. **Insert idempotency key** to `system.idempotency_keys`:
   - `key = 'AI_GENERATION_COST_RECORDED:{aiGenerationId}'`
   - `organization_id = organizationId`
   - `operation_type = 'AI_GENERATION_COST_RECORDED'`
   - `status = 'PROCESSING'`
   - `ON CONFLICT DO NOTHING`

2. **Insert expense record** to `finance.expenses`:
   - `expense_type = 'AI_GENERATION'`
   - `reference_entity_type = 'ai_generation'`
   - `reference_entity_id = aiGenerationId`
   - `amount` and `currency` from `providerCost`

3. **Insert ledger entry** to `finance.financial_ledger`:
   - `entry_type = 'AI_GENERATION_EXPENSE'`
   - `reference_entity_type = 'ai_generation'`
   - `reference_entity_id = aiGenerationId`
   - `amount` and `currency` from `providerCost`

4. **Update idempotency key** to `status = 'COMPLETED'`.

### 2.5 Idempotency Key

**APPROVED:** The idempotency key for AI generation cost recording is:

```
AI_GENERATION_COST_RECORDED:{aiGenerationId}
```

scoped to `organization_id`. If this key already exists at `COMPLETED` status
on entry, `recordAiGenerationCost` returns `{ ok: true, recorded: false,
reason: 'already_recorded' }` without re-applying any writes.

### 2.6 Financial Boundary

**APPROVED:** `recordAiGenerationCost` is the single authorized path for
writing AI generation cost records. No other code path may write to
`finance.expenses` or `finance.financial_ledger` for AI generation costs.
The agent runtime calls this function after a generation reaches a terminal
succeeded state.

### 2.7 Tenant Isolation

**APPROVED:** All database operations in §2.4 are scoped to `organization_id`
from the agent runtime's service token. No `organization_id` from a client
request is used.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume Higgsfield V2 returns cost data in any response field — it
  does not (§2.3).
- Do not fabricate, estimate, approximate, or derive provider cost from any
  source other than the authoritative `providerCost` parameter — prohibited
  (§2.3, DR 0066).
- Do not write to `finance.expenses` or `finance.financial_ledger` when
  `providerCost` is undefined — prohibited (§2.3).
- Do not assume `recorded: false` indicates an error — it is a valid
  non-error outcome (§2.2).
- Do not assume the idempotency check may be skipped — required (§2.5).
- Do not assume `organization_id` may come from client input — agent runtime
  service token only (§2.7).
- Do not assume this record modifies Decision Records 0001–0082 — it does not.

---

## 4. Owner Approval

Owner approved as part of Phase 12 build authorization.

This record is a retrospective documentation filing. The implementation in
`lib/agent/cost-recording.ts` is the authoritative source of truth for
the decisions recorded here.
