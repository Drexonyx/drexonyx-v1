# Decision Record 0048 — Phase 07: Payment Retry Behavior

- **Decision Round:** Phase 07
- **Phase:** 07 — Payments & Orders
- **Status:** APPROVED — Owner approved 2026-09-04. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-04
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 07 PLAN blocker: "DR 0048 — Payment Retry Behavior
  (whether partial unique index allows retry on same order)."
- **Relationship to prior records:** Does not modify Decision Records 0001–0047.
  All remain authoritative and unchanged. Depends on DR 0044 (Stripe selected),
  DR 0045 (redirect checkout architecture), DR 0046 (Order creation on Quote
  acceptance), DR 0047 (payment status lifecycle including FAILED). This record
  resolves how FAILED payment attempts may be retried and establishes the
  idempotency model for duplicate/replayed provider events.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0047. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (verified schema, `financial.payments`):** The current `payments` table has:
```
id                 UUID PRIMARY KEY
order_id           UUID NOT NULL
organization_id    UUID NOT NULL
amount             NUMERIC(19,4) NOT NULL
currency           TEXT NOT NULL DEFAULT 'USD'
status             TEXT NOT NULL CHECK (...)
idempotency_key    TEXT UNIQUE
created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
```
There is no unique constraint on `(order_id, organization_id)` alone. There is
no partial unique index on `order_id` WHERE `status = 'PAID'`. The current schema
would allow multiple payment records for the same Order, including multiple PAID
records (no schema-level constraint prevents this).

**FACT (DR 0046):** Quote acceptance creates exactly one ACTIVE Order linked
1:1 to the accepted Quote. A failed payment attempt does not change Order status.

**FACT (DR 0047):** The approved payment lifecycle includes:
```
PENDING → PROCESSING → PAID
PENDING → PROCESSING → FAILED
```
A FAILED payment record does not transition back to PENDING or PROCESSING.

**FACT (DR 0002 D4):** Centralized `system.idempotency_keys` mechanism exists
for duplicate-operation protection.

**FACT (Phase 07 PLAN):** The current `payments.idempotency_key` column has a
UNIQUE constraint but is not a partial index. It does not inherently scope
idempotency to a specific payment attempt — any unique key value satisfies it.

---

## 2. Problem

A failed payment does not cancel the Order. The client may need to retry payment
for the same Order. The schema must accommodate multiple payment attempts per
Order while ensuring:

1. At most one PAID payment exists for any given Order (preventing double-payment).
2. FAILED payment records are preserved as historical records (not mutated).
3. Duplicate or replayed provider webhook events do not create duplicate
   PAID recognitions or duplicate Financial Ledger entries.
4. A failed payment attempt does not prompt creation of a new Order.
5. The idempotency model is clear at both the payment record level and the
   webhook handler level.

Without resolving these behaviors, Phase 07 BUILD would implement retry and
idempotency logic by assumption — a violation of CLAUDE.md.

---

## 3. Decision

**PROPOSED (Owner instruction, Phase 07 pre-BUILD):**

### 3.1 Each Payment Attempt Is a Separate Payment Record

**PROPOSED:** Each payment attempt for an Order creates a new, independent
`financial.payments` row.

- A FAILED payment attempt is preserved as a historical FAILED record.
- A retry creates an entirely new `financial.payments` row with a new UUID,
  a new idempotency key, and status PENDING.
- The FAILED record is never mutated to PENDING, PROCESSING, or PAID as a
  result of a retry.

This preserves the append-only spirit of the financial data model and maintains
a complete historical record of all payment attempts.

### 3.2 A FAILED Payment May Be Retried by Creating a New Payment Record

**PROPOSED:** When a payment attempt results in FAILED:

1. The FAILED payment record remains unchanged (its status is terminal for that
   record).
2. The client may initiate a new payment attempt for the same Order.
3. A new `financial.payments` row is created for the retry, starting in PENDING.
4. The retry follows the same PENDING→PROCESSING→PAID/FAILED lifecycle per DR 0047.

The mechanism for presenting the retry option to the client (e.g., a "Try Again"
button in the portal) is a BUILD-phase UI detail.

### 3.3 Do Not Mutate a FAILED Payment Back into an Active Attempt

**PROPOSED:** No code path may change a FAILED payment record's status to
PENDING, PROCESSING, or PAID. FAILED is a terminal status for a given Payment
record.

This rule applies to both application code and any webhook handler path.
A Stripe webhook event arriving for a Checkout Session that resulted in FAILED
must not resurrect the FAILED record; it may only update the existing FAILED
record with informational fields (e.g., failure_reason) or be a no-op if
already in terminal state.

### 3.4 An Order May Have Multiple Payment Attempts, At Most One PAID Payment

**PROPOSED:** The schema must enforce that at most one `financial.payments`
record with `status = 'PAID'` exists for any given Order.

**PROPOSED (schema constraint decision):**

A partial unique index is the appropriate constraint:
```
UNIQUE (order_id) WHERE (status = 'PAID')
```
This allows multiple payment records for the same Order (PENDING, PROCESSING,
FAILED records may coexist) while ensuring only one PAID record can exist per
Order at the database level.

**PROPOSED:** The exact index definition and migration are BUILD-phase implementation
details conditioned on BUILD authorization. This record establishes the constraint
intent only.

### 3.5 Duplicate/Replayed Provider Events Must Be Idempotent

**PROPOSED:** When a Stripe webhook event is received:

1. The event's `provider_event_id` (the Stripe event ID) must be checked against
   `system.idempotency_keys` before any database state mutation.
