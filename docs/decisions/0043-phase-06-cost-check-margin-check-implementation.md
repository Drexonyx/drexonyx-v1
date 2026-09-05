# Decision Record 0043 — Phase 06: Cost Check and Margin Check Implementation Mechanism

- **Decision Round:** Phase 06
- **Phase:** 06 — Admin Command Center
- **Status:** APPROVED
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-04
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** DR 0005 § Deferred: "Exact transition guards beyond Cost Check + Margin Check
  requirement" and "Whether Cost Check and Margin Check require persisted audit records";
  DR 0041 §16 item 5 ("Cost Check and Margin Check implementation mechanism — deferred in
  DR 0005 and unchanged by DR 0041").
- **Relationship to prior records:** Does not modify Decision Records 0001–0042. All
  remain authoritative and unchanged. This record supplements DR 0005 (Quote state machine)
  and DR 0041 (DRAFT→SENT role authority) by resolving the implementation mechanism and
  business rules for the Cost Check and Margin Check commercial guards.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**, **DEFERRED**,
or **REQUIRES OWNER DECISION**, consistent with the evidentiary standard applied throughout
DR 0001–0042. No statement is promoted above FACT unless directly grounded in an approved
Decision Record, the verified schema, or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0005 § Commercial Guards):** The `DRAFT → SENT` Quote transition requires
successful Cost Check and Margin Check. DR 0005 additionally states: "Cost Check and
Margin Check are **not** separate Quote states. No persisted state values are created
for them by this record."

**FACT (DR 0005 § Deferred):** The following remain explicitly deferred by DR 0005:

- Exact transition guards beyond the Cost Check + Margin Check requirement.
- Whether Cost Check and Margin Check require persisted audit records.

**FACT (DR 0041 §16 item 5):** "Cost Check and Margin Check implementation mechanism —
deferred in DR 0005 and unchanged by this record."

**FACT (DR 0041 §8):** The DRAFT→SENT guard contract is:
```
quote.status = 'DRAFT'
AND Cost Check = PASS
AND Margin Check = PASS
```
An actor holding AUTHORIZED status (OWNER or ADMIN_OPERATIONS) may execute DRAFT→SENT
only when all three conditions are satisfied.

**FACT (DR 0001 §6, verified financial architecture):** The approved conceptual flow is:
```
CLIENT PAYMENT → PAYMENT LEDGER → ORDER BUDGET → EXPENSE LEDGER
→ PROVIDER CREDITS → PROFIT CALCULATION → RESERVES
→ DISTRIBUTABLE PROFIT → OWNER SETTLEMENT
```
Approved separations: Payment ≠ Revenue, Provider Credit ≠ Cash/Profit,
Order Budget ≠ Profit, Profit ≠ Owner Settlement.

**FACT (Owner instruction, Phase 06 BUILD context):** The pricing model is approved as
Hybrid: Cost floor + market position + perceived value + target margin. Pricing
data/config must be data-driven, not hardcoded.

**FACT (Owner instruction, Phase 06 BUILD context):** The commercial model is approved as
Hybrid: PACKAGE → BASE PRICE + ADD-ONS + EXTRA PRODUCTION + EXTRA REVISION →
QUOTE → COST CHECK → MARGIN CHECK → CLIENT APPROVAL → PAYMENT.

**FACT (verified schema, `commercial.quotes`):** The `quotes` table currently has:
`id`, `campaign_id`, `organization_id`, `status`, `total_amount` (NUMERIC 19,4),
`archived_at`, `created_at`, `updated_at`. There is no `estimated_cost` field,
no `currency` field, and no cost component breakdown.

**FACT (verified schema, `commercial.order_budgets`):** `order_budgets` tracks
`planned_amount`, `estimated_amount`, and `actual_amount` for a committed Order
(post-acceptance). It is linked to `orders`, not to `quotes`. It is not a
pre-sale cost estimation mechanism.

**FACT (verified schema):** No pricing configuration table exists in any schema
namespace (core, identity, commercial, production, financial, system).

**FACT (verified schema):** No quote line items table exists. No per-component cost
breakdown table exists for quotes.

**FACT (verified schema, `financial.financial_ledger`):** The Financial Ledger is
append-only. It is the authoritative immutable financial event ledger (DR 0001 §6,
DR 0002 §7). There is no separate Profit Ledger entity; Distributable Profit is a
computed value.

**FACT (verified schema, `system.audit_events`):** Audit events use a polymorphic
model (`entity_type`, `entity_id`, `organization_id`, `actor_id`, `actor_role`,
`action`, `payload` (jsonb)) and are append-only (DR 0002 §6, §7).

---

## 2. Problem

DR 0041 establishes the guard contract for DRAFT→SENT (Cost Check PASS AND Margin
Check PASS) but explicitly defers the implementation mechanism. Phase 06 BUILD cannot
implement the DRAFT→SENT API route without resolving:

1. **What exactly Cost Check evaluates** — which inputs, what rules, what results.
2. **What exactly Margin Check evaluates** — which inputs, which formula, what threshold.
3. **Where the required data lives** — which schema holds estimated cost and pricing config.
4. **Whether check results are persisted** — audit record requirements.
5. **How quote changes affect the checks** — invalidation and re-check rules.
6. **Financial boundary** — whether either check touches the Financial Ledger.

---

## 3. Critical Pre-Sale / Post-Production Distinction

**APPROVED principle (this record):**

This record governs **pre-sale** checks only. The distinction between pre-sale and
post-production must be preserved throughout any implementation:

```
PRE-SALE (this record):
  Quote Price (total_amount)
  → Estimated Cost
  → Cost Check
  → Margin Check
  → Client Approval
  → Payment

POST-PRODUCTION (existing architecture, unchanged):
  Actual Expenses / Actual Provider Cost
  → Financial Ledger
  → Profit Calculation
  → Reserves
  → Distributable Profit
  → Owner Settlement
```

