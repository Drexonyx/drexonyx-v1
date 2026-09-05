# Decision Record 0006 — Phase 02 Round 02B: Asset State Machine

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001, 0002, 0003, 0004, or 0005. All remain authoritative and unchanged.

## Scope

This record captures the Owner-approved Asset lifecycle state machine
only: states, transitions, the QC/Processing/Approval/Delivery/Origin/
Archiving boundaries, and the Asset-versioning principle. Nothing is
implemented, installed, configured, migrated, or provisioned as a result
of this record.

## APPROVED — Asset States

- `UPLOADED`
- `PROCESSING`
- `READY_FOR_QC`
- `CLIENT_PREVIEW`
- `REVISION_REQUIRED`
- `REJECTED`

## APPROVED — Transitions

- `UPLOADED` → `PROCESSING`
- `PROCESSING` → `READY_FOR_QC`
- `READY_FOR_QC` → `CLIENT_PREVIEW` (guard: QC Review must PASS)
- `READY_FOR_QC` → `REVISION_REQUIRED` (guard: QC Review must FAIL)
- `READY_FOR_QC` → `REJECTED`
- `CLIENT_PREVIEW` → `REVISION_REQUIRED`
- `CLIENT_PREVIEW` → `REJECTED`

`REVISION_REQUIRED` and `REJECTED` are terminal for that specific Asset
version/row. Neither is reopened.

## APPROVED — QC Boundary

- QC verdicts are not Asset states. `QC_FAILED` and `QC_PASSED` are not
  created as Asset values.
- The QC Review entity owns the actual QC verdict; Asset transitions react
  to that outcome as a guard, without restating it.
- There is no path by which a failed-QC Asset becomes `CLIENT_PREVIEW` —
  `READY_FOR_QC → CLIENT_PREVIEW` requires a QC pass, and
  `READY_FOR_QC → REVISION_REQUIRED` (the fail path) never routes through
  `CLIENT_PREVIEW`.

## APPROVED — Processing Boundary

- `PROCESSING` is an Asset lifecycle state, not duplicated from Production
  Job state or AI Generation state.
- AI Generation and Production Job each keep their own lifecycle; these
  state axes are not merged with Asset's.

## APPROVED — Approval / Delivery Boundary

- `APPROVED` is not created as an Asset state.
- `DELIVERED` is not created as an Asset state.
- Approval remains a separate entity; Delivery remains a separate entity.
- Asset status remains `CLIENT_PREVIEW` after a successful client-facing
  review — approval and delivery are represented through their respective
  entities, not through further Asset-state advancement.
- Asset state, Approval state, and Delivery state are not collapsed into
  one another.

## APPROVED — Revision / Versioning Principle

- Each revision produces a **new** Asset row/version.
- Conceptual lifecycle: `v1 → QC → Revision → v2 → QC → Approval`.
- The previous version becomes terminal at `REVISION_REQUIRED` when
  revision is required; it is not modified in place afterward.
- No Quote-style versioning, supersedes chain, new versioning schema,
  lineage fields, or lineage tables are introduced by this record.
- The exact lineage/traceability mechanism between versions is
  **DEFERRED**.

**Versioning context note:** this Asset-versioning principle is a
decision **introduced in this round**. It is not a restatement or
reinterpretation of Decision Record 0002's D3, which named only Price
Configuration and Brand DNA in its versioning scope. Decision Record 0002
is not modified or rewritten by this record; this record simply documents,
separately, that Asset now also has an approved versioning principle, with
its physical mechanism left deferred.

## APPROVED — Origin Boundary

- Client-uploaded assets, AI-generated assets, and internally-created
  creative assets use the same Asset lifecycle (the six states above).
- Origin is metadata/provenance, not a separate lifecycle state.
- AI-generated output remains an Asset with AI provenance; Generated Asset
  is not a separate entity (per Decision Record 0002, D7).
- Asset ↔ AI Generation remains many-to-many (per Decision Record 0002,
  D7), unchanged.

## APPROVED — Archiving Boundary

- `ARCHIVED` is not created as an Asset workflow state.
- Archive remains `status` + `archived_at`, consistent with Decision
  Record 0002, D5.

## Rejected / Unnecessary States

The following are **not** Asset states, with reasons:

- `DRAFT` — unnecessary; Asset is a media/file lifecycle, not a
  human-authored document lifecycle.
- `QC_FAILED` / `QC_PASSED` — belong to QC Review, not Asset.
- `APPROVED` — belongs to the Approval entity.
- `DELIVERED` — belongs to the Delivery entity.
- `ARCHIVED` — represented by `status` + `archived_at`.

## Tenant Isolation

The previously approved tenant-isolation architecture (Decision Record
0002, D1) is preserved unchanged. Asset remains tenant-scoped. No
authorization or RLS implementation is performed by this record.

## Deferred / Unresolved Items

The following remain explicitly unresolved and must not be treated as
decided:

- Exact Asset lineage/traceability mechanism.
- Exact database implementation of versions.
- Exact QC Review → Asset transition mechanics.
- Whether Asset is a valid Approval target type.
- Exact actor/role permissions for Asset transitions.
- Exact transition guards beyond the approved QC boundary.
- Exact origin metadata model.
- Exact concurrency behavior.
- Exact PostgreSQL `CHECK` constraint implementation.

## Architectural Consequences

- The `asset.status` column (per Decision Record 0002, D8: `TEXT` +
  `CHECK`, no native `ENUM`) will validate against exactly the 6 values
  above once the `CHECK` constraint is implemented — implementation is not
  performed by this record.
- Asset's `archived_at` column (per Decision Record 0002, D5) remains
  fully independent of `status`.
- A revised Asset is always a new row (new identity), never an in-place
  mutation of a `REVISION_REQUIRED` row.
- Any future Approval or Delivery implementation must reference Asset by
  its own identity without expecting Asset's `status` column to reflect
  approval or delivery outcomes.
- Any future QC Review implementation must be the sole owner of pass/fail
  verdict data; Asset transitions consume that outcome as an external
  guard.

## Explicitly Prohibited Assumptions

- Do not assume any transition not explicitly listed above is valid.
- Do not assume `REVISION_REQUIRED` or `REJECTED` can be reopened.
- Do not assume Asset has `QC_FAILED`, `QC_PASSED`, `APPROVED`,
  `DELIVERED`, `ARCHIVED`, or `DRAFT` states.
- Do not assume a lineage/traceability mechanism between Asset versions
  has been decided.
- Do not assume Asset is an approved Approval target type.
- Do not assume Decision Record 0002's D3 versioning scope has been
  expanded by rewriting 0002 itself — 0002 remains unchanged; this record
  is the separate source of the Asset-versioning principle.
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001, 0002, 0003, 0004, or 0005 have been
  altered, reinterpreted, or superseded — all remain authoritative and
  unchanged.
