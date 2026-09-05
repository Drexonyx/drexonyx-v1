# Decision Record 0005 — Phase 02 Round 02B: Quote State Machine

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001, 0002, 0003, or 0004. All remain authoritative and unchanged.

## Scope

This record captures the Owner-approved Quote lifecycle state machine
only: states, transitions, commercial guards, and boundaries. Nothing is
implemented, installed, configured, migrated, or provisioned as a result
of this record.

## APPROVED — Quote States

- `DRAFT`
- `SENT`
- `ACCEPTED`
- `REJECTED`
- `EXPIRED`
- `CANCELLED`

## APPROVED — Transitions

- `DRAFT` → `SENT`
- `DRAFT` → `CANCELLED`
- `SENT` → `ACCEPTED`
- `SENT` → `REJECTED`
- `SENT` → `EXPIRED`
- `SENT` → `CANCELLED`

**Terminal states:** `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED`. No
reopening of any terminal state is approved.

## APPROVED — State Definitions

- **DRAFT** — Quote is being composed internally.
- **SENT** — Quote has been presented to the client and awaits the
  client's decision.
- **ACCEPTED** — Client has accepted the Quote's terms.
- **REJECTED** — Client has declined the Quote.
- **EXPIRED** — The Quote's validity period has elapsed without
  acceptance.
- **CANCELLED** — The company has withdrawn the Quote before client
  acceptance.

## APPROVED — Commercial Guards

- `DRAFT` → `SENT` requires successful Cost Check and Margin Check.
- Cost Check and Margin Check are **not** separate Quote states. No
  persisted state values are created for them by this record.

## APPROVED — Boundaries

1. Quote state is separate from Campaign state, Order state, Payment
   state, and Approval state.
2. No `PENDING_CLIENT_APPROVAL` state. `SENT` represents the Quote being
   presented to the client and awaiting their decision.
3. Quote `ACCEPTED`, Client Approval, and Order creation remain
   conceptually distinct events; they are not collapsed into one state
   transition or one entity.
4. Quote is not added to the approved versioning scope (Decision Record
   0002, D3). No Quote versioning architecture is introduced.
5. Post-`SENT` changes do not use `SENT` → `DRAFT`. If a sent Quote must
   be changed, the approved direction is: cancel the existing Quote,
   create a new Quote. No supersedes/version chain is created.
6. No `ARCHIVED` state. Archiving remains `status` + `archived_at`
   (Decision Record 0002, D5).
7. No Payment states are created by this record.
8. No Order states are created by this record.
9. No Approval states are created by this record.
10. No Financial Ledger implementation is created by this record.

## APPROVED — Expiry

- The `EXPIRED` state itself is approved.
- The implementation mechanism for determining or persisting expiration
  (scheduled job, evaluated-on-read, lazy transition-on-touch, or any
  other mechanism) is **DEFERRED**, not approved, and not chosen by this
  record.

## APPROVED — Preserved Relationships

- Quote → Order remains 1:1 (unchanged from Decision Record 0002).
- Campaign → Quote remains 1:N (unchanged).

## DEFERRED / UNRESOLVED Items

The following remain explicitly unresolved and must not be treated as
decided:

- Exact actor/role permissions for Quote transitions.
- Exact transition guards beyond the approved Cost Check + Margin Check
  requirement for `DRAFT` → `SENT`.
- Exact Quote validity duration.
- Exact expiry implementation mechanism.
- Whether Cost Check and Margin Check require persisted audit records.
- Exact Approval target relationship for Quote.
- Exact Campaign-level guard when multiple Quotes exist.
- Exact database implementation.
- Exact PostgreSQL `CHECK` constraint implementation.
- Exact concurrency handling around expiration/acceptance.

## Architectural Consequences

- The `quote.status` column (per Decision Record 0002, D8: `TEXT` +
  `CHECK`, no native `ENUM`) will validate against exactly the 6 values
  above once the `CHECK` constraint is implemented — implementation is not
  performed by this record.
- Quote's `archived_at` column (per Decision Record 0002, D5) remains
  fully independent of `status`.
- A revised Quote is always a new row (new identity), never an in-place
  mutation of a `SENT` or later Quote — the old row is `CANCELLED`.
- Any future Order-creation logic must treat Quote `ACCEPTED`, a Client
  Approval record (if Quote is later approved as an Approval target type),
  and Order creation as three separate events/records, not one.
- Any future expiry implementation must be chosen and approved separately;
  this record only fixes that `EXPIRED` is a valid terminal value.

## Explicitly Prohibited Assumptions

- Do not assume any transition not explicitly listed above is valid.
- Do not assume any terminal state (`ACCEPTED`, `REJECTED`, `EXPIRED`,
  `CANCELLED`) can be reopened.
- Do not assume Cost Check or Margin Check have persisted state values or
  audit records.
- Do not assume Quote `ACCEPTED` implies Client Approval or Order creation
  has occurred.
- Do not assume Quote has an `ARCHIVED` state or is in the D3 versioning
  scope.
- Do not assume an expiry implementation mechanism has been chosen.
- Do not assume Quote is an approved Approval target type.
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001, 0002, 0003, or 0004 have been
  altered, reinterpreted, or superseded — all remain authoritative and
  unchanged.
