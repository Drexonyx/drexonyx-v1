# Decision Record 0011 — Phase 02 Round 02B: Delivery State Machine

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0010. All remain authoritative and unchanged.

## 1. Context

Delivery is a separate entity (per Round 01 planning and referenced
throughout 0006/0007/0010) representing the handoff of final approved
assets to the client. Campaign (0003) already has `DELIVERY` and `CLOSED`
states; Order (0007) named Delivery (alongside Approval) as a dependency
for its future `ACTIVE` → `COMPLETED` guard; Approval (0010) is now
defined. This record defines Delivery's own narrow execution lifecycle
without duplicating any of those.

## 2. Problem

Delivery needs a state vocabulary that represents preparation, the
delivery mechanism actively making content available, successful
completion, technical failure, and justified cancellation — without
absorbing QC, Approval, Asset, Order, Campaign, or financial concerns
that already belong to other entities.

## 3. Approved Delivery State Machine

```
PREPARING ──> SENDING ──> COMPLETED
    |             |
    |             +──> FAILED
    |             |
    +─────────────+──> CANCELLED
```

**States:** `PREPARING`, `SENDING`, `COMPLETED`, `FAILED`, `CANCELLED`.

This mirrors the shape already established for Production Job (0008:
`QUEUED`→`RUNNING`→terminal) and AI Generation (0009: `REQUESTED`→
`RUNNING`→terminal) — an initial non-executing state, one active-execution
state, and three terminal outcomes — chosen deliberately for internal
consistency across the data model rather than inventing a new shape.

## 4. State Definitions

- **PREPARING** — The Delivery record exists and final deliverable
  content is being assembled/verified. Covers both "preparation" and
  "becoming ready" as one state; readiness is this state's exit
  condition, not a separately persisted state.
- **SENDING** — The delivery mechanism is actively making the content
  available to the client (e.g., transmitting, publishing to an
  access point, generating client-facing access).
- **COMPLETED** — The delivery mechanism successfully made the content
  available; Delivery's own execution responsibility is discharged. This
  is Delivery's own completion fact only — it never implies Order
  `COMPLETED`, Campaign `CLOSED`, or any financial outcome (see §10, §11,
  §18).
- **FAILED** — The delivery mechanism itself technically failed (e.g., a
  transmission/publishing error). This is a technical/execution failure
  only — never a QC failure, client rejection, production failure, or
  approval rejection (see §7, §12).
- **CANCELLED** — The delivery attempt/process was intentionally called
  off (see §13).

## 5. Allowed Transitions

- `PREPARING` → `SENDING`
- `PREPARING` → `CANCELLED`
- `SENDING` → `COMPLETED`
- `SENDING` → `FAILED`
- `SENDING` → `CANCELLED`

No automatic transitions, no timing/SLA rules, and no expiration state are
introduced — none were justified by anything in the approved baseline.

## 6. Terminal States

`COMPLETED`, `FAILED`, `CANCELLED`. No transitions out of any of these; no
reopening. A new delivery attempt after `FAILED` or `CANCELLED` is a
design question left to §16 (Retry semantics — DEFERRED), not resolved by
reopening the same row.

## 7. Delivery vs. QC Separation

Delivery does not own or reference QC verdicts. `QC_PASSED`, `QC_FAILED`,
and any QC-derived value are not created on Delivery. QC Review (governed
elsewhere) remains the sole authority on quality outcomes; Delivery only
concerns itself with whether the handoff mechanism itself succeeded.

## 8. Delivery vs. Approval Separation

Delivery does not own approval/authorization outcomes. `APPROVED` and
`REJECTED` are not created on Delivery. Approval (Decision Record 0010)
remains the sole entity recording formal decisions. Whether client
acceptance is required before or as part of Delivery is not decided here
— if required, it is an Approval-relationship dependency (see §14, §17),
not a Delivery state.

## 9. Delivery vs. Asset Separation