**APPROVED:** Cost Check is a pre-sale commercial control. It does not prove or
constitute actual profitability. Actual profitability is determined later from actual
financial events and expenses recorded in the Financial Ledger.

**PROPOSED:** The Margin Check in this record is a **pre-sale gross margin estimate**
only. It is NOT a final profitability calculation. It does not replace, predict, or
guarantee the post-production profit outcome. Actual profitability is computed
post-production using actual expenses from the Financial Ledger — not from the
Quote's estimated cost.

This distinction must be enforced in implementation: the Margin Check evaluates whether
it is commercially reasonable to send the quote to the client, not whether the final
production will be profitable.

---

## 4. Scope of This Record

**This record decides:**
1. The definition and rules for Cost Check, including the conceptual Estimated Cost composition.
2. The definition, formula, and inputs for Margin Check.
3. The implementation mechanism (Option C — Hybrid; see §8).
4. Required schema additions (for future implementation).
5. PASS / FAIL / NOT_READY behavior for both checks.
6. The guard contract fulfilled by both checks for DRAFT→SENT.
7. How quote changes affect check validity.
8. Whether either check creates Financial Ledger events.
9. Audit requirements for both checks, including blocked-attempt audit events.
10. Role authority for setting and updating `quotes.estimated_cost`.
11. Internal production cost treatment in `estimated_cost`.
12. Whether V1 includes a cost ceiling or floor threshold.
13. Whether V1 uses organization-level or multi-level margin configuration.

**This record does NOT:**
- Authorize implementation, schema changes, migrations, or code changes.
- Modify DR 0005's Quote state machine or transitions.
- Modify DR 0041's role authority for DRAFT→SENT.
- Define post-production profit calculation.
- Define actual-cost reconciliation between estimated_cost and actual Expenses.
- Define pricing configuration management UI (creation, editing of pricing config).
- Define quote line item granularity beyond total estimated_cost (see §12 DEFERRED).
- Define Quote cancellation authority (DEFERRED in DR 0041).
- Invent provider cost rates, internal labor rates, or production rates.

---

## 5. Cost Check — Definition and Rules

### 5.1 Purpose

The Cost Check verifies that the Quote has a **controlled, positive estimated cost
value that represents the expected direct cost required to fulfill the approved
commercial scope** before the Quote is formally presented to the client.

The Cost Check does NOT evaluate whether the business decision to price the quote is
commercially optimal. It is a pre-sale commercial control — a data completeness and
validity gate — not proof of actual profitability.

### 5.2 Estimated Cost Composition — Conceptual Model

**PROPOSED:** `estimated_cost` is intended to represent the total expected direct cost
to fulfill the Quote's approved commercial scope. The conceptual composition is:

```
Estimated Cost =
    Provider/AI estimated cost
  + Direct production costs
  + Approved add-on costs
  + Approved extra production costs
  + Approved revision allowance
  + Applicable internal production cost
    (only where an approved controlled cost basis exists — see §5.6)
```

**PROPOSED:** In V1, `estimated_cost` is implemented as a **single controlled aggregate
field** (`NUMERIC(19,4)`) on the `quotes` table. The V1 system does **not** automate
component-level calculation for every cost component, because the required data sources
(provider rate tables, internal labor rate tables, production rate structures) do not
currently exist in the schema. Automated line-item and component-level costing is
**DEFERRED** until the required data sources and authorizing decision records exist
(§12 item 1).

**PROPOSED:** The authorized actor (see §5.5) is responsible for entering an
`estimated_cost` value that honestly represents the full expected direct cost
composition listed above for the Quote's approved scope. The system validates
completeness and positivity; it does not independently verify the internal accuracy
of the component breakdown.

**PROPOSED:** Components and their V1 status:

| Component | V1 Status | Automated Calculation? |
|---|---|---|
| Provider/AI generation cost | Part of aggregate `estimated_cost` | No — entered by authorized actor |
| Direct production costs | Part of aggregate `estimated_cost` | No — entered by authorized actor |
| Approved add-on costs | Part of aggregate `estimated_cost` | No — entered by authorized actor |
| Approved extra production costs | Part of aggregate `estimated_cost` | No — entered by authorized actor |
| Approved revision allowance | Part of aggregate `estimated_cost` | No — entered by authorized actor |
| Internal production cost (where applicable) | Part of aggregate `estimated_cost` | No — see §5.6; entered by authorized actor where controlled basis exists |

No cost rates, provider prices, internal labor rates, or production rates are
hardcoded or invented by this record.

### 5.3 Required Inputs

**PROPOSED:**

| Input | Source | Required |
|---|---|---|
| `quote.estimated_cost` | `commercial.quotes.estimated_cost` — new field | YES — does not exist yet |
| `quote.organization_id` | `commercial.quotes.organization_id` | YES — already exists |

### 5.4 Result States

**PROPOSED:**

| State | Condition | Meaning |
|---|---|---|
| `NOT_READY` | `estimated_cost IS NULL` | Required cost data has not been entered; cannot evaluate. |
| `FAIL` | `estimated_cost IS NOT NULL AND estimated_cost <= 0` | Cost data is present but invalid (zero or negative). |
| `PASS` | `estimated_cost IS NOT NULL AND estimated_cost > 0` | Cost data is present and structurally valid. |

**PROPOSED:** For the DRAFT→SENT guard, `NOT_READY` and `FAIL` both block the
transition. Only `PASS` permits proceeding to Margin Check.

**PROPOSED:** V1 Cost Check validates controlled estimated-cost completeness and
positivity. It does not independently verify that every conceptual cost component
(§5.2) has been included. Authorized-role discipline is the V1 control for cost basis
completeness. Automated per-component validation is DEFERRED (§12 item 1).

**PROPOSED:** Cost Check is a guard and process. It does not introduce a new
Quote lifecycle state. The Quote remains in DRAFT or transitions to SENT; no
intermediate check state is added to the Quote status.

### 5.5 Role Authority for Setting and Updating `estimated_cost`

