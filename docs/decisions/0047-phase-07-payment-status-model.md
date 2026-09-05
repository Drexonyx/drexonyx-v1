# Decision Record 0047 — Phase 07: Payment Status Model

- **Decision Round:** Phase 07
- **Phase:** 07 — Payments & Orders
- **Status:** APPROVED — Owner approved 2026-09-04. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-04
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 07 PLAN blocker: "DR 0047 — Payment Status Model
  (PROCESSING state in schema)." The current `financial.payments` schema CHECK
  constraint does not include `PROCESSING`. This record resolves that gap.
- **Relationship to prior records:** Does not modify Decision Records 0001–0046.
  All remain authoritative and unchanged. This record supplements the existing
  `financial.payments` schema by resolving the complete V1 payment status
  lifecycle, including the missing PROCESSING state. Depends on DR 0044
  (Stripe selected) and DR 0045 (redirect checkout architecture, authoritative
  webhook-based state).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0046. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (verified schema, `financial.payments`):** The `payments` table has:
```
status TEXT NOT NULL CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED','CHARGEBACK'))
```
The current CHECK constraint includes five values: PENDING, PAID, FAILED,
REFUNDED, CHARGEBACK. It does not include PROCESSING.

**FACT (Phase 07 PLAN):** The portal Payments page (`app/portal/payments/page.tsx`)
includes a badge mapping for `PROCESSING` with the `badgeAccent` style. This
mapping exists in the portal UI but the status value is not present in the
schema CHECK constraint. There is a gap between the UI expectation and the
schema enforcement.

**FACT (DR 0045):** The Stripe-hosted Checkout architecture (redirect) means:
- A payment record exists in PENDING state before the client is redirected to Stripe.
- The client completes or fails the payment on Stripe's hosted page.
- DREXONYX receives the authoritative payment result via Stripe webhook.
- Client redirects back to DREXONYX are informational only.

**FACT (DR 0007):** Payment state must not be reflected on the Order record.
The Order has three states: ACTIVE, COMPLETED, CANCELLED. Payment status
lifecycle is entirely within `financial.payments`.

---

## 2. Problem

The current schema does not include PROCESSING in the `payments.status` CHECK
constraint. Phase 07 requires a PROCESSING state to represent the period
between:

1. The client being redirected to Stripe's hosted checkout page (payment
   processing has begun from the provider's perspective).
2. DREXONYX receiving the authoritative Stripe webhook confirming PAID or FAILED.

Without PROCESSING, the status lifecycle has a semantic gap: a PENDING payment
record persists while the client is actively completing checkout on Stripe,
with no status differentiation between "not yet started" and "actively being
processed by the provider."

Additionally, this record must establish the complete V1 lifecycle — all valid
status transitions — to prevent implementation from assuming transitions that
are not approved.

---

## 3. Decision

**PROPOSED (Owner instruction, Phase 07 pre-BUILD):**

### 3.1 Add PROCESSING to the V1 Payment Status Model

**PROPOSED:** The V1 payment status model includes six states:

```
PENDING | PROCESSING | PAID | FAILED | REFUNDED | CHARGEBACK
```

This requires amending the `financial.payments.status` CHECK constraint from
its current five-value form to six values. This is a schema migration item
conditioned on BUILD authorization.

### 3.2 V1 Status Lifecycle

**PROPOSED:** The approved V1 payment status transitions are:

```
PENDING → PROCESSING → PAID
PENDING → PROCESSING → FAILED
PAID    → REFUNDED
PAID    → CHARGEBACK
```

No other transitions are approved in V1. Specifically:
- PROCESSING does not transition back to PENDING.
- FAILED does not transition to PAID (retry = new Payment record per DR 0048).
- REFUNDED does not transition back to PAID.
- CHARGEBACK does not transition back to PAID.
- PENDING does not transition directly to PAID (must pass through PROCESSING).
- PENDING does not transition directly to FAILED (must pass through PROCESSING).

### 3.3 State Definitions

**PROPOSED:**

| Status | Definition |
|---|---|
| `PENDING` | A payment record has been created. The client has not yet been redirected to the provider checkout, or the redirect has not yet been confirmed as initiated. Provider checkout has not been confirmed as started. |
| `PROCESSING` | The provider checkout session is active or has been completed by the client. DREXONYX is awaiting the authoritative webhook confirmation from the provider. No authoritative payment outcome is yet confirmed. |
| `PAID` | The provider has confirmed payment completion via a verified server-side webhook event. The payment is authoritative and final. A `CLIENT_PAYMENT` Financial Ledger entry exists. |
| `FAILED` | The provider has confirmed payment failure via a verified server-side webhook event. No Financial Ledger entry was created for this payment attempt. The Order remains ACTIVE; retry creates a new Payment record. |
| `REFUNDED` | A verified full refund has been processed via an authoritative provider event. A `PAYMENT_REFUND` Financial Ledger entry exists. |
| `CHARGEBACK` | A verified chargeback has been received via an authoritative provider event. A `PAYMENT_CHARGEBACK` Financial Ledger entry exists. |

### 3.4 PROCESSING State — When and How It Is Set

**PROPOSED:** The PROCESSING transition (PENDING→PROCESSING) occurs when
DREXONYX has confirmed that the client has been redirected to the Stripe-hosted
Checkout Session. The exact mechanism — whether set at Stripe Checkout Session
creation time, at redirect, or via a webhook event for session initiation — is
a BUILD-phase implementation detail. The semantic meaning of PROCESSING is
established by §3.3.