Delivery references final deliverable Asset(s) through the existing
Asset/Delivery architecture. No duplicate "Delivered Asset" entity and no
new Asset state are created for delivery purposes. The exact DB
relationship/cardinality between Delivery and Asset is **DEFERRED** (see
§16).

## 10. Delivery vs. Order Separation

No Delivery states are added to Order. Order remains governed by its
approved state machine (0007): `ACTIVE`, `COMPLETED`, `CANCELLED`. Order
state does not mirror Delivery state, and Delivery `COMPLETED` does not
by itself set Order `COMPLETED` (see §17).

## 11. Delivery vs. Campaign Separation

Campaign's own state machine (0003), including its `DELIVERY` and
`CLOSED` states, is not redefined by this record. `Delivery COMPLETED →
Campaign CLOSED` is not automatically asserted — this relationship, if
any, is a future orchestration dependency and remains **DEFERRED**.

## 12. Failure Semantics

`FAILED` represents a delivery execution/technical failure only — never
QC failure, client rejection, production failure, or approval rejection.
No automatic retry semantics are invented. Whether a retry reuses the
same Delivery record or requires a new one is not decided with sufficient
authority here and is recorded as **DEFERRED** (see §16).

## 13. Cancellation Semantics

`CANCELLED` represents an intentional termination of the Delivery
attempt/process. Not invented by this record: automatic Order
cancellation, automatic Campaign cancellation, automatic refund,
automatic financial reversal, automatic provider-credit reversal, or
automatic asset deletion. Authorization and side effects remain
**DEFERRED**.

## 14. Client Delivery Semantics

Distinguished conceptually:
- **Delivery prepared** — `PREPARING`.
- **Delivery made available/sent** — `SENDING`, resolving to `COMPLETED`
  on success.
- **Client access** — not itself a Delivery state; whether/how client
  access is tracked is **DEFERRED**.
- **Client acceptance** — not made part of Delivery. `DELIVERY_APPROVED`,
  `CLIENT_APPROVED`, and `FINAL_APPROVAL` are not created inside Delivery,
  since Approval is already a separate entity (0010). If client acceptance
  is ever required for Order completion, it is identified as an
  Approval-relationship dependency, with exact orchestration **DEFERRED**
  (see §17).

## 15. Partial Delivery Analysis

Nothing in the accessible approved baseline (no Constitution text has
ever been available to this project — a standing fact, not new to this
record) explicitly requires partial delivery support in V1. **Partial
delivery semantics: DEFERRED.**

## 16. Multiple-Delivery Analysis

Whether an Order may have multiple Delivery records is not decided by any
prior approved record. **Cardinality: DEFERRED.** Related and also
deferred: exact Delivery → Asset cardinality, retry semantics (new record
vs. reuse), and delivery-attempt lineage.

## 17. Order Completion Dependency

Decision Record 0007 identified Delivery and Approval as dependencies for
the future Order `ACTIVE` → `COMPLETED` guard; Decision Record 0010 has
now defined Approval. This record identifies the Delivery-side
information such a guard would eventually consult: whether a Delivery
associated with the Order has reached `COMPLETED`. This record does
**not** finalize that guard. Not decided here: the exact required
Delivery state combination, the exact required Approval target, the
number of required Deliveries or Approvals, whether every Order requires
a Delivery, whether partial delivery is allowed, or whether one Delivery
can cover multiple Assets. All remain **DEFERRED**.

## 18. Financial Separation

Delivery state never itself implies revenue, payment success, profit,
owner settlement, refund, or financial completion. Financial consequences
remain controlled exclusively by the Financial System and its
authoritative ledger (Financial Ledger, per prior records).

## 19. Security / Tenant Boundary

Delivery belongs to the appropriate tenant context (inheriting
`organization_id` via the composite-FK pattern established in Decision
Record 0002, D1, unchanged here). Client access must be server-
authorized; frontend visibility is never authorization. No RLS or
authorization code is implemented by this record.

## 20. Rejected Alternatives

