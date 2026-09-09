# Decision Record 0007 — Phase 02 Round 02B: Order State Machine

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001, 0002, 0003, 0004, 0005, or 0006. All remain authoritative and
  unchanged.

## Scope

This record captures the Owner-approved Order lifecycle state machine
only: states, transitions, terminal-state behavior, and the state-
separation boundaries against Payment, Production, QC, Approval,
Delivery, Campaign, and Order Budget. Nothing is implemented, installed,
configured, migrated, or provisioned as a result of this record.

## APPROVED — Order States

- `ACTIVE`
- `COMPLETED`
- `CANCELLED`

## APPROVED — State Definitions

- **ACTIVE** — The Order exists and the commercial/fulfillment engagement
  is open. Fulfillment may be not started, in progress, under QC, awaiting
  approval, or undergoing revisions. Those detailed lifecycle states
  belong to their respective entities and are not duplicated on Order.
- **COMPLETED** — All required deliverables for the Order have concluded
  successfully, subject to completion guard mechanics that remain
  deferred.
- **CANCELLED** — The commercial engagement was terminated before or
  during fulfillment.

## APPROVED — Transitions

- `ACTIVE` → `COMPLETED`. Guard: required Delivery/Approval conditions
  must be satisfied. The exact guard mechanics are **DEFERRED** because
  the Delivery and Approval state machines have not yet been
  designed/approved.
- `ACTIVE` → `CANCELLED`. Guard: business decision / authorized actor.
  Exact actor and authorization rules are **DEFERRED**.
- `COMPLETED` → anything: **not allowed**.
- `CANCELLED` → anything: **not allowed**.

`COMPLETED` and `CANCELLED` are terminal. An Order is never reopened after
reaching either terminal state.

## APPROVED — Payment Separation

- No Payment states are added to Order.
- `PENDING_PAYMENT`, `PAID`, `PAYMENT_FAILED`, `REFUNDED`, `CHARGEBACK`
  remain Payment concerns.
- Order status must never be used to infer Payment status. Payment status
  must never be duplicated into Order status.

## APPROVED — Production Separation

- `PRODUCTION_READY` and `IN_PRODUCTION` are not added.
- Production execution belongs to Production Job.
- Order remains `ACTIVE` throughout production and revision cycles.
- Production readiness is a guard/eligibility condition, not an Order
  state.

## APPROVED — QC Separation

- `QC` is not added as an Order state.
- QC Review owns QC verdicts; Order does not duplicate QC state.

## APPROVED — Approval / Delivery Separation

- `CLIENT_PREVIEW`, `REVISION`, `FINAL_APPROVAL`, `DELIVERY`, `CLOSED` are
  not added to Order.
- These belong to Campaign, Approval, and Delivery per the already-
  approved architecture.
- Order deliberately uses `COMPLETED` rather than `CLOSED` to avoid
  duplicating Campaign's `CLOSED` state (Decision Record 0003).

## APPROVED — Revision Rule

- Revision cycles do not change Order state.
- The Order remains `ACTIVE` while underlying production/revision/QC
  cycles occur.
- Order does not track revision count or production phase.

## APPROVED — Cancellation / Refund Boundary

- `CANCELLED` is an Order-level commercial fact.
- Cancellation does not automatically imply: refund, financial reversal,
  deletion of financial history, deletion of production history, or
  reversal of provider-credit consumption.
- Any resulting financial consequence is represented through separate
  financial/payment events per the approved financial architecture.
  Financial history remains additive/immutable per the approved financial
  principles.

## APPROVED — Campaign Relationship

- Campaign's `ORDERED` state means an Order has been created. Campaign
  `ORDERED` and Order `ACTIVE` are separate concepts and are not merged
  into one state.
- Decision Record 0003 (Campaign State Machine) is not changed by this
  record.
- The exact rule for when Campaign `CLOSED` may depend on its Orders
  remains **DEFERRED**.

## APPROVED — Order Budget Relationship