**APPROVED (resolved):**

- **OWNER** and **ADMIN_OPERATIONS** may create and update `quotes.estimated_cost`
  while `quote.status = 'DRAFT'`.
- These roles are **not authorized** to modify `estimated_cost` after the Quote
  transitions to SENT or any subsequent state.
- **CREATIVE_PRODUCTION**, **QC**, **CLIENT**, and **AGENT** may not set or update
  `quotes.estimated_cost` through this mechanism.
- Any post-SENT commercial change (including cost revision) requires cancellation of
  the existing Quote and creation of a new DRAFT Quote, per DR 0005 Boundary 5.

### 5.6 Internal Production Cost Treatment

**APPROVED (resolved):**

Internal production cost is **included** in `estimated_cost` when DREXONYX has an
approved, controlled internal-cost basis for the production scope defined in the Quote.

- This record does **not** invent, mandate, or hardcode an internal cost rate, labor
  rate, or production rate. No such rates are specified here.
- The mechanism and specific basis for internal cost calculation are **DEFERRED** until
  DREXONYX establishes and approves controlled internal cost structures (§12 item 2).
- Where no approved internal-cost basis exists for a particular Quote's scope, that
  component must **not** be fabricated or estimated without a controlled basis.
- An `estimated_cost` value that omits internal production costs where such costs
  are known to be applicable is an incomplete cost basis. An incomplete cost basis
  must not be represented as a fully calculated cost.

The operational consequence: if DREXONYX has not established a controlled internal
cost structure, `estimated_cost` may legitimately cover only external/provider costs
for a given Quote. In that case, the authorized actor enters the value that reflects
the actual known cost basis. The Cost Check evaluates that value for positivity and
presence; it does not enforce internal-cost inclusion.

### 5.7 Financial Boundary — Cost Check

**APPROVED:**

The Cost Check does NOT:
- Create a Financial Ledger entry.
- Mutate any financial data (orders, payments, expenses, reserves, provider credits,
  owner settlements).
- Constitute a payment, revenue recognition, profit, or settlement event.

The Cost Check is a read-only evaluation of pre-sale cost data.

### 5.8 Cost Ceiling and Floor Threshold

**APPROVED (resolved):**

No separate cost ceiling or cost floor threshold is part of the V1 Cost Check. The
Cost Check validates controlled estimated-cost completeness and positivity only
(§5.4 PASS/FAIL/NOT_READY rules).

If a future commercial policy requires additional ceiling/floor controls (e.g.,
`estimated_cost` must not exceed a multiple of `total_amount`), that requires a future
Decision Record specifying the threshold source, rules, and schema implications. This
is **DEFERRED** (§12 item 3).

---

## 6. Margin Check — Definition and Rules

### 6.1 Purpose

The Margin Check verifies that the Quote's pre-sale gross margin — the estimated
profit margin as a percentage of revenue — meets or exceeds the organization's minimum
acceptable margin threshold before the Quote is presented to the client.

This is a **pre-sale estimate only**. It does not represent actual or final
profitability. Actual margin is computed post-production using actual expenses and the
Financial Ledger.

### 6.2 Required Inputs

**PROPOSED:**

| Input | Source | Required |
|---|---|---|
| `quote.total_amount` | `commercial.quotes.total_amount` | YES — already exists |
| `quote.estimated_cost` | `commercial.quotes.estimated_cost` — new field | YES — see §5.2 |
| `minimum_acceptable_margin_rate` | `commercial.pricing_configs.minimum_acceptable_margin_rate` | YES — new table |
| `quote.organization_id` | Session-scoped; matches pricing_config record | YES |

### 6.3 Margin Formula

**PROPOSED:**

```
gross_margin_rate = (total_amount - estimated_cost) / total_amount
```

Where:
- `total_amount` = `quotes.total_amount` (the price quoted to the client, NUMERIC 19,4)
- `estimated_cost` = `quotes.estimated_cost` (the total estimated production cost, NUMERIC 19,4)
- `gross_margin_rate` = a dimensionless rate in (−∞, 1.0]

The computed `gross_margin_rate` is then compared against
`pricing_configs.minimum_acceptable_margin_rate`.

**PROPOSED:** Intermediate arithmetic is performed in sufficient decimal precision
(at least NUMERIC(19,8) for intermediate results) to avoid precision loss from
NUMERIC(19,4) inputs.

### 6.4 Result States

**PROPOSED:**

| State | Condition | Meaning |
|---|---|---|
| `NOT_READY` | `estimated_cost IS NULL` | Required cost input is missing; cannot evaluate. |
| `NOT_READY` | `total_amount IS NULL OR total_amount <= 0` | Quote price is missing or invalid. |
| `NOT_READY` | `minimum_acceptable_margin_rate` not configured for organization | Pricing configuration is absent; cannot evaluate. |
| `FAIL` | `gross_margin_rate < minimum_acceptable_margin_rate` | Margin is below the minimum threshold. Includes cases where `estimated_cost >= total_amount` (negative or zero margin). |
| `PASS` | `gross_margin_rate >= minimum_acceptable_margin_rate` | Margin meets or exceeds the minimum required. |

**PROPOSED:** For the DRAFT→SENT guard, `NOT_READY` and `FAIL` both block the
transition. Only `PASS` permits the DRAFT→SENT execution.

### 6.5 Pricing Configuration Source and Threshold

**APPROVED (resolved):**

V1 uses **organization-level pricing configuration only**. A single
`commercial.pricing_configs` record per organization provides the binding margin
threshold.

- The binding field is: `commercial.pricing_configs.minimum_acceptable_margin_rate`
  (NUMERIC(5,4), NOT NULL).
- This value is **data-driven and organization-specific**. No numerical default or
  hardcoded value is specified by this record.
- `target_margin_rate` (NUMERIC(5,4), nullable) is informational and for UI/diagnostic
  purposes **only**. It is **not** the PASS/FAIL threshold. It has no binding effect
  on whether a DRAFT→SENT attempt succeeds.
