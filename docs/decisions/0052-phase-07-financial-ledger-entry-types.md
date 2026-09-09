# Decision Record 0052 — Phase 07: Financial Ledger Entry Types

- **Decision Round:** Phase 07
- **Phase:** 07 — Payments & Orders
- **Status:** APPROVED — Owner approved 2026-09-04. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-04
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 07 PLAN blocker: "DR 0052 — Financial Ledger Entry Types
  (what `entry_type` values are canonical for payment events)."
- **Relationship to prior records:** Does not modify Decision Records 0001–0051.
  All remain authoritative and unchanged. This record is the first Decision
  Record to authorize writes to `financial.financial_ledger` — all prior records
  treating the Financial Ledger as read-only pre-sale infrastructure (DR 0043
  §15: "neither Cost Check nor Margin Check writes a Financial Ledger entry").
  Depends on DR 0044 (Stripe), DR 0045 (checkout/redirect architecture),
  DR 0047 (payment status model), DR 0048 (payment retry and idempotency).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0051. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (verified schema, `financial.financial_ledger`):** The Financial Ledger
is an append-only table. Its columns include `entry_type`, `amount`
(NUMERIC 19,4), `currency`, `reference_entity_type`, `reference_entity_id`,
`description`, `created_at`. The `entry_type` column is TEXT with no CHECK
constraint in the current schema — the vocabulary of valid entry type values
has not been previously defined in any Decision Record 0001–0051.

**FACT (DR 0001 §6):** The approved conceptual financial architecture flow is:
```
CLIENT PAYMENT → PAYMENT LEDGER → ORDER BUDGET → EXPENSE LEDGER
→ PROVIDER CREDITS → PROFIT CALCULATION → RESERVES
→ DISTRIBUTABLE PROFIT → OWNER SETTLEMENT
```
Approved separations: Payment ≠ Revenue, Provider Credit ≠ Cash/Profit,
Order Budget ≠ Profit, Profit ≠ Owner Settlement.

**FACT (DR 0043 §15):** "Neither the Cost Check nor the Margin Check is a
financial event. Both are pre-sale read-only evaluations. They do NOT write a
Financial Ledger entry."

**FACT (DR 0047 §3.6):** Payment status transitions that create Financial
Ledger entries (informational, conditioned on this record):
- PROCESSING→PAID: `CLIENT_PAYMENT`
- PAID→REFUNDED: `PAYMENT_REFUND`
- PAID→CHARGEBACK: `PAYMENT_CHARGEBACK`

**FACT (Phase 07 PLAN):** Phase 07 is the first phase in which Financial
Ledger writes occur. No prior phase has written to `financial.financial_ledger`.

---

## 2. Problem

No Decision Record 0001–0051 defines:

1. What values are valid for `financial.financial_ledger.entry_type` in V1.
2. Which payment events create ledger entries.
3. How many ledger entries each event creates.
4. Whether entry types like PAYMENT_FEE or REVENUE_RECOGNIZED are in scope for
   Phase 07.

Implementing the webhook handler's ledger write logic without this decision
would require inventing entry type vocabulary — a violation of CLAUDE.md's
prohibition on inventing scope.

---

## 3. Decision

**PROPOSED (Owner instruction, Phase 07 pre-BUILD):**

### 3.1 V1 Approved Financial Ledger Entry Types for Payment Events

**PROPOSED:** The following three entry types are approved for V1 Phase 07:

| Entry Type | Trigger Event | Multiplicity |
|---|---|---|
| `CLIENT_PAYMENT` | Payment reaches PAID (verified webhook) | Exactly once per PAID payment |
| `PAYMENT_REFUND` | Payment reaches REFUNDED (verified full refund webhook) | Exactly once per REFUNDED payment |
| `PAYMENT_CHARGEBACK` | Payment reaches CHARGEBACK (verified chargeback webhook) | Exactly once per CHARGEBACK payment |

No other entry types for payment events are approved in Phase 07.

### 3.2 CLIENT_PAYMENT — Write Rule

**PROPOSED:** A `CLIENT_PAYMENT` entry must be written to `financial.financial_ledger`
exactly once when a verified provider webhook event confirms a payment has
reached PAID status.

Invariants:
- Exactly one `CLIENT_PAYMENT` entry per PAID payment record.
- The entry amount is `payments.amount` — the confirmed payment amount.
- The entry is written in the same database transaction as the `payments.status`
  update to PAID.
- If the transaction rolls back, no ledger entry is committed.
- Idempotency: a replayed webhook for an already-PAID payment must not create
  a second `CLIENT_PAYMENT` entry (DR 0048 §3.5).

**PROPOSED:** `CLIENT_PAYMENT` does not constitute revenue recognition.
Payment ≠ Revenue (DR 0001 §6). The CLIENT_PAYMENT entry records that a client
payment was received; it is not a revenue recognition or profit event.

### 3.3 PAYMENT_REFUND — Write Rule