- Order → Order Budget remains 1:1 (unchanged from Decision Record 0002).
- Order Budget tracks planned/estimated/actual internal spend.
- Order status does not represent budget health, over-budget status,
  profit, or remaining budget. No `OVER_BUDGET` or similar Order state is
  added.

## APPROVED — Payment / Production Eligibility Rule

- `READY` and `PAID` are not Order states.
- Whether an Order is eligible to begin production is determined from the
  authoritative conditions of the relevant systems at the time of
  execution — Payment status is never cached or mirrored as an Order
  state.

## APPROVED — Archiving

- `ARCHIVED` is not created as an Order state.
- Archiving remains `status` + `archived_at`, consistent with Decision
  Record 0002, D5.

## Rejected States

The following candidates were explicitly considered and rejected for
Order state:

`PENDING_PAYMENT`, `PAID`, `PAYMENT_FAILED`, `REFUNDED`, `CHARGEBACK`,
`PRODUCTION_READY`, `IN_PRODUCTION`, `QC`, `CLIENT_PREVIEW`, `REVISION`,
`FINAL_APPROVAL`, `DELIVERY`, `CLOSED`, `CREATED`, `ON_HOLD`.

Reasons: Payment states belong to Payment. Production states belong to
Production Job. QC belongs to QC Review. Client Preview / Revision /
Final Approval / Delivery belong to their respective lifecycle entities.
`CLOSED` belongs to Campaign. `CREATED` is folded into `ACTIVE`. `ON_HOLD`
is not an approved V1 requirement and is not invented here.

## Deferred / Unresolved Items

The following remain explicitly unresolved and must not be treated as
decided:

1. Exact `ACTIVE` → `COMPLETED` guard mechanics, pending Delivery and
   Approval state-machine design.
2. Exact Quote `ACCEPTED` → Client Approval → Order creation
   orchestration, including actor/system responsibility.
3. Whether Campaign `CLOSED` requires all Campaign Orders to be
   `COMPLETED`.
4. Exact handling of in-flight Production Jobs when an Order is
   `CANCELLED`.
5. Exact handling of consumed Provider Credits when an Order is
   `CANCELLED`.
6. Exact handling of partially delivered Assets when an Order is
   `CANCELLED`.
7. Exact actor/role authorization for `ACTIVE` → `CANCELLED`.
8. Whether a future `ON_HOLD`/suspended state will ever be required.
9. Exact database implementation.
10. Exact PostgreSQL `CHECK` implementation.
11. Exact tenant/RLS implementation.

## Architectural Consequences

- The `order.status` column (per Decision Record 0002, D8: `TEXT` +
  `CHECK`, no native `ENUM`) will validate against exactly the 3 values
  above once the `CHECK` constraint is implemented — implementation is not
  performed by this record.
- Order's `archived_at` column (per Decision Record 0002, D5) remains
  fully independent of `status`.
- Any future guard implementing `ACTIVE → COMPLETED` must query Delivery
  and Approval directly rather than relying on any Order-side cache of
  their status.
- Any future cancellation-handling logic must treat financial and
  production consequences as separate, additive records, never as
  mutations of existing history.
- Campaign, Payment, Production Job, QC Review, Approval, Delivery, and
  Order Budget each remain the sole source of truth for their own state;
  Order's `status` column is not a substitute for querying any of them.

## Explicitly Prohibited Assumptions

- Do not assume any transition not explicitly listed above is valid.
- Do not assume `COMPLETED` or `CANCELLED` can be reopened.
- Do not assume Order has any Payment, Production, QC, Approval,
  Delivery, or budget-health state values.
- Do not assume Order status reflects Payment status, production phase,
  QC outcome, approval outcome, delivery outcome, or budget health.
- Do not assume cancellation implies refund, financial reversal, or
  deletion of any history.
- Do not assume the `ACTIVE → COMPLETED` guard mechanics, the Order
  creation orchestration, or the Campaign-closure dependency on Orders
  have been decided.
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001, 0002, 0003, 0004, 0005, or 0006
  have been altered, reinterpreted, or superseded — all remain
  authoritative and unchanged.