- If no pricing config record exists for the organization, the Margin Check returns
  `NOT_READY`. An unconfigured organization cannot send quotes.
- Package-level or service-level margin thresholds are **not** introduced in V1.
  They are **DEFERRED** (§12 item 4).

### 6.6 Actual Cost and Final Profitability

**APPROVED:**

The Margin Check evaluates the **estimated** margin at Quote send time only. It is NOT:
- A final profitability statement.
- A guarantee of post-production margin.
- A trigger for profit calculation, reserve allocation, or owner settlement.

After production completes, actual expenses are recorded in `financial.expenses`
(linked to `financial.order_budgets`). Actual profitability is computed from the
Financial Ledger, not from `quotes.estimated_cost`. The gap between estimated_cost and
actual expenses is a post-production reconciliation item (DEFERRED, §12 item 5).

### 6.7 Financial Boundary — Margin Check

**APPROVED:**

The Margin Check does NOT:
- Create a Financial Ledger entry.
- Mutate any financial data.
- Constitute a payment, revenue recognition, profit, or settlement event.

The Margin Check is a read-only calculation from pre-sale Quote and pricing config data.

---

## 7. DRAFT→SENT Guard Contract

**APPROVED (reaffirmed from DR 0005 and DR 0041):**

The DRAFT→SENT transition may execute only when all of the following are satisfied,
evaluated in this order:

1. **Role authorization:** the actor is OWNER or ADMIN_OPERATIONS (DR 0041 §7).
   An unauthorized actor must never learn whether Cost Check or Margin Check would
   pass (DR 0041 §10).

2. **Tenant scope:** the actor's `organization_id` (from server-side session JWT)
   matches `quote.organization_id` (DR 0002 D1, DR 0041 §9).

3. **State precondition:** `quote.status = 'DRAFT'` — verified atomically in the
   same database transaction as the status update (DR 0041 §10).

4. **Cost Check = PASS:** `quote.estimated_cost IS NOT NULL AND quote.estimated_cost > 0`.
   `NOT_READY` or `FAIL` blocks the transition. A blocked-attempt Audit Event is written
   (§9.2).

5. **Margin Check = PASS:** computed `gross_margin_rate >= minimum_acceptable_margin_rate`
   from the organization's pricing config. `NOT_READY` or `FAIL` blocks the transition.
   A blocked-attempt Audit Event is written (§9.2).

6. **Idempotency check:** verify idempotency key against `system.idempotency_keys`
   (DR 0002 D4, DR 0041 §13).

**PROPOSED:** Steps 4 and 5 are computed freshly at the time of each DRAFT→SENT
invocation using the current state of `quote.estimated_cost` and the current
`pricing_configs` record. They are not cached or pre-stored as a separate PASS record
on the Quote.

**PROPOSED:** If step 4 or step 5 returns FAIL or NOT_READY, the implementation
returns the failure reason to the caller as a structured response. The Quote remains
in DRAFT status. A blocked-attempt Audit Event is written (§9.2).

**PROPOSED:** All steps 3–6 plus the state mutation and the successful DRAFT→SENT
Audit Event write execute in a single atomic database transaction per DR 0041 §14.
Blocked-attempt Audit Events are a separate write (§9.2).

---

## 8. Recommended Implementation Mechanism — Option C (Hybrid)

### 8.1 Options Evaluated

Three implementation options were evaluated for the Cost Check and Margin Check mechanism:

---

**Option A — Pure Deterministic Calculation (no persisted check records)**

The check is computed on-the-fly at DRAFT→SENT time. No check result is persisted beyond
the Audit Event payload on the DRAFT→SENT event.

| Criterion | Assessment |
|---|---|
| Financial correctness | Sufficient; check uses stored inputs |
| Auditability | Partial — blocked attempts not audited under this option |
| Historical stability | Good; inputs (estimated_cost) stored on quote |
| Quote snapshot integrity | Adequate if estimated_cost is stored on quote at send time |
| Tenant isolation | Fully preserved via scoped inputs |
| Idempotency | Handled by existing idempotency_keys mechanism |
| Future actual-cost reconciliation | No check record to reconcile against; reconcile against audit event |
| Compatibility with existing architecture | Fully compatible; no new domain entity |
| Implementation complexity | Low |

Limitation: does not audit blocked attempts, which is required by §9.2.

---

**Option B — Dedicated Cost Check / Margin Check Domain Records**

A `commercial.quote_cost_checks` table stores each check execution (whether it resulted
in PASS, FAIL, or NOT_READY), enabling a full history of check attempts per quote.

| Criterion | Assessment |
|---|---|
| Financial correctness | Superior; each attempt is logged |
| Auditability | Superior; independent query of check history |
| Historical stability | Superior; check record persists independently of audit events |
| Quote snapshot integrity | Superior; each check record snapshots inputs |
| Tenant isolation | Fully preserved |
| Idempotency | Each check attempt can be idempotency-keyed separately |
| Future actual-cost reconciliation | Can compare final actual cost against each historical check |
| Compatibility with existing architecture | Compatible but introduces a new domain entity |
| Implementation complexity | Moderate |

---

**Option C — Hybrid (Recommended)**

The check is computed fresh at DRAFT→SENT time (like Option A). The Quote carries its
own `estimated_cost` as a stored field (snapshot integrity). Both successful DRAFT→SENT
events and blocked attempts are captured in append-only Audit Events using existing
infrastructure. No separate check domain entity is created in V1.

A dedicated `quote_cost_checks` table is explicitly DEFERRED (§12 item 6).