Explicitly rejected as Delivery states or values: `QC_PASSED`,
`QC_FAILED`, `APPROVED`, `REJECTED`, `REVISION_REQUIRED`, `PRODUCTION`,
`PAYMENT_PENDING`, `PAID`, `REFUNDED`, `DELIVERY_APPROVED`,
`CLIENT_APPROVED`, `FINAL_APPROVAL`, a separate `READY` state distinct
from `PREPARING`'s exit condition, an expiration state (no justification
found), and a duplicate "Delivered Asset" entity.

## 21. Consequences

This design:

- Preserves separation of concerns from QC, Approval, Asset, Order,
  Campaign, and financial entities.
- Mirrors the established `<initial> → <active> → {terminal outcomes}`
  shape already used for Production Job (0008) and AI Generation (0009),
  keeping the overall data model internally consistent.
- Keeps Delivery's own completion fact strictly local — no automatic
  cascade to Order, Campaign, or financial state.
- Leaves client-acceptance semantics to a future Approval-relationship
  decision rather than inventing them here.
- Provides the conceptual dependency needed for the future Order
  completion guard without finalizing it.
- Leaves retry, lineage, and multi-delivery cardinality open rather than
  inventing a versioning or lineage scheme not supported by prior
  decisions.

## 22. Deferred Decisions

1. Exact Delivery → Asset cardinality.
2. Whether an Order can have multiple Deliveries.
3. Partial delivery semantics.
4. Retry semantics (new Delivery record vs. reuse).
5. Delivery attempt lineage.
6. Exact delivery completion criteria (beyond "mechanism succeeded").
7. Client access/acknowledgement semantics.
8. Whether client acknowledgement is required.
9. Exact Approval ↔ Delivery relationship.
10. Exact Order `ACTIVE` → `COMPLETED` guard.
11. Exact Campaign `DELIVERY` → `CLOSED` orchestration.
12. Cancellation authorization.
13. Cancellation side effects.
14. Failure recovery behavior.
15. Exact database implementation.
16. Exact `CHECK` constraints.
17. Tenant/RLS implementation.
18. Idempotency implementation (delivery creation/completion/callback
    operations may require idempotent handling where applicable — noted
    as a requirement only, not implemented).
19. Storage/download/access mechanics.

## Consistency with Decision Records 0001–0010

- Consistent with 0001/0002: UUID identity, tenant scoping via
  `organization_id` and the composite-FK pattern (D1), `TEXT`+`CHECK`
  state representation (D8), archive via `status`+`archived_at` (D5), and
  the financial separations.
- Consistent with 0003 (Campaign): does not redefine Campaign's `DELIVERY`
  or `CLOSED` states.
- Consistent with 0006 (Asset): no duplicate "Delivered Asset" entity, no
  new Asset state added for delivery.
- Consistent with 0007 (Order): Delivery is named as a dependency for the
  Order completion guard without this record defining that guard; Order's
  own state machine is unmodified.
- Consistent with 0008 (Production Job) and 0009 (AI Generation): reuses
  their proven initial→active→terminal shape for internal consistency.
- Consistent with 0010 (Approval): does not create `DELIVERY_APPROVED`/
  `CLIENT_APPROVED`/`FINAL_APPROVAL` inside Delivery, deferring to
  Approval as the separate entity for authorization decisions.
- No Decision Record 0001–0010 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume any transition not explicitly listed above is valid.
- Do not assume `COMPLETED`, `FAILED`, or `CANCELLED` can be reopened.
- Do not assume Delivery `COMPLETED` implies Order `COMPLETED`, Campaign
  `CLOSED`, financial settlement, or payment success.
- Do not assume Delivery has any QC, Approval, Asset, Order, or financial
  state values.
- Do not assume client acceptance is part of Delivery's own state.
- Do not assume Delivery → Asset cardinality, multi-delivery cardinality,
  retry semantics, or lineage have been decided.
- Do not assume the Order `ACTIVE` → `COMPLETED` guard or the Campaign
  `DELIVERY` → `CLOSED` orchestration has been finalized.
- Do not assume idempotency has been implemented.
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0010 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
