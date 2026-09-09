# Decision Record 0010 — Phase 02 Round 02B: Approval State Machine

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0009. All remain authoritative and unchanged.

## Scope

This record captures the Owner-approved Approval lifecycle state machine
only: states, transitions, terminal-state behavior, and the
responsibility boundaries against Campaign, Order, Payment, Production
Job, AI Generation, Asset, QC Review, Delivery, and the financial
architecture. Nothing is implemented, installed, configured, migrated, or
provisioned as a result of this record.

## Context

Approval is a separate entity (established in Decision Record 0002, D6)
with a generic target model whose exact target implementation and
approvable target types remain unresolved. This record defines Approval's
own lifecycle without resolving that target model, and without assigning
Approval ownership over any other entity's lifecycle.

## Decision

**Approved design principle:** "Approval records the formal decision on a
target. It does not own the lifecycle of the target itself."

### Approved States

- `PENDING`
- `APPROVED`
- `REJECTED`
- `CANCELLED`
- `EXPIRED`

### State Definitions

- **PENDING** — The approval request exists and is awaiting a formal
  decision from the authorized actor.
- **APPROVED** — The target has been formally approved.
- **REJECTED** — The approval request has been formally rejected.
- **CANCELLED** — The approval request was intentionally cancelled before
  completion.
- **EXPIRED** — The approval request reached its expiration condition
  without receiving a final decision.

### Allowed Transitions

- `PENDING` → `APPROVED`
- `PENDING` → `REJECTED`
- `PENDING` → `CANCELLED`
- `PENDING` → `EXPIRED`

### Terminal States

`APPROVED`, `REJECTED`, `CANCELLED`, `EXPIRED`. No transitions out of any
of these. No reopening.

## Target Boundary

Approval does not own the lifecycle of the target it decides on. Approval
is not responsible for: Campaign lifecycle, Order lifecycle, Payment
state, Production Job lifecycle, AI Generation lifecycle, Asset
lifecycle, QC verdict, Delivery lifecycle, or Financial state.

## QC Separation

QC Review owns quality verdicts. Not added to Approval: `QC_PENDING`,
`QC_PASSED`, `QC_FAILED`.

Both of the following are valid simultaneously:
- QC Review = PASS, Approval = PENDING
- QC Review = PASS, Approval = REJECTED

Therefore: `APPROVED` ≠ QC passed, and `REJECTED` ≠ QC failed.

## Asset Separation

Approval does not own Asset states. Not added to Approval: `UPLOADED`,
`PROCESSING`, `READY_FOR_QC`, `CLIENT_PREVIEW`, `REVISION_REQUIRED`. Asset
lifecycle remains owned exclusively by Asset (Decision Record 0006).

## Revision Separation

`REVISION_REQUIRED` is not created as an Approval state. Revision is a
separate concept. When a revised target requires a new approval decision,
a **new** Approval record is created rather than reopening the previous
terminal Approval:

```
Approval #1 → REJECTED
        |
New Production / Asset Version
        |
        v
Approval #2 → PENDING
        |
        v
Approval #2 → APPROVED
```

Historical Approval #1 remains `REJECTED`.

## Order Separation

No Approval states are added to Order. Order remains governed by its
approved state machine (Decision Record 0007): `ACTIVE`, `COMPLETED`,
`CANCELLED`. Order state does not mirror Approval state.

Approval is one of the separate entities that may participate in the
guard logic for Order `ACTIVE` → `COMPLETED`, but the exact guard
mechanics remain **DEFERRED** until the Delivery State Machine and
remaining orchestration decisions are designed. This record does not
invent the final Order completion guard.

## Target Model

The exact approvable target types, target model/database representation,
target cardinality, and physical FK implementation are **not decided** by
this record. Not finalized: `target_type` values, `target_id`
implementation, nullable target FK columns, exact target cardinality,
physical FK implementation. All remain **DEFERRED**, consistent with
Decision Record 0002, D6, which left the approvable target set
unresolved.

## Expiration

`EXPIRED` is an approved Approval state. The following remain
**DEFERRED**: expiration duration, who defines expiration, automatic
expiration mechanism, scheduled job vs. on-read evaluation, whether all
Approval types have expiration, and the exact expiration trigger.

## Cancellation

`CANCELLED` is an approved Approval state. Not invented by this record:
automatic cancellation cascades, who can cancel, cancellation side
effects, automatic Order cancellation, automatic refund, automatic
financial reversal, or automatic production cancellation. Authorization
and orchestration remain **DEFERRED**.

## Order Completion

Decision Record 0007 identified Approval and Delivery as dependencies for
the future Order `ACTIVE` → `COMPLETED` guard. This Approval State Machine
does not define that guard. Not finalized: required approvals, whether
one or multiple approvals are required, which Approval target satisfies
Order completion, the relationship to Delivery completion, or the exact
orchestration. All remain **DEFERRED**.