**PROPOSED:** A `PAYMENT_REFUND` entry must be written to
`financial.financial_ledger` exactly once when a verified provider webhook event
confirms a full refund has been processed.

Invariants:
- Exactly one `PAYMENT_REFUND` entry per REFUNDED payment record.
- The entry amount is the refunded amount (full refund in V1).
- The entry is written in the same database transaction as the `payments.status`
  update to REFUNDED.
- Idempotency applies: a replayed refund webhook must not create a second entry.

**PROPOSED:** `PAYMENT_REFUND` is used for verified full refunds only in V1.
Partial refunds are DEFERRED pending DR 0049 resolution (§7 item 1).

### 3.4 PAYMENT_CHARGEBACK — Write Rule

**PROPOSED:** A `PAYMENT_CHARGEBACK` entry must be written to
`financial.financial_ledger` exactly once when a verified provider webhook event
confirms a chargeback.

Invariants:
- Exactly one `PAYMENT_CHARGEBACK` entry per CHARGEBACK payment record.
- The entry amount is the chargebacked amount.
- The entry is written in the same database transaction as the `payments.status`
  update to CHARGEBACK.
- Idempotency applies: a replayed chargeback webhook must not create a second entry.

### 3.5 PAYMENT_FEE and REVENUE_RECOGNIZED Are NOT Introduced in Phase 07

**PROPOSED:** The following entry types are explicitly excluded from Phase 07:

- `PAYMENT_FEE` (Stripe processing fees, interchange, etc.)
- `REVENUE_RECOGNIZED`
- Any equivalent fee-capture or revenue-recognition entry type

Rationale for exclusion:
- Payment ≠ Revenue (DR 0001 §6). Introducing REVENUE_RECOGNIZED would require
  a separate revenue recognition policy, timing rules, and accounting treatment
  that have not been decided by any Decision Record 0001–0051.
- PAYMENT_FEE would require a mechanism for retrieving Stripe's fee breakdown
  from provider API or webhook data, and a policy decision on how fees affect
  the financial model. This is not in Phase 07 scope.

Both are DEFERRED to a future phase requiring their own Decision Records.

### 3.6 Financial Separation Preservation

**PROPOSED (reaffirming DR 0001 §6):**

The entry types in this record preserve the approved financial separations:

| Separation | How Preserved |
|---|---|
| Payment ≠ Revenue | `CLIENT_PAYMENT` records receipt of client funds; it is not a revenue recognition event. Revenue recognition requires a separately decided policy. |
| Provider Credit ≠ Cash/Profit | No provider credit entry type is introduced. Provider Credit lifecycle is post-production and DEFERRED. |
| Order Budget ≠ Profit | Financial Ledger entries (CLIENT_PAYMENT, PAYMENT_REFUND, PAYMENT_CHARGEBACK) are not profit entries. They record cash movement, not profit. |
| Profit ≠ Owner Settlement | No profit calculation or owner settlement entry type is introduced in Phase 07. These remain post-production computed values. |

### 3.7 Atomicity and Idempotency Requirements

**PROPOSED:**

Each Financial Ledger entry must be written in the same atomic database
transaction as the corresponding `payments.status` update:

- The `payments.status` update and the Financial Ledger write succeed together
  or roll back together.
- A committed PAID status with no corresponding `CLIENT_PAYMENT` entry is not
  permitted.
- A `CLIENT_PAYMENT` entry with no corresponding committed PAID payment is not
  permitted.

**PROPOSED:** The idempotency mechanism (DR 0002 D4, DR 0048 §3.5) prevents
duplicate Financial Ledger entries from replayed webhook events. The
`system.idempotency_keys` check precedes the transaction that writes both the
payment status update and the Financial Ledger entry.

### 3.8 Reference Entity for Ledger Entries

**PROPOSED:** Financial Ledger entries referencing payment events use:

```
reference_entity_type = 'payment'
reference_entity_id   = payments.id
```

This follows the polymorphic reference model of the Financial Ledger
(consistent with `system.audit_events` polymorphic model in DR 0002 §6).

---

## 4. Schema Implications

**PROPOSED (not authorizing schema changes):**

The approved entry type vocabulary in §3.1 implies that a CHECK constraint on
`financial.financial_ledger.entry_type` could be added to enforce the canonical
vocabulary. The current schema has no such CHECK constraint.

**PROPOSED:** Whether to add a CHECK constraint or enforce via application-level
validation is a BUILD-phase implementation detail. This record establishes the
canonical vocabulary; the enforcement mechanism is determined at BUILD time.

**PROPOSED:** No schema change is authorized by this record. Any schema
migration requires separate authorization per the source-of-truth hierarchy
in CLAUDE.md.

---

## 5. Complete Phase 07 Financial Ledger Write Map

**PROPOSED (summary of approved writes for Phase 07):**

