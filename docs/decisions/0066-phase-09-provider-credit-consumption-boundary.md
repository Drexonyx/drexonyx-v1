# Decision Record 0066 — Phase 09: Provider Credit Consumption Boundary

- **Decision Round:** Phase 09
- **Phase:** 09 — Agent Runtime
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** DR 0060 §2.6 (Provider Credit consumption boundary, open item).
  Establishes that the runtime is NOT authorized to write provider credit records
  directly, and that consumption goes through an authorized financial service
  boundary with idempotency and tenant isolation.
- **Relationship to prior records:** Does not modify Decision Records 0001–0065.
  All remain authoritative and unchanged. Depends on DR 0001 §6 (financial
  architecture: Provider Credits ≠ Cash/Profit), DR 0052 §3.6 (financial
  separations), DR 0055 (runtime authentication), DR 0056 (runtime authority
  scope), DR 0060 (AI generation cost and financial recording boundary).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0065. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0001 §6):** Provider Credits ≠ Cash ≠ Profit. The approved financial
architecture treats Provider Credits as a separate category from cash payments,
profit calculations, and owner settlements.

**FACT (DR 0052 §3.6):** "Provider Credit ≠ Cash/Profit: No provider credit entry
type is introduced [in Phase 07]. Provider Credit lifecycle is post-production
and DEFERRED." Phase 09 is the first phase in which provider credit consumption
occurs (during AI generation).

**FACT (DR 0056 §2.7):** The runtime may not create financial records. Its
authority scope covers state transitions only.

**FACT (Phase 09 PLAN):** Whether Higgsfield uses a credit model (credits consumed
per generation) vs. a direct billing model is a Higgsfield-contract-specific
detail not yet confirmed.

---

## 2. Decision

**PROPOSED (Owner instruction, Phase 09 pre-BUILD):**

### 2.1 Runtime Is NOT Authorized to Write Provider Credit Records

**PROPOSED:** The Agent Runtime (the async generation driver, DR 0058) is not
authorized to write to any provider credit table or record. The runtime's authority
scope (DR 0056) does not include provider credit consumption recording.

This is consistent with DR 0060 §2.1 (runtime does not write financial records).

### 2.2 Provider Credit Consumption Through Financial Service Boundary

**PROPOSED:** If provider credit consumption must be recorded (conditional on
the Higgsfield contract model, §2.5), it is recorded through an authorized
financial service function. That service function is responsible for:

- Validating that the credit consumption data is authoritative (from the
  provider, not estimated).
- Idempotency via `system.idempotency_keys` (DR 0002 D4): a given generation's
  credit consumption is recorded exactly once, even if the trigger fires multiple
  times.
- Tenant isolation: `organization_id` from internal state only, not caller input.
- Audit event for the write.
- Atomic transaction: the credit consumption record and any associated financial
  ledger entry are written together or not at all.

### 2.3 Provider Credits ≠ Cash ≠ Profit — Separations Preserved

**PROPOSED:** Provider credit consumption recording (if any) does not constitute:
- Revenue recognition.
- Cash receipt.
- Profit calculation.
- Owner settlement.

Provider Credits remain a separate category per DR 0001 §6. Recording credit
consumption is an operational event, not a financial event in the revenue or
profit sense.

### 2.4 No Conversion of Provider Credits to Cash or Profit

**PROPOSED:** No code path in Phase 09 may convert provider credit consumption
values to cash amounts, revenue figures, or profit figures. The relationship
between provider credits and actual platform economics (cash cost, margin impact)
is a Higgsfield-contract-dependent calculation that is DEFERRED.

### 2.5 Trigger Is DEFERRED — Higgsfield Contract Dependent

**DEFERRED (REQUIRES DISCOVERY DURING BUILD):** Whether Higgsfield uses a credit
model and whether it exposes per-generation credit consumption data in webhook
responses or API queries is not yet confirmed. The trigger for provider credit
consumption recording is DEFERRED to BUILD-phase Higgsfield integration discovery.

If Higgsfield does not expose authoritative credit consumption data, no provider
credit consumption records are written in Phase 09.

### 2.6 Open Item Resolved

- DR 0060 §2.6: Provider Credit consumption boundary → established by this
  record (§2.1, §2.2, §2.5). ✓

---

## 3. Explicitly Prohibited Assumptions

- Do not assume the runtime may write provider credit records directly — it may
  not (§2.1).
- Do not assume provider credit values are equivalent to cash cost or profit —
  they are not (§2.3, DR 0001 §6).
- Do not assume Higgsfield uses a credit model — contract-dependent, discovery
  required (§2.5).
- Do not assume provider credit consumption triggers a ledger entry in all cases —
  only when authoritative data is available (§2.5).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0065 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

**No implementation is authorized by approval of this record alone.**
Phase 09 BUILD authorization is a separate, subsequent decision.