2. If the event has already been processed (idempotency key COMPLETED), the
   handler must return a success response to Stripe without re-applying any
   state mutation.
3. A replayed PROCESSING→PAID webhook must not create a second `CLIENT_PAYMENT`
   Financial Ledger entry.
4. A replayed PAID→REFUNDED webhook must not create a second `PAYMENT_REFUND`
   Financial Ledger entry.

**PROPOSED:** The idempotency key for webhook handling is scoped to the provider
event ID and the organization, using `system.idempotency_keys` per DR 0002 D4.

### 3.6 Do Not Create a New Order on Payment Failure

**PROPOSED:** A FAILED payment attempt does not trigger the creation of a new
Order. The Order created upon Quote acceptance (DR 0046) persists in ACTIVE
status regardless of payment attempt outcomes.

One accepted Quote → one Order. Payment failure is a payment-level event, not
an Order-level event. Creating a new Order on payment failure would violate
the 1:1 Quote-to-Order constraint in the schema (`orders.quote_id UNIQUE`).

### 3.7 No Automatic Payment Retry

**PROPOSED:** DREXONYX V1 does not automatically retry failed payments. Retry
is an explicit client-initiated action. No background job, scheduled task, or
webhook handler automatically creates a new payment attempt on failure.

Automated retry logic is DEFERRED (§6 item 1).

---

## 4. Schema Implications

**PROPOSED (not authorizing schema changes):**

This decision implies the following schema changes:

**Gap 1 — Partial unique index on `financial.payments`**

```sql
CREATE UNIQUE INDEX payments_order_one_paid
  ON financial.payments (order_id)
  WHERE (status = 'PAID');
```

This prevents double-payment at the database level while allowing multiple
non-PAID records per Order.

**Gap 2 — `provider_event_id` field for idempotency**

The `financial.payments` table requires a `provider_event_id` field (also
identified in Phase 07 PLAN gap analysis) to enable webhook idempotency checks
at the payment record level. The `system.idempotency_keys` table is the
canonical idempotency mechanism (DR 0002 D4); `provider_event_id` is an
additional lookup field for webhook reconciliation.

**PROPOSED:** No schema change is authorized by this record. Schema migrations
require separate authorization per the source-of-truth hierarchy in CLAUDE.md.

---

## 5. Financial Boundary

**PROPOSED (reaffirming DR 0001 §6, DR 0052):**

- FAILED payment attempt: no Financial Ledger entry is created. FAILED is a
  payment-level operational event, not a financial event.
- Retry (new PENDING payment): no Financial Ledger entry at creation.
- Duplicate/replayed PAID webhook: no additional Financial Ledger entry is
  created (idempotency per §3.5).
- PAID payment (first confirmed): one `CLIENT_PAYMENT` Financial Ledger entry
  per DR 0052.

At most one `CLIENT_PAYMENT` entry exists per Order. The partial unique index
(§4 Gap 1) and idempotency mechanism (§3.5) both protect against this
invariant being violated.

---

## 6. Deferred Items

1. **Automated payment retry logic** — DREXONYX V1 does not implement
   automated retry. If automated retry is needed in a future phase, it requires
   a Decision Record specifying the retry schedule, limits, and failure handling.

2. **Maximum payment attempts per Order** — V1 does not specify a maximum
   retry count. If an operational limit is required (e.g., no more than 3
   attempts per Order), it requires a future Decision Record.

3. **Partial refund retry behavior** — conditioned on DR 0049 (partial refund
   authority, not yet resolved). Not in scope for this record.

4. **Retry UI and client notification** — BUILD-phase UI details.

5. **All deferred items from DR 0001–0047 not addressed here** remain open.

---

## 7. Compatibility with Decision Records 0001–0047

- **DR 0002 D4 (Idempotency):** `system.idempotency_keys` used for webhook
  event idempotency. Consistent.
- **DR 0007 (Order state machine):** FAILED payment does not change Order
  status. No new Order created on failure. Consistent.
- **DR 0046 (Order creation):** One accepted Quote → one Order. Consistent.
- **DR 0047 (Payment status model):** FAILED is terminal per DR 0047. Retry =
  new Payment record. Consistent.
- **DR 0052 (Financial Ledger):** At most one `CLIENT_PAYMENT` per Order,
  enforced by idempotency and partial unique index. Consistent.
- No Decision Record 0001–0047 is modified, reinterpreted, or superseded.

---

## 8. Explicitly Prohibited Assumptions

- Do not assume a FAILED payment may be mutated back to PENDING or PROCESSING —
  it may not (§3.3).
- Do not assume a new Order is created when a payment fails — it is not (§3.6).
- Do not assume DREXONYX automatically retries failed payments — it does not
  in V1 (§3.7).
- Do not assume more than one PAID payment per Order is permitted — the partial
  unique index prevents this (§3.4).
- Do not assume a replayed webhook may create duplicate Financial Ledger entries —
  idempotency prevents this (§3.5).
- Do not assume `payments.idempotency_key` alone is sufficient for webhook-level
  idempotency — `provider_event_id` and `system.idempotency_keys` are also used
  (§3.5, §4).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0047 have been altered, reinterpreted,
  or superseded.

---

## 9. Owner Approval

**This record is PROPOSED and requires explicit Owner approval before any
implementation may proceed.**

No retry logic, webhook handler idempotency implementation, partial unique index
migration, or related BUILD work may begin based on this record until the Owner
approves it.

**No implementation is authorized by approval of this record alone.**
Phase 07 BUILD authorization is a separate, subsequent decision.