| Event | Ledger Entry Type | Amount | Authorized By |
|---|---|---|---|
| Payment reaches PAID (webhook) | `CLIENT_PAYMENT` | `payments.amount` | §3.2 |
| Payment reaches REFUNDED (webhook) | `PAYMENT_REFUND` | Refunded amount | §3.3 |
| Payment reaches CHARGEBACK (webhook) | `PAYMENT_CHARGEBACK` | Chargebacked amount | §3.4 |
| Quote accepted (SENT→ACCEPTED) | None | — | DR 0046 §6 |
| Order created | None | — | DR 0046 §6 |
| Order Budget initialized | None | — | DR 0046 §6 |
| Payment created (PENDING) | None | — | §3.1 |
| PENDING→PROCESSING | None | — | §3.1 |
| PROCESSING→FAILED | None | — | §3.1 |
| Cost Check / Margin Check | None | — | DR 0043 §15 |

All other Financial Ledger writes (expenses, reserves, provider credits,
owner settlements) remain post-production and are not authorized in Phase 07.

---

## 6. Financial Boundary — Explicit Prohibitions

**APPROVED:**

Phase 07 Financial Ledger writes are limited to the three entry types in §3.1.
The following may NOT be written to `financial.financial_ledger` in Phase 07:

- REVENUE_RECOGNIZED — not in V1 Phase 07 scope (§3.5).
- PAYMENT_FEE — not in V1 Phase 07 scope (§3.5).
- EXPENSE entries — post-production events; not triggered by payment.
- PROVIDER_CREDIT entries — post-production events; not triggered by payment.
- RESERVE entries — post-production events; not triggered by payment.
- OWNER_SETTLEMENT entries — post-production events; not triggered by payment.
- PROFIT entries — computed values, not written as ledger events.

---

## 7. Deferred Items

1. **Partial refund Financial Ledger treatment** — conditioned on DR 0049
   (partial refund authority, not yet resolved). V1 PAYMENT_REFUND covers
   full refunds only.
2. **PAYMENT_FEE** — Stripe processing fee capture. DEFERRED to a future phase
   with its own Decision Record.
3. **REVENUE_RECOGNIZED** — revenue recognition policy, timing, and treatment.
   DEFERRED. Requires accounting treatment decision.
4. **CHECK constraint on `entry_type`** — whether to enforce via schema CHECK
   or application validation. BUILD-phase implementation detail.
5. **Expense entries for provider AI/production costs** — post-production;
   out of Phase 07 scope. DEFERRED.
6. **Reserve allocation entries** — post-production; out of Phase 07 scope. DEFERRED.
7. **Owner Settlement entries** — post-production; out of Phase 07 scope. DEFERRED.
8. **All deferred items from DR 0001–0051 not addressed here** remain open.

---

## 8. Compatibility with Decision Records 0001–0051

- **DR 0001 §6 (Financial architecture):** `CLIENT_PAYMENT` is a payment
  ledger event, not revenue recognition. Financial separations preserved
  (§3.6). Consistent.
- **DR 0002 §6, §7 (Audit, Immutability):** Financial Ledger is append-only;
  entries are immutable post-commit. Consistent.
- **DR 0002 D4 (Idempotency):** Replayed webhooks must not create duplicate
  entries. `system.idempotency_keys` applied. Consistent.
- **DR 0043 §15 (Financial boundary):** Cost/Margin Check do not write ledger
  entries. Unchanged. Consistent.
- **DR 0046 §6 (Quote acceptance boundary):** Quote acceptance does not create
  ledger entries. Consistent.
- **DR 0047 §3.6 (Payment status and ledger):** Status transitions mapped to
  entry types in this record. Consistent.
- **DR 0048 §3.5 (Idempotency):** Idempotency prevents duplicate ledger entries.
  Consistent.
- No Decision Record 0001–0051 is modified, reinterpreted, or superseded.

---

## 9. Explicitly Prohibited Assumptions

- Do not assume `REVENUE_RECOGNIZED` is a Phase 07 entry type — it is
  explicitly excluded (§3.5).
- Do not assume `PAYMENT_FEE` is a Phase 07 entry type — it is explicitly
  excluded (§3.5).
- Do not assume `CLIENT_PAYMENT` constitutes revenue recognition — it does not
  (§3.2).
- Do not assume more than one `CLIENT_PAYMENT` entry per PAID payment is
  permitted — exactly one per payment (§3.2).
- Do not assume Quote acceptance or Order creation triggers a ledger entry —
  they do not (§5).
- Do not assume `PAYMENT_REFUND` covers partial refunds in V1 — full refunds
  only pending DR 0049 (§7 item 1).
- Do not assume this record authorizes any schema changes, migrations, code
  changes, commits, or pushes.
- Do not assume Decision Records 0001–0051 have been altered, reinterpreted,
  or superseded.

---

## 10. Owner Approval

**This record is PROPOSED and requires explicit Owner approval before any
implementation may proceed.**

No Financial Ledger write code, webhook handler ledger integration, or related
BUILD work may begin based on this record until the Owner approves it.

**No implementation is authorized by approval of this record alone.**
Phase 07 BUILD authorization is a separate, subsequent decision.