## Approval vs. Delivery

Approval and Delivery are separate entities and are not merged. Not added
to Approval: `DELIVERED`, `DELIVERY_PENDING`, `DELIVERY_APPROVED`. The
exact interaction between Approval and Delivery remains **DEFERRED**
until the Delivery State Machine is designed.

## Retry / New Approval

There is no `RETRY` state and no reopening of a terminal Approval. If a
new decision is required, a new Approval record is created.

## Historical Integrity

Terminal Approval records remain historically meaningful and are never
overwritten to simulate a new approval cycle. Each new approval decision
cycle creates a new Approval record.

## Financial Separation

Approval is not Payment, Revenue, Expense, Provider Credit, Financial
Ledger, Profit, Reserve, or Owner Settlement. Approval decisions do not
directly imply financial events. Any financial consequence is handled
through the appropriate financial system and its authoritative ledger.

## Provider / AI Separation

Approval does not contain provider-specific AI states. Not added:
`HIGGSFIELD_APPROVED`, `AI_APPROVED`, `GENERATION_APPROVED`,
`PROVIDER_APPROVED`. AI Generation remains governed by Decision Record
0009.

## Idempotency

External/repeated decision submissions or callbacks must be handled
idempotently where applicable. This is recorded as a requirement only —
idempotency is not implemented by this record. No database tables,
idempotency code, API handlers, or migrations are created. This Decision
Record is documentation only.

## Rejected Alternatives

Explicitly rejected: `DRAFT`, `REQUESTED`, `IN_PROGRESS`,
`REVISION_REQUIRED`, `QC_PENDING`, `QC_PASSED`, `QC_FAILED`,
`CLIENT_PREVIEW`, `DELIVERY`, `DELIVERED`, Payment states, Financial
states, `RETRY`, reopening terminal Approval records, and provider-
specific Approval states.

## Deferred Items

1. Exact approvable target types.
2. Exact target model/database representation.
3. Target cardinality and FK enforcement.
4. Who may create an Approval.
5. Who may approve/reject/cancel.
6. Client vs. internal Approval semantics.
7. Expiration duration.
8. Expiration mechanism.
9. Cancellation authorization.
10. Cancellation side effects.
11. Approval → Revision orchestration.
12. Approval ↔ Delivery orchestration.
13. Exact Order `ACTIVE` → `COMPLETED` guard.
14. Required number/type of approvals for Order completion.
15. Exact database `CHECK` constraints.
16. Tenant/RLS implementation.
17. Idempotent decision submission implementation.
18. API/provider integration details.

## Consequences

This design:

- Preserves separation of concerns.
- Keeps QC independent from client/authorization decisions.
- Prevents Approval from becoming an Asset/Order/Production state
  machine.
- Preserves historical approval decisions.
- Supports multiple approval cycles through new Approval records.
- Keeps provider behavior abstract.
- Leaves target typing and orchestration open until explicitly decided.
- Provides the conceptual dependency needed for future Order completion
  guard design.
- Does not infer financial consequences from approval status.

## Consistency with Decision Records 0001–0009

- Consistent with 0001/0002: UUID identity, tenant scoping via
  `organization_id` and the composite-FK pattern (D1), `TEXT`+`CHECK`
  state representation (D8), archive via `status`+`archived_at` (D5), the
  financial separations, and Approval's separate-entity/generic-target
  status (D6) — target set still unresolved, unchanged here.
- Consistent with 0003 (Campaign), 0004 (Brief), 0005 (Quote): does not
  reproduce their state vocabularies or reopen their terminal states.
- Consistent with 0006 (Asset): Asset `APPROVED`/`DELIVERED` values were
  already rejected there in favor of separate Approval/Delivery entities;
  this record is the entity those rejections pointed to, and it does not
  reach back into Asset's own state.
- Consistent with 0007 (Order): Approval is named as a dependency for the
  Order completion guard, without this record defining that guard.
- Consistent with 0008 (Production Job) and 0009 (AI Generation): mirrors
  the same new-record-instead-of-reopening-terminal-state convention, and
  does not introduce provider-specific states.
- No Decision Record 0001–0009 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume any transition not explicitly listed above is valid.
- Do not assume `APPROVED`, `REJECTED`, `CANCELLED`, or `EXPIRED` can be
  reopened.
- Do not assume `APPROVED` implies QC passed, or `REJECTED` implies QC
  failed.
- Do not assume Approval has any Campaign, Order, Payment, Production
  Job, AI Generation, Asset, QC, Delivery, or financial state values.
- Do not assume the approvable target set, target model, or target
  cardinality has been decided.
- Do not assume expiration duration/mechanism or cancellation
  authorization/side effects have been decided.
- Do not assume the Order `ACTIVE` → `COMPLETED` guard has been finalized.
- Do not assume idempotency has been implemented.
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0009 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
