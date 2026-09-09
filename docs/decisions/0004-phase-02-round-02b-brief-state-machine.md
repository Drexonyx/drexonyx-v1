# Decision Record 0004 — Phase 02 Round 02B: Brief State Machine

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Record 0001
  (Round 01), Decision Record 0002 (Round 02A), or Decision Record 0003
  (Round 02B — Campaign State Machine). All three remain authoritative and
  unchanged.

## Scope

This record captures the Owner-approved Brief lifecycle state machine
only. It records the approved states, transitions, boundaries, and state
definitions. Nothing is implemented, installed, configured, migrated, or
provisioned as a result of this record.

## Approved Brief States

- `DRAFT`
- `SUBMITTED`
- `REVISION_REQUIRED`
- `APPROVED`

## Approved Transitions

- `DRAFT` → `SUBMITTED`
- `SUBMITTED` → `APPROVED`
- `SUBMITTED` → `REVISION_REQUIRED`
- `REVISION_REQUIRED` → `DRAFT`
- `APPROVED` → `REVISION_REQUIRED`

No other transition is approved.

## Approved Boundaries

1. Brief approval is logically separate from AI Pre-Flight. Brief
   `APPROVED` does not mean AI Pre-Flight passed.
2. No `PRE_FLIGHT_PASSED` or `PRE_FLIGHT_FAILED` state exists on Brief. AI
   Pre-Flight remains a Campaign-level validation process (per Decision
   Record 0003).
3. No `ARCHIVED` state exists on Brief. Archiving remains represented
   separately through `status` + `archived_at` (per Decision Record 0002,
   D5).
4. No `CANCELLED` state exists on Brief. Campaign cancellation is handled
   by Campaign state (per Decision Record 0003).
5. Brief revision is distinct from Campaign `REVISION` (Decision Record
   0003) and the production `Revision` entity. Their representations are
   not combined.
6. Brief is not added to the currently approved versioning scope (Decision
   Record 0002, D3 — Price Configuration and Brand DNA only).
7. No additional transitions, retry states, timeout states, actor rules,
   webhook rules, or implementation details are invented by this record.

## State Definitions

- **DRAFT** — Brief is being authored or edited and has not been submitted
  for review.
- **SUBMITTED** — Brief has been submitted for review.
- **REVISION_REQUIRED** — Review determined that changes are required
  before approval.
- **APPROVED** — Brief content has been approved as an input to the
  Campaign's subsequent workflow.

## Deferred / Unresolved Items

The following remain explicitly unresolved and must not be treated as
decided:

- Exact actor/role permissions for each transition.
- Exact transition guards.
- Whether multiple Brief records can be active simultaneously.
- Which Brief is authoritative when a Campaign has multiple Briefs.
- Whether Asset changes after Brief approval require Brief re-review.
- Exact database implementation.
- Exact `CHECK` constraint implementation.

## Architectural Consequences

- The `brief.status` column (per Decision Record 0002, D8: `TEXT` +
  `CHECK`, no native `ENUM`) will validate against exactly the 4 values
  above once the `CHECK` constraint is implemented — implementation is not
  performed by this record.
- Brief's `archived_at` column (per Decision Record 0002, D5) remains
  fully independent of `status`.
- An `APPROVED` Brief may be reopened to `REVISION_REQUIRED` without
  creating a new Brief record or a new version, consistent with Brief
  being outside D3's versioning scope.
- Any future Campaign transition guard that gates `BRIEFING` → `PRE_FLIGHT`
  on Brief status may reference Brief `APPROVED`, but this record does not
  itself define or approve that guard.
- No shared table, entity, or status vocabulary is introduced between
  Brief's revision cycle, Campaign's `REVISION` state, and the production
  `Revision` entity.

## Explicitly Prohibited Assumptions

- Do not assume any transition not explicitly listed above is valid.
- Do not assume Brief `APPROVED` implies AI Pre-Flight has passed.
- Do not assume Brief has an `ARCHIVED` or `CANCELLED` state.
- Do not assume Brief is in the versioning scope established by Decision
  Record 0002, D3.
- Do not assume actor/role permissions, transition guards, multiple-Brief
  authority rules, or Asset-change re-review rules have been decided.
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001, 0002, or 0003 have been altered,
  reinterpreted, or superseded — all three remain authoritative and
  unchanged.
