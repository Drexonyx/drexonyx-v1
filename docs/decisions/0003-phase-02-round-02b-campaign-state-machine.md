# Decision Record 0003 — Phase 02 Round 02B: Campaign State Machine

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Record 0001
  (Round 01) or Decision Record 0002 (Round 02A). Both remain authoritative
  and unchanged. This record supersedes any previous unresolved Campaign
  state-value proposal from Round 02 planning (the illustrative Campaign
  state list in that planning document was explicitly marked unapproved
  and is superseded by the values below).

## Scope

This record captures the Owner-approved Campaign lifecycle state machine
only. It records the ordered lifecycle states, their meanings, and a small
set of explicit workflow rules constraining how those states may be used.
Nothing is implemented, installed, configured, migrated, or provisioned as
a result of this record.

## Approved Campaign States

Ordered lifecycle:

1. `DRAFT`
2. `BRIEFING`
3. `PRE_FLIGHT`
4. `STRATEGY`
5. `QUOTE_PENDING`
6. `APPROVAL_PENDING`
7. `ORDERED`
8. `IN_PRODUCTION`
9. `QC`
10. `CLIENT_PREVIEW`
11. `REVISION`
12. `FINAL_APPROVAL`
13. `DELIVERY`
14. `CLOSED`

Additional terminal state:

- `CANCELLED` — a separate terminal state, not an archive state.

## State Meanings

- **DRAFT** — Campaign created but active preparation has not started.
- **BRIEFING** — Campaign brief and required assets are being prepared.
- **PRE_FLIGHT** — AI Pre-Flight is validating brief, assets, product,
  technical requirements, brand constraints, feasibility, estimated
  production, and related readiness requirements.
- **STRATEGY** — Creative Strategy is being prepared.
- **QUOTE_PENDING** — Quote/pricing is being prepared or awaits completion.
- **APPROVAL_PENDING** — Waiting for required client approval of the
  Quote/Commercial decision.
- **ORDERED** — An Order has been created and the campaign has entered the
  ordered workflow.
- **IN_PRODUCTION** — Production work is actively proceeding.
- **QC** — Production output is undergoing Quality Control.
- **CLIENT_PREVIEW** — QC-passed output is available to the client for
  review.
- **REVISION** — A client revision is active and requires another
  production/QC cycle.
- **FINAL_APPROVAL** — Waiting for final client approval.
- **DELIVERY** — Final approved deliverables are being prepared/transferred
  for delivery.
- **CLOSED** — Campaign lifecycle is complete after required delivery
  completion.
- **CANCELLED** — Campaign was cancelled and will not continue through the
  normal lifecycle.

## Approved Workflow Rules

1. QC cannot be bypassed.
2. Revision must return to production and then QC: `REVISION` →
   `IN_PRODUCTION` → `QC`.
3. QC pass can proceed to: `QC` → `CLIENT_PREVIEW`.
4. Campaign completion must not be inferred merely from payment,
   production completion, or client preview.
5. Final completion requires the approved final workflow and delivery.
6. `archived_at` is not a Campaign state; archiving remains separate from
   lifecycle status.
7. `CANCELLED` is distinct from archived.
8. No automatic transitions are approved beyond what is explicitly stated
   in this record.

## Payment / Order Boundary

- `ORDERED` means an Order exists for the Campaign. `ORDERED` is not
  redefined as a payment state — Payment state remains owned by the
  Payment/financial workflow.
- Production must still respect the approved financial rule: chargeable AI
  production cannot begin before required funding/authorization.
- The exact Payment → Order → Campaign transition logic is **not decided**
  by this record; it belongs to the Payment and Order State Machine
  decisions.

## Delivery Boundary

- Campaign includes `DELIVERY` as a lifecycle state.
- The Delivery entity remains a separate entity and source of truth for
  delivery-specific records. Delivery entity state is not collapsed into
  Campaign state.
- Delivery entity state values are **not decided** by this record.

## Transition Policy

- The lifecycle ordering above is recorded as the approved sequence. This
  record does not claim that every adjacent-state transition is
  automatically valid in every circumstance.
- The following are explicitly **not invented** by this record: retry
  transitions, rejection transitions, rollback transitions, timeout
  transitions, permission rules, actor rules, webhook transitions,
  payment-trigger rules, AI-trigger rules. These are deferred to later
  State Machine decisions where relevant.

## Deferred / Unresolved Items

The following remain explicitly unresolved and must not be treated as
decided:

- Exact transition guards.
- Actor permissions per transition.
- Payment-related transition rules.
- Order-related transition rules.
- AI production transition rules.
- Retry/error transitions.
- Rollback rules.
- Timeout behavior.
- Notification triggers.
- Exact database `CHECK` constraint implementation.
- Exact schema implementation.

## Architectural Consequences

- The `campaign.status` column (per Decision Record 0002, D8: `TEXT` +
  `CHECK`, no native `ENUM`) will validate against exactly the 15 values
  above once the `CHECK` constraint is implemented — implementation is not
  performed by this record.
- Campaign's `archived_at` column (per Decision Record 0002, D5) remains
  fully independent of `status`; a Campaign can be `CLOSED` or `CANCELLED`
  without being archived, and vice versa.
- Any future Order or Payment state machine must be designed to reference
  `ORDERED` without redefining its meaning as a payment/funding signal.
- Any future Delivery state machine is independent of this record and must
  not be inferred from it.

## Explicitly Prohibited Assumptions

- Do not assume any transition not explicitly listed above is valid.
- Do not assume retry, rejection, rollback, timeout, permission, actor,
  webhook, payment-trigger, or AI-trigger rules have been decided.
- Do not assume Payment, Order, Production Job, QC Review, Revision,
  Approval, or Delivery state values have been decided by this record.
- Do not assume `ORDERED` means payment has been received or authorized.
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001 or 0002 have been altered,
  reinterpreted, or superseded — both remain authoritative and unchanged
  except where this record explicitly supersedes the prior unapproved
  Campaign-state proposal from Round 02 planning.