**PROPOSED:** The PROCESSING state must not be set by client-side code or
based on client-controlled input. It is set server-side, either at Checkout
Session creation or upon receipt of a Stripe webhook event indicating the
session has been opened or attempted.

### 3.5 PAID, FAILED, REFUNDED, CHARGEBACK Require Authoritative Server-Side Provider Events

**PROPOSED (reaffirming DR 0045 §3.4):**

The following status transitions require an authoritative, verified server-side
provider webhook event:

- PROCESSING → PAID
- PROCESSING → FAILED
- PAID → REFUNDED
- PAID → CHARGEBACK

**PROPOSED:** Client redirects (return URLs from Stripe) must never trigger any
of these transitions. A client arriving at the success URL does not change the
payment status from PROCESSING to PAID. Only a verified Stripe webhook event
with proper HMAC signature verification may trigger these transitions.

### 3.6 Financial Ledger Implications

**PROPOSED (preliminary, conditioned on DR 0052):**

| Status Transition | Financial Ledger Event |
|---|---|
| PENDING → PROCESSING | None |
| PROCESSING → PAID | `CLIENT_PAYMENT` entry created (DR 0052) |
| PROCESSING → FAILED | None |
| PAID → REFUNDED | `PAYMENT_REFUND` entry created (DR 0052) |
| PAID → CHARGEBACK | `PAYMENT_CHARGEBACK` entry created (DR 0052) |

The exact entry type names and write rules are governed by DR 0052. This table
is informational and conditioned on DR 0052 approval.

### 3.7 Order State Is Not Affected by Payment Status

**PROPOSED (reaffirming DR 0007):**

Payment status transitions do not mutate `commercial.orders.status`. The Order
remains ACTIVE regardless of whether a payment attempt is PENDING, PROCESSING,
PAID, or FAILED. Order completion authority is separately deferred (DR 0007).

Production eligibility is determined at query time by whether the Order has a
`payments` record with `status = 'PAID'`, not by Order state.

---

## 4. Schema Implications

**PROPOSED (not authorizing schema changes):**

This decision requires amending the `financial.payments.status` CHECK
constraint. The current constraint:

```sql
status TEXT NOT NULL CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED','CHARGEBACK'))
```

Must be updated to:

```sql
status TEXT NOT NULL CHECK (status IN ('PENDING','PROCESSING','PAID','FAILED','REFUNDED','CHARGEBACK'))
```

**PROPOSED:** No schema change is authorized by this record. The CHECK
constraint amendment requires a migration authorized by separate BUILD
authorization per the source-of-truth hierarchy in CLAUDE.md.

---

## 5. Deferred Items

1. **PENDING→PROCESSING exact trigger mechanism** — whether PROCESSING is set
   at Stripe Checkout Session creation or upon a Stripe session-initiated
   webhook. BUILD-phase implementation detail.
2. **Partial refund status** — whether partial refunds use REFUNDED or a
   distinct PARTIALLY_REFUNDED status. DR 0049 (soft blocker, not yet resolved).
   V1 uses REFUNDED for verified full refunds only.
3. **Dispute status granularity** — CHARGEBACK covers the dispute scenario in V1.
   Finer-grained dispute states (e.g., DISPUTE_OPEN, DISPUTE_LOST) are DEFERRED.
4. **Payment expiry** — if a Checkout Session expires without completion,
   whether this produces a FAILED status or a distinct EXPIRED status. BUILD-phase
   detail; FAILED is the provisional handling unless BUILD determines otherwise.
5. **All deferred items from DR 0001–0046 not addressed here** remain open.

---

## 6. Compatibility with Decision Records 0001–0046

- **DR 0002 D4 (Idempotency):** Status transitions via webhook are idempotent
  via `system.idempotency_keys`. Consistent.
- **DR 0007 (Order state machine):** Payment status does not appear on Order.
  Consistent.
- **DR 0044 (Stripe):** Status vocabulary aligns with Stripe webhook event
  outcomes. Consistent.
- **DR 0045 (Checkout Architecture):** Client redirects do not trigger status
  transitions. Authoritative webhook required. Consistent.
- **DR 0052 (Financial Ledger Entry Types):** Financial Ledger events are
  conditioned on status transitions per §3.6. Consistent.
- **ARCHITECTURE.md:** Server-side only status mutations. Consistent.
- No Decision Record 0001–0046 is modified, reinterpreted, or superseded.

---

## 7. Explicitly Prohibited Assumptions

- Do not assume PENDING may transition directly to PAID without passing through
  PROCESSING — this transition is not approved (§3.2).
- Do not assume FAILED may transition back to PENDING or PROCESSING — it may
  not. Retry = new Payment record per DR 0048.
- Do not assume client redirect return parameters may trigger any status
  transition — they may not (§3.5).
- Do not assume PROCESSING may be set by client-side code — it must not (§3.4).
- Do not assume REFUNDED represents a partial refund — V1 REFUNDED is full
  refunds only pending DR 0049 resolution (§5 item 2).
- Do not assume payment status transitions affect Order status — they do not
  (§3.7).
- Do not assume the schema CHECK constraint already includes PROCESSING —
  it does not; a migration is required (§4).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0046 have been altered, reinterpreted,
  or superseded.

---

## 8. Owner Approval

**This record is PROPOSED and requires explicit Owner approval before any
implementation may proceed.**

No schema migration amending the `payments.status` CHECK constraint, no
webhook handler, no status transition logic, and no related BUILD work may
begin based on this record until the Owner approves it.

**No implementation is authorized by approval of this record alone.**
Phase 07 BUILD authorization is a separate, subsequent decision.
