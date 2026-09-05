# Decision Record 0046 — Phase 07: Quote ACCEPTED → Order Creation Authority

- **Decision Round:** Phase 07
- **Phase:** 07 — Payments & Orders
- **Status:** APPROVED — Owner approved 2026-09-04. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-04
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** DR 0041 §16 item 2 ("Quote acceptance authority (`SENT →
  ACCEPTED`) — not resolved"); Phase 07 PLAN blocker: "DR 0046 — Quote
  ACCEPTED → Order Creation Authority."
- **Relationship to prior records:** Does not modify Decision Records 0001–0045.
  All remain authoritative and unchanged. This record resolves the explicitly
  deferred SENT→ACCEPTED authority established in DR 0005 and carried as an
  open deferred item in DR 0041 §16 item 2. It also resolves the Order creation
  authority deferred in DR 0007, which stated "ACTIVE→COMPLETED guard DEFERRED.
  Cancellation authority DEFERRED." Order creation itself (the mechanism that
  creates an ACTIVE Order) was an open question that this record addresses.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0045. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0005 § State Definitions):** "`ACCEPTED` — Client has accepted the
Quote and committed to the order."

**FACT (DR 0005 § Transitions, verified):** SENT→ACCEPTED is an approved
transition in the Quote state machine. DR 0005 does not specify which role
executes it.

**FACT (DR 0041 §16 item 2):** "Quote acceptance authority (`SENT → ACCEPTED`)
— not resolved. This is part of the client decision workflow (connected to
CLIENT Approval authority and Order creation) and requires a separate decision."

**FACT (DR 0007 § State Definitions):** The Order state machine defines three
states: ACTIVE, COMPLETED, CANCELLED. ACTIVE is the initial state when an Order
is created.

**FACT (DR 0007):** "ACTIVE→COMPLETED guard DEFERRED. Cancellation authority
DEFERRED." Order creation itself is not explicitly deferred; but no Decision
Record 0001–0045 specifies when and by whom an ACTIVE Order is created.

**FACT (verified schema, `commercial.orders`):** The `orders` table has:
`id`, `campaign_id`, `quote_id` (UNIQUE), `organization_id`, `status` CHECK
IN ('ACTIVE','COMPLETED','CANCELLED'), `archived_at`, `created_at`, `updated_at`.
The UNIQUE constraint on `quote_id` enforces that at most one Order can be linked
to a given Quote.

**FACT (verified schema, `commercial.order_budgets`):** `order_budgets` has
a 1:1 relationship to Orders. Fields include: `planned_amount`, `estimated_amount`,
`actual_amount` (all NUMERIC 19,4). This is not a profit tracker; it tracks
budget against an Order.

**FACT (verified schema, `commercial.quotes`):** `quotes.total_amount` exists
(NUMERIC 19,4). `quotes.estimated_cost` was authorized as a future schema gap
in DR 0043 §11.1 and is required by the Margin Check mechanism. It represents
the pre-sale estimated cost.

**FACT (Phase 07 PLAN):** `quotes.accepted_at TIMESTAMPTZ` is a missing field
identified as a Phase 07 schema gap. No such field exists in the current schema.

**FACT (DR 0029 § Approval authority):** No Decision Record 0001–0045 establishes
a CLIENT-facing Approval workflow that governs Quote acceptance in V1.

---

## 2. Problem

Phase 07 requires:

1. A resolved role authority for the SENT→ACCEPTED Quote transition (who may
   accept a Quote).
2. A resolved mechanism for Order creation (when and how an ACTIVE Order is
   created upon Quote acceptance).
3. A resolved mechanism for Order Budget initialization (what values populate
   the Order Budget at creation time).
4. A resolved atomicity requirement for the acceptance-and-creation transaction.
5. A resolved idempotency requirement.

Implementing any of these without an approved Decision Record would promote
assumptions to APPROVED boundaries — a violation of CLAUDE.md and the
governing evidentiary standard.

---

## 3. Decision

**PROPOSED (Owner instruction, Phase 07 pre-BUILD):**

### 3.1 Quote Acceptance Authority — CLIENT

**PROPOSED:** The CLIENT role is authorized to execute the SENT→ACCEPTED
transition on a Quote in DREXONYX V1.

Basis: DR 0005 § State Definitions: "ACCEPTED — Client has accepted the Quote
and committed to the order." Quote acceptance is inherently a CLIENT decision —
the client is the party to whom the Quote was presented (SENT→ACCEPTED is the
client's affirmative response to the commercial offer presented by DREXONYX).

**PROPOSED:** The role authority matrix for SENT→ACCEPTED is:

| Transition | OWNER | ADMIN/OPS | CREATIVE/PROD | QC | CLIENT | AGENT |
|---|---|---|---|---|---|---|
| SENT → ACCEPTED | NOT AUTHORIZED | NOT AUTHORIZED | NOT AUTHORIZED | NOT AUTHORIZED | AUTHORIZED | NOT AUTHORIZED |

Rationale for non-CLIENT roles:
- **OWNER / ADMIN/OPS:** These roles present Quotes to clients (DRAFT→SENT per
  DR 0041). Accepting a Quote on behalf of a client without the client's action
  collapses the commercial negotiation boundary. Quote acceptance is a client
  commitment, not an internal administrative action.
- **CREATIVE/PRODUCTION:** Scope is creative deliverable work. No commercial
  acceptance authority established in DR 0001–0045.
- **QC:** Scope is quality control verdicts. No Quote acceptance authority
  established.
- **AGENT:** Gate 0 least-privilege boundary. Quote acceptance initiates the
  Order and payment chain — a consequential commercial action outside AGENT scope.

**PROPOSED:** The authority is scoped to the CLIENT's own organization. A CLIENT
may only accept a Quote belonging to their organization (tenant scope enforced
server-side per DR 0002 D1).

**PROPOSED:** No Approval workflow is required for Quote acceptance in V1. The
CLIENT's server-side authenticated session action constitutes the acceptance.
A V1 Approval workflow governing Quote acceptance is explicitly DEFERRED (§7
item 1).

### 3.2 SENT→ACCEPTED Must Be Server-Side and Tenant-Scoped

**PROPOSED (reaffirming ARCHITECTURE.md, DR 0002 D1):**

The SENT→ACCEPTED transition must be performed server-side only:

1. The CLIENT's `organization_id` must be sourced from the server-side session
   JWT, never from client-controlled input.
2. The Quote's `organization_id` must match the session's `organization_id`.
3. The Quote must have `status = 'SENT'` at the time of execution.
4. The Quote must belong to the authenticated client's portal session.

No client-side visibility, URL parameter, or frontend state constitutes
authorization for this transition.

### 3.3 Quote Acceptance Automatically Creates Exactly One ACTIVE Order

**PROPOSED:** Quote acceptance (SENT→ACCEPTED) automatically and atomically
creates exactly one ACTIVE Order linked 1:1 to the accepted Quote.

The following must hold:

- One accepted Quote creates exactly one Order. No Quote may have more than
  one Order (enforced by `orders.quote_id UNIQUE`).
- The Order is created in ACTIVE status per DR 0007.
- The Order is linked to the same `campaign_id` and `organization_id` as the
  Quote.
- Order creation does not require a separate trigger, separate action, or
  separate API call after Quote acceptance. It is part of the same atomic
  operation.

### 3.4 Order Budget Initialization in the Same Atomic Transaction

**PROPOSED:** An Order Budget record (`commercial.order_budgets`) must be
initialized in the same atomic database transaction as the SENT→ACCEPTED
transition and Order creation.

**PROPOSED:** Initial Order Budget values:

| Field | Value | Source |
|---|---|---|
| `planned_amount` | `quote.total_amount` | The price committed by the client |
| `estimated_amount` | `quote.estimated_cost` | Pre-sale estimated cost per DR 0043 |
| `actual_amount` | `0` or `NULL` | No actual costs incurred at creation time |

**PROPOSED:** `estimated_amount` may be NULL if `quote.estimated_cost` is NULL
at the time of acceptance. This is a data state, not an error — the pre-sale
cost estimate is nullable per DR 0043 §5.4 (NOT_READY state). The Order Budget
is still created; its `estimated_amount` reflects the Quote's estimated_cost at
acceptance time.

**PROPOSED:** `actual_amount` starts at zero (or the schema default). Actual
costs are posted post-production via `financial.expenses`.

### 3.5 Atomicity Requirement

**PROPOSED:** The following must execute in a single atomic database
transaction:

1. State precondition check: `quote.status = 'SENT'`, tenant scope verification.
2. Quote status update: `status = 'ACCEPTED'`, `accepted_at = now()`,
   `updated_at = now()`.
3. Order creation: new `commercial.orders` row, status ACTIVE.
4. Order Budget initialization: new `commercial.order_budgets` row with values
   per §3.4.
5. Audit Event: append-only record of the acceptance event (see §4).
6. Idempotency key write: per §5.

If any step fails, the entire transaction must roll back. A partial execution
(e.g., Quote accepted but no Order created) is not permitted. An Order Budget
created without a corresponding committed Order is not permitted.

### 3.6 Atomicity and Idempotency

**PROPOSED:** The SENT→ACCEPTED action, including Order creation and Order
Budget initialization, must be idempotent. If the same idempotency key is
presented for a second invocation and the first committed successfully, the
previously committed result is returned without re-executing any step.

**PROPOSED:** The idempotency mechanism uses `system.idempotency_keys` per
DR 0002 D4. The operation type should identify this as a Quote acceptance
action (e.g., `'quote.sent_to_accepted'`).

---

## 4. Audit Requirements

**PROPOSED (from DR 0002 §6, §7):**

The SENT→ACCEPTED transition, including Order creation, must produce an
Audit Event in the same database transaction.

Minimum required Audit Event payload:

```json
{
  "previous_status": "SENT",
  "new_status": "ACCEPTED",
  "quote_id": "<uuid>",
  "total_amount": "<NUMERIC string>",
  "estimated_cost": "<NUMERIC string or null>",
  "order_id": "<uuid>",
  "order_budget_planned_amount": "<NUMERIC string>",
  "order_budget_estimated_amount": "<NUMERIC string or null>",
  "idempotency_key": "<key reference>"
}
```

The Audit Event must use the polymorphic reference model: `entity_type = 'quote'`,
`entity_id = quote.id`, `organization_id` from session, `actor_id` and
`actor_role` from session.

---

## 5. Schema Implications

**PROPOSED (not authorizing schema changes):**

This decision implies the following schema gap items identified in Phase 07 PLAN:

**Gap 1 — `commercial.quotes.accepted_at` (MISSING)**

The `quotes` table requires a new column:
```
accepted_at  TIMESTAMPTZ   NULLABLE
```
NULL = not yet accepted. Set to `now()` at the moment of SENT→ACCEPTED transition.

**Gap 2 — `commercial.order_budgets` initialization values**

The `order_budgets` table currently has `planned_amount`, `estimated_amount`,
`actual_amount`. These are sufficient for the initialization values in §3.4.
No new columns are identified as required for this record.

**PROPOSED:** No schema change is authorized by this record. Schema migrations
require separate authorization per the source-of-truth hierarchy in CLAUDE.md.

---

## 6. Financial Boundary

**APPROVED (reaffirming DR 0001 §6):**

Quote acceptance and Order creation do not constitute a financial event:

- No Financial Ledger entry is written upon SENT→ACCEPTED.
- No `financial.payments` record is created by Quote acceptance.
- No revenue is recognized upon Quote acceptance.
- No profit is recognized upon Quote acceptance.
- Order Budget initialization (`planned_amount`, `estimated_amount`) is a
  planning record, not a financial ledger event.

Financial events — specifically the `CLIENT_PAYMENT` Financial Ledger entry —
occur only upon a verified payment reaching PAID status (DR 0052), not upon
Quote acceptance.

The financial separations from DR 0001 §6 are fully preserved:
- Payment ≠ Revenue: Quote acceptance is not a payment.
- Order Budget ≠ Profit: the initialized Order Budget is not a profit record.
- Profit ≠ Owner Settlement: unaffected.

---

## 7. Deferred Items

1. **Approval workflow for Quote acceptance** — a formal CLIENT Approval workflow
   governing acceptance is explicitly DEFERRED for V1. The server-side session
   action constitutes acceptance in V1 without a separate Approval record.

2. **OWNER / ADMIN_OPERATIONS override of Quote acceptance** — not resolved by
   this record. If a future operational need exists for an admin-side acceptance
   (e.g., on behalf of a client), a separate Decision Record is required.

3. **Quote cancellation authority** — deferred from DR 0041 §16 item 1.
   Unchanged by this record.

4. **Quote rejection authority (`SENT → REJECTED`)** — deferred from DR 0041
   §16 item 3. Unchanged by this record.

5. **Quote expiry mechanism (`SENT → EXPIRED`)** — deferred from DR 0005 and
   DR 0041 §16 item 4. Unchanged by this record.

6. **Order ACTIVE→COMPLETED guard** — deferred from DR 0007. Unchanged.

7. **Order cancellation authority** — deferred from DR 0007. Unchanged.

8. **Concurrency handling for simultaneous acceptance attempts** — the UNIQUE
   constraint on `orders.quote_id` and the idempotency key mechanism provide
   structural protection. Additional concurrency handling is a BUILD-phase detail.

9. **All deferred items from DR 0001–0045 not addressed here** remain open.

---

## 8. Compatibility with Decision Records 0001–0045

- **DR 0002 D1 (Tenant isolation):** organizationId from server-side session;
  Quote's organizationId matched server-side. Consistent.
- **DR 0002 D4 (Idempotency):** `system.idempotency_keys` applied. Consistent.
- **DR 0002 §6, §7 (Audit Events):** Atomic Audit Event in the same transaction;
  append-only. Consistent.
- **DR 0005 (Quote state machine):** SENT→ACCEPTED is an approved transition.
  State machine unchanged. This record fills the deferred authority detail only.
  Consistent.
- **DR 0007 (Order state machine):** Order created in ACTIVE status per DR 0007.
  Payment state not reflected on Order. Consistent.
- **DR 0041 §16 item 2 (deferred):** Resolved by this record for CLIENT only.
  Consistent.
- **DR 0043 (Cost Check / Margin Check):** `quotes.estimated_cost` is sourced
  from the existing Quote field per DR 0043. Order Budget `estimated_amount`
  is populated from it. Consistent.
- **ARCHITECTURE.md:** Server-side authorization; no client-controlled input
  for organizationId. Consistent.
- No Decision Record 0001–0045 is modified, reinterpreted, or superseded.

---

## 9. Explicitly Prohibited Assumptions

- Do not assume OWNER or ADMIN_OPERATIONS may execute SENT→ACCEPTED — NOT
  AUTHORIZED per §3.1.
- Do not assume a separate API call or trigger creates the Order after Quote
  acceptance — Order creation is part of the same atomic operation (§3.3, §3.5).
- Do not assume a Financial Ledger entry is created by Quote acceptance — it
  is not (§6).
- Do not assume the ORDER BUDGET constitutes a profit record — it is not (§6).
- Do not assume Quote acceptance constitutes payment — it does not.
- Do not assume an Approval record governs V1 Quote acceptance — explicitly
  deferred (§7 item 1).
- Do not assume `quotes.accepted_at` currently exists in the schema — it does
  not (§5).
- Do not assume this record resolves Order cancellation, rejection, or
  expiry authority — all remain deferred (§7).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0045 have been altered, reinterpreted,
  or superseded.

---

## 10. Owner Approval

**This record is PROPOSED and requires explicit Owner approval before any
implementation may proceed.**

No Quote acceptance server action, Order creation logic, Order Budget
initialization, schema migration for `accepted_at`, or any related BUILD work
may begin based on this record until the Owner approves it.

**No implementation is authorized by approval of this record alone.**
Phase 07 BUILD authorization is a separate, subsequent decision.