| Criterion | Assessment |
|---|---|
| Financial correctness | Sufficient; inputs stored, check computed atomically at send time |
| Auditability | Full; successful and blocked-attempt events both audited via existing audit_events |
| Historical stability | Good; estimated_cost is stored on quote; audit events are append-only |
| Quote snapshot integrity | Good; estimated_cost is a quote field, snapshotted at composition time |
| Tenant isolation | Fully preserved |
| Idempotency | Handled by existing idempotency_keys; successful transaction is atomic |
| Future actual-cost reconciliation | Compare expenses.actual vs. quote.estimated_cost; no separate check record needed |
| Compatibility with existing architecture | Fully compatible; uses existing infrastructure |
| Implementation complexity | Low; no new domain table |

### 8.2 Recommendation

**PROPOSED: Option C (Hybrid)** is the recommended implementation mechanism.

Rationale:
1. DR 0005's prohibition was on Quote states, not on check audit records. The existing
   Audit Event infrastructure is sufficient to preserve check results with inputs for V1,
   for both successful and blocked-attempt events.
2. Adding a dedicated `quote_cost_checks` table before operational need is established
   violates CLAUDE.md's prohibition on inventing scope.
3. The `estimated_cost` field on the Quote provides snapshot integrity without a
   separate domain entity.
4. The Audit Event payload (jsonb) is sufficient for capturing check inputs, computed
   results, and actor/timestamp context for both outcomes.
5. A dedicated check record table is deferred, not prohibited — it can be added if the
   Owner determines the operational need exists (§12 item 6).

---

## 9. Audit Requirements

### 9.1 Successful DRAFT→SENT Audit Event

**PROPOSED:**

The DRAFT→SENT audit event (required by DR 0041 §12) must include a payload containing
the check inputs and results. Minimum required payload structure:

```json
{
  "previous_status": "DRAFT",
  "new_status": "SENT",
  "quote_id": "<uuid>",
  "total_amount": "<NUMERIC string>",
  "cost_check": {
    "status": "PASS",
    "estimated_cost": "<NUMERIC string>",
    "currency": "<currency code>"
  },
  "margin_check": {
    "status": "PASS",
    "quote_price": "<NUMERIC string>",
    "estimated_cost": "<NUMERIC string>",
    "gross_margin_rate": "<NUMERIC string>",
    "minimum_acceptable_margin_rate": "<NUMERIC string>",
    "currency": "<currency code>"
  },
  "idempotency_key": "<key reference>"
}
```

All numeric values are stored as NUMERIC strings from actual runtime values. No specific
values are mandated or hardcoded by this record.

**PROPOSED:** The payload is written once, atomically in the DRAFT→SENT transaction.
It is append-only and immutable post-commit (DR 0002 §7).

### 9.2 Blocked Attempt Audit Event

**APPROVED (resolved):**

Blocked DRAFT→SENT attempts — where the transition is blocked because Cost Check or
Margin Check returns FAIL or NOT_READY — **MUST** create an append-only Audit Event.

Minimum required payload structure for a blocked attempt:

```json
{
  "attempted_transition": "DRAFT_TO_SENT",
  "quote_id": "<uuid>",
  "quote_status_at_attempt": "DRAFT",
  "blocking_check": "<'cost_check' | 'margin_check'>",
  "check_status": "<'FAIL' | 'NOT_READY'>",
  "blocking_reason": "<human-readable description>",
  "cost_check_inputs": {
    "estimated_cost": "<NUMERIC string or null>"
  },
  "margin_check_inputs": {
    "total_amount": "<NUMERIC string or null>",
    "estimated_cost": "<NUMERIC string or null>",
    "minimum_acceptable_margin_rate": "<NUMERIC string or null>",
    "gross_margin_rate": "<NUMERIC string or null — only if computable>"
  },
  "idempotency_key": "<key reference if provided>"
}
```

**PROPOSED:**
- The blocked-attempt Audit Event uses `action = 'DRAFT_TO_SENT_BLOCKED'` (or equivalent
  agreed action name) in `system.audit_events`.
- Actor (`actor_id`, `actor_role`), `organization_id`, and timestamp are captured via
  the standard Audit Event fields.
- No secrets, credentials, or sensitive internal data are included in the payload.
- If both checks fail, the event captures the first blocking check encountered in
  evaluation order. Implementation may capture both check results if available.
- The blocked-attempt Audit Event is a separate append-only write, not part of the
  idempotency-keyed DRAFT→SENT success transaction.

---

## 10. Quote Change Behavior

### 10.1 Pre-SENT Changes

**PROPOSED:** A DRAFT Quote may have its `estimated_cost` updated by OWNER or
ADMIN_OPERATIONS (§5.5). When `estimated_cost` is updated, no check invalidation record
is needed — the Cost Check and Margin Check are always computed fresh at DRAFT→SENT time.

**PROPOSED:** If `total_amount` or `estimated_cost` changes while the Quote is in DRAFT,
the next DRAFT→SENT attempt recomputes both checks using the current values.

### 10.2 Post-SENT Changes

**APPROVED (DR 0005 Boundary 5, unchanged):** A SENT Quote may not transition back
to DRAFT. If a commercial change is required after SENT (change in price, scope,
estimated cost, or any component), the approved direction is:

1. Cancel the existing SENT Quote (SENT → CANCELLED).
2. Create a new DRAFT Quote with the corrected values.
3. The new Quote must independently pass Cost Check and Margin Check.

No supersedes chain, no in-place mutation of a SENT Quote is permitted.

### 10.3 Pricing Config Changes

**PROPOSED:** A DRAFT Quote is checked against the **currently applicable**
organization-level pricing configuration at the time DRAFT→SENT is attempted. An
updated `minimum_acceptable_margin_rate` applies immediately to all pending
DRAFT→SENT attempts.

**PROPOSED:** A pricing configuration change has no effect on already-SENT, ACCEPTED,
REJECTED, EXPIRED, or CANCELLED quotes. The Audit Event payload for the DRAFT→SENT
event captures the `minimum_acceptable_margin_rate` value in effect at the time of
sending (historical stability). Already-SENT quotes retain their historical check
snapshot.

---

## 11. Data Model Implications

### 11.1 Verified Schema Gaps (NOT implementing now — for future decision)

The following are gaps between what is required by this decision and what currently
exists in the schema:

**Gap 1 — `commercial.quotes.estimated_cost` (MISSING)**

The `quotes` table requires a new column:
```
estimated_cost  NUMERIC(19,4)   NULLABLE
```
NULL = not yet set (NOT_READY). Positive value = set, ready for evaluation.

**PROPOSED minimum migration (future, requires Owner authorization):**
```sql
ALTER TABLE commercial.quotes ADD COLUMN estimated_cost NUMERIC(19,4);
```

**Gap 2 — `commercial.pricing_configs` table (MISSING)**

A new table is required for organization-level pricing configuration:

```
commercial.pricing_configs
  id                             UUID PRIMARY KEY
  organization_id                UUID NOT NULL FK → core.organizations(id)
  minimum_acceptable_margin_rate NUMERIC(5,4) NOT NULL
  target_margin_rate             NUMERIC(5,4)            -- informational only
  currency                       TEXT NOT NULL DEFAULT 'USD'
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  UNIQUE (organization_id)       -- one pricing config per organization in V1
```

No specific value for `minimum_acceptable_margin_rate` is mandated or defaulted by
this record. The value is set by the Owner per organization.

**PROPOSED:** One pricing config per organization in V1 (no per-service or per-package
config granularity). Multi-level pricing config is **DEFERRED (§12 item 4)**.

**Gap 3 — `commercial.quotes.currency` (MISSING)**

`quotes.total_amount` has no `currency` field. All financial tables carry
`currency TEXT DEFAULT 'USD'`. Quotes do not. This is a pre-existing schema gap.
The Margin Check formula compares `total_amount` and `estimated_cost` — both must
be in the same currency.

**PROPOSED minimum migration (future, requires Owner authorization):**
```sql
ALTER TABLE commercial.quotes ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
```

Until this field is added, implementation must treat all Quote amounts as the
organization's base currency (USD default). This is Risk 4 (§18).

### 11.2 No Schema Changes in This Record

**APPROVED:** This record does not create, alter, or migrate any schema. No migration
file is created. No schema file is modified. The gaps above are future implementation
requirements that require separate authorization.

### 11.3 Existing Sufficient Infrastructure

The following existing schema elements are sufficient for this mechanism without change:

| Element | Usage |
|---|---|
| `commercial.quotes.total_amount` | Quote price input to Margin Check formula |
| `commercial.quotes.organization_id` | Tenant scoping for pricing config lookup |
| `system.audit_events` | Captures DRAFT→SENT events (successful and blocked) in payload |
| `system.idempotency_keys` | Duplicate-operation protection (DR 0002 D4, DR 0041 §13) |
| `commercial.order_budgets.estimated_amount` | Post-acceptance estimated cost (unchanged; not used pre-sale) |
| `financial.expenses` | Actual cost post-production (unchanged; not used in checks) |

---

## 12. Deferred Items

All previously listed REQUIRES OWNER DECISION items (A–E from the prior draft) are
resolved in this revision (§5.5, §5.6, §5.8, §6.5, §9.2). Only genuinely future
implementation matters remain deferred:

1. **Quote line item granularity** — whether `estimated_cost` is a single field or
   broken into component line items (provider cost, internal cost, add-on cost, etc.).
   V1 uses a single aggregate `estimated_cost` field; a line-items model is DEFERRED
   and requires a separate decision.

2. **Internal production cost mechanism and rates** — DREXONYX has not yet established
   a controlled internal-cost structure (rates, job types, calculation basis). Until
   such a structure is approved, internal costs are included in `estimated_cost` only
   where a controlled basis exists. The specific mechanism is DEFERRED.

3. **Cost ceiling and floor thresholds** — Not part of V1 Cost Check (§5.8). A future
   Decision Record is required if commercial policy demands it.

4. **Pricing config management interface** — who may create/edit `pricing_configs`
   rows, and the admin UI for doing so. DEFERRED.

5. **Actual-cost reconciliation** — comparison of `quotes.estimated_cost` against
   post-production `expenses` for variance analysis. DEFERRED.

6. **Dedicated `quote_cost_checks` table** — if operational need for pre-send check
   history (without committing DRAFT→SENT) is established. DEFERRED.

7. **Quote cancellation authority** — deferred from DR 0041 §16 item 1. Unchanged.

8. **Quote acceptance, rejection, expiry authority** — deferred from DR 0041 §16
   items 2–4. Unchanged.

9. **Quote validity duration** — deferred from DR 0005. Unchanged.

10. **Concurrency handling around expiration/acceptance** — deferred from DR 0005.

11. **Tenant/RLS enforcement mechanism** — deferred from DR 0041 §16 item 9.

12. **Package/service-level margin configuration** — V1 uses org-level only (§6.5).
    DEFERRED.

13. **All deferred items from DR 0001–0042 not addressed here** remain open.

---

## 13. Security and Tenant Isolation

**APPROVED (reaffirmed from DR 0001, DR 0002 D1, DR 0041 §9):**

1. The `pricing_configs` record used in the Margin Check must be scoped to
   `session.user.organizationId` — never from client-controlled input.
2. The `quotes` record evaluated must have `organization_id = session.user.organizationId` —
   verified server-side in the same query that reads the quote.
3. The Cost Check and Margin Check computations are server-side only.
   No cost or margin data is exposed to the client before authorization.
4. Role check precedes check evaluation (DR 0041 §10): an unauthorized actor must
   not learn whether checks would pass.
5. `estimated_cost` may only be set or updated by OWNER or ADMIN_OPERATIONS (§5.5);
   this is enforced server-side via session JWT role.

---

## 14. Idempotency

**APPROVED (reaffirmed from DR 0002 D4, DR 0041 §13):**

The DRAFT→SENT action — including the Cost Check and Margin Check evaluation — is
governed by the idempotency requirements in DR 0041 §13. The idempotency key covers
the complete atomic transaction: state precondition, check evaluation, state update,
successful Audit Event write, and idempotency key write. If the idempotency key is
already COMPLETED, the previously committed result is returned without re-running
the checks.

Blocked-attempt Audit Events (§9.2) are separate append-only writes and are not part
of the idempotency-keyed success transaction.

---

## 15. Financial Boundary — Consolidated

**APPROVED:**

Neither the Cost Check nor the Margin Check is a financial event. Both are pre-sale
read-only evaluations. They do NOT:

- Write a Financial Ledger entry.
- Touch `financial.payments`, `financial.expenses`, `financial.reserves`,
  `financial.provider_credits`, or `financial.owner_settlements`.
- Constitute revenue recognition, profit recognition, or Owner Settlement.
- Affect `commercial.order_budgets`.

The financial separations from DR 0001 §6 are fully preserved:

- Payment ≠ Revenue — unaffected.
- Provider Credit ≠ Cash/Profit — `estimated_cost` uses cash-equivalent estimates;
  actual Provider Credit treatment remains post-production.
- Order Budget ≠ Profit — Order Budget is post-acceptance; not used pre-sale.
- Profit ≠ Owner Settlement — Margin Check is a pre-sale estimate; it is not profit
  calculation and does not feed Owner Settlement.

---

## 16. Compatibility with Decision Records 0001–0042

- **DR 0001 §3 (NUMERIC 19,4):** `estimated_cost` uses NUMERIC(19,4); pricing config
  rates use NUMERIC(5,4). Consistent.
- **DR 0001 §6 (Financial Ledger):** Neither check creates Ledger entries. Consistent.
- **DR 0002 §6 (Audit Events):** Check results embedded in DRAFT→SENT payload;
  blocked-attempt events also use `audit_events`. Consistent with polymorphic model.
- **DR 0002 §7 (Immutability):** All Audit Event payloads are append-only. Consistent.
- **DR 0002 D1 (Tenant isolation):** All reads scoped to organization_id. Consistent.
- **DR 0002 D4 (Idempotency):** Check evaluation is part of the idempotency-keyed
  success transaction. Consistent.
- **DR 0005 (Quote state machine):** No new Quote states introduced. Cost Check and
  Margin Check are not Quote states. DRAFT and SENT states unchanged. "No persisted
  state values [for checks] are created" — consistent; Option C stores results in
  audit payload, not as Quote state values.
- **DR 0041 §8 (guard contract):** This record fully specifies the check mechanism
  that satisfies the DR 0041 §8 guard. Role authority unchanged.
- **DR 0041 §12 (Audit Event):** This record extends the DRAFT→SENT Audit Event
  payload specification and adds a blocked-attempt event. Consistent.
- **DR 0041 §14 (Transactional):** Check evaluation happens in the same atomic
  transaction for the success path. Consistent.
- **DR 0042 (Admin auth):** Authentication and session JWT are the source of
  `organizationId` and role for check scoping and `estimated_cost` authority. Consistent.

---

## 17. Alternatives Considered

### Option A (Pure Deterministic Calculation)
See §8.1. Under this revision, blocked-attempt auditing (§9.2) is required. Option A
does not audit blocked attempts, making it insufficient on its own. Option C fulfills
all requirements including blocked-attempt audit.

### Option B (Dedicated Check Domain Records)
See §8.1. More auditable but introduces a new domain table before operational need is
established. CLAUDE.md prohibits inventing scope. Deferred to §12 item 6.

### Storing check result as a Quote field (`quote.cost_check_status`)
Considered but rejected: DR 0005 explicitly states "Cost Check and Margin Check are
not separate Quote states. No persisted state values are created for them by this
record." Storing a check status on the Quote creates exactly the "persisted state
value" that DR 0005 prohibited. Option C avoids this by using the Audit Event payload.

### Using `order_budgets.estimated_amount` for pre-sale cost
Rejected: `order_budgets` is post-acceptance (linked to Orders, not Quotes). Using it
for pre-sale cost estimation would collapse the pre-sale/post-sale boundary. A
dedicated `quotes.estimated_cost` field is required.

---

## 18. Risks

**Risk 1 — estimated_cost not set before DRAFT→SENT attempt**
The NOT_READY result blocks the transition and returns an actionable error message.
A blocked-attempt Audit Event is written (§9.2). The Quote remains in DRAFT. No data
corruption risk.

**Risk 2 — Pricing config not configured for organization**
NOT_READY for Margin Check blocks DRAFT→SENT. A blocked-attempt Audit Event is written.
No quotes can be sent until pricing config is set. This is a deployment/onboarding
prerequisite, not a runtime error.

**Risk 3 — Estimated cost significantly diverges from actual cost**
This is an inherent pre-sale estimation risk. Actual cost is tracked post-production
through expenses and the Financial Ledger. The Margin Check guards against obviously
unfavorable pre-sale pricing but cannot guarantee post-production profitability.
The post-production reconciliation mechanism is DEFERRED (§12 item 5).

**Risk 4 — Currency mismatch between total_amount and estimated_cost**
The current `quotes` table has no `currency` field (Gap 3, §11.1). If total_amount and
estimated_cost are in different currencies, the Margin Check formula is invalid.
Until `quotes.currency` is added, implementation must treat all Quote amounts as the
organization's base currency (USD default). The `quotes.currency` migration must be
completed before multi-currency operation.

**Risk 5 — Minimum margin set too low, commercially unsound quotes sent**
The `minimum_acceptable_margin_rate` is configurable and organization-specific. No
numerical value is mandated by this record. Setting the rate to 0 or very low removes
the economic protection. This is an operational risk. It is the Owner's responsibility
to configure appropriate margins per organization.

**Risk 6 — Incomplete cost basis entered as estimated_cost**
If an authorized actor enters an `estimated_cost` that omits known applicable cost
components, Cost Check may PASS on an incomplete basis. V1 relies on authorized-role
discipline for cost basis completeness. Automated per-component validation is DEFERRED
(§12 item 1). Authorized actors are accountable for the accuracy of the cost basis
they submit.

---

## 19. Explicitly Prohibited Assumptions

- Do not assume `quotes.estimated_cost` exists in the current schema — it does not.
- Do not assume `commercial.pricing_configs` exists — it does not.
- Do not assume Cost Check or Margin Check creates a Financial Ledger entry — they do not.
- Do not assume Cost Check or Margin Check mutates financial data — they do not.
- Do not assume the Margin Check represents final profitability — it is a pre-sale estimate.
- Do not assume `order_budgets.estimated_amount` is the pre-sale cost estimate — it is not.
- Do not assume a dedicated `quote_cost_checks` table is created by this record — it is not.
- Do not assume `quotes.status` carries a check result value — it does not.
- Do not assume the V1 system automates component-level cost calculation — it does not.
- Do not assume a hardcoded or default `minimum_acceptable_margin_rate` value — none is
  specified by this record.
- Do not assume provider cost rates, internal labor rates, or production rates are
  defined by this record — they are not.
- Do not assume a cost ceiling or floor is part of V1 Cost Check — it is not (§5.8).
- Do not assume `target_margin_rate` is the PASS/FAIL threshold — it is informational only.
- Do not assume this record authorizes schema changes, migrations, code changes, commits,
  or pushes.
- Do not assume Decision Records 0001–0042 have been altered, reinterpreted, or
  superseded.

---

## 20. Consequences

Upon Owner approval, the following become mandatory requirements for any implementation
of the DRAFT→SENT API route:

1. `commercial.quotes.estimated_cost` (NUMERIC 19,4, nullable) must be added to the
   schema via a migration before the DRAFT→SENT route is implemented.
2. `commercial.pricing_configs` table must be created before any organization can
   successfully send a Quote.
3. The Cost Check must be implemented per §5 (NOT_READY / FAIL / PASS rules), with
   `estimated_cost` as a controlled aggregate field per §5.2.
4. The Margin Check must be implemented per §6 (formula, NOT_READY / FAIL / PASS rules).
5. Both checks must execute atomically in the DRAFT→SENT database transaction
   (DR 0041 §14) for the success path.
6. Successful DRAFT→SENT Audit Event payload must include check results per §9.1.
7. Blocked-attempt Audit Events must be written per §9.2 for every FAIL or NOT_READY
   blocking outcome.
8. Implementation may use Option C (Hybrid): fresh computation at send time, results
   in Audit Events, no separate check domain records in V1.
9. Financial Ledger must not be written by either check (§15).
10. Role authority for `estimated_cost` is OWNER and ADMIN_OPERATIONS only, while
    `quote.status = 'DRAFT'` (§5.5).
11. Deferred items in §12 remain open and must not be silently implemented.

---

## 21. Owner Approval

**APPROVED by Owner / DREXONYX on 2026-09-04.**

The Owner stated: *"APPROVE DR 0043 AS WRITTEN."*

The following are the governing specification as of this approval:

- **Cost Check mechanism** (§5): controlled aggregate `estimated_cost` approach;
  conceptual cost composition defined (§5.2); NOT_READY / FAIL / PASS rules; no
  automated component-level costing in V1 where data sources absent; no cost ceiling
  or floor in V1 (§5.8).
- **Margin Check mechanism** (§6): formula `gross_margin_rate = (total_amount −
  estimated_cost) / total_amount`; NOT_READY / FAIL / PASS rules (§6.4);
  organization-level configuration only (§6.5).
- **estimated_cost controlled aggregate approach for V1** (§5.2): single NUMERIC(19,4)
  field; automated component-level costing deferred where data sources absent.
- **OWNER + ADMIN_OPERATIONS authority** over `quotes.estimated_cost` while
  `quote.status = 'DRAFT'`; no other roles (§5.5).
- **Organization-level minimum acceptable margin configuration** as the binding Margin
  Check threshold; no hardcoded values; `target_margin_rate` informational only (§6.5).
- **Blocked-attempt Audit Event requirement** (§9.2): every blocked DRAFT→SENT attempt
  due to Cost Check or Margin Check FAIL or NOT_READY creates an append-only Audit Event.
- **No separate cost ceiling or floor in V1** (§5.8).
- **Internal production cost** included in `estimated_cost` only where an approved
  controlled cost basis exists; no rates invented; mechanism DEFERRED (§5.6).
- **Schema additions** in §11.1 authorized as future migration targets (subject to
  separate migration authorization).
- **Deferred items** in §12 remain open and must not be silently implemented.

**Approval scope (Owner-stated, 2026-09-04):**

1. V1 Cost Check uses a controlled aggregate `estimated_cost` value.
2. No invented provider costs, internal labor rates, or production rates.
3. OWNER and ADMIN_OPERATIONS may set/update `estimated_cost` while `quote.status = 'DRAFT'`.
4. CREATIVE_PRODUCTION, QC, CLIENT, and AGENT cannot modify `estimated_cost`.
5. Post-SENT commercial changes require cancel-and-reissue.
6. Internal production cost is included only when an approved controlled cost basis exists.
7. No separate cost ceiling/floor threshold in V1.
8. V1 Margin Check uses the formula:
   `gross_margin_rate = (total_amount - estimated_cost) / total_amount`
9. `minimum_acceptable_margin_rate` is the binding organization-level threshold.
10. `target_margin_rate` is informational only — not the PASS/FAIL threshold.
11. Package/service-level margin thresholds are deferred.
12. Blocked DRAFT→SENT attempts must create an append-only Audit Event.
13. Successful DRAFT→SENT must capture the relevant cost/margin snapshot in the Audit Event.
14. Cost/Margin checks do not write to the Financial Ledger or recognize profit.
15. Actual profitability remains based on actual financial events/expenses.
16. Component-level automated costing remains deferred until the required underlying
    data sources exist.

**No implementation is authorized by approval of this record alone.**
Schema migration authorization is a separate subsequent decision.
