# Decision Record 0008 — Phase 02 Round 02B: Production Job State Machine

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0007. All remain authoritative and unchanged.

## Scope

This record captures the Owner-approved Production Job lifecycle state
machine only: states, transitions, terminal-state behavior, retry/revision
behavior, and the responsibility boundaries against Campaign, Order,
Payment, Financial Ledger, Provider Credit, QC Review, Approval, and
Delivery. Nothing is implemented, installed, configured, migrated, or
provisioned as a result of this record.

## Context

Production Job represents an executable production unit under an Order.
Prior rounds established Order (0007: `ACTIVE`/`COMPLETED`/`CANCELLED`,
production progress not mirrored into Order state), Campaign (0003, owns
the broader phase narrative), Asset (0006, owns the media/version
lifecycle, each revision creates a new Asset row), and Quote (0005). This
record defines Production Job's own narrow execution-lifecycle scope
without duplicating any of those.

## Decision

Production Job is responsible **only** for the execution lifecycle of a
production work unit.

### Approved States

- `QUEUED`
- `RUNNING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

### State Definitions

- **QUEUED** — Production job exists, is eligible, and is waiting for
  execution.
- **RUNNING** — Execution is actively occurring.
- **COMPLETED** — Execution finished successfully and the expected
  execution output was produced. **`COMPLETED` does not mean QC passed.**
- **FAILED** — A technical/execution failure occurred. **`FAILED` does not
  mean QC failed.**
- **CANCELLED** — Execution was intentionally called off.

### Allowed Transitions

- `QUEUED` → `RUNNING`
- `QUEUED` → `CANCELLED`
- `RUNNING` → `COMPLETED`
- `RUNNING` → `FAILED`
- `RUNNING` → `CANCELLED`

### Terminal States

`COMPLETED`, `FAILED`, `CANCELLED`. None are reopened.

## Responsibility Boundaries

Production Job is **not** the owner of:

- Campaign lifecycle
- Order lifecycle
- Payment state
- Financial truth
- Provider credit truth
- QC verdict
- Client approval
- Delivery state

QC remains owned exclusively by QC Review. Example of valid, independent
concurrent states: Production Job = `COMPLETED`, Asset =
`REVISION_REQUIRED`, QC Review = `FAILED`.

## Retry / Revision Behavior

- **Retry** must create a **new** Production Job row. `FAILED` → `QUEUED`
  on the same row is not implemented.
- **Revision** also creates a new Production Job. Retry and revision are
  distinct concepts even though both create a new job (retry: technical
  failure; revision: QC failure or client-requested change to otherwise-
  successful output).
- No execution-attempt/lineage entity is introduced in V1 at this stage.

## Relationships

- Order → Production Job remains 1:N (unchanged from prior rounds).
- A Production Job may be associated with produced Assets. The direct
  Production Job → Asset relationship is approved conceptually; its exact
  database cardinality is **DEFERRED**.
- Production Job state and Asset state remain independent.
- A Production Job may involve zero, one, or multiple AI Generations. No
  provider-specific state machine is defined here — AI Generation remains
  a separate future state-machine decision.
- Asset ↔ AI Generation remains many-to-many as approved in Decision
  Record 0002.

## QC Separation

QC verdicts are never represented as Production Job states. `QC`,
`QC_PASSED`, and `QC_FAILED` are not created on Production Job. QC Review
is the sole authority on QC outcomes; Production Job's `COMPLETED` state
is reached purely by finishing execution, independent of any later QC
result.

## Financial / Provider Credit Separation

- Production Job may expose execution cost/usage information to the
  financial system, but Production Job is **not** the authoritative
  financial source of truth.
- Provider credits remain separate from cash, profit, and owner
  settlement, consistent with the approved financial architecture.
- No financial state vocabulary is created on Production Job.

## Cancellation

`CANCELLED` is approved as a Production Job state. The following are
explicitly **not** invented by this record: automatic cancellation
cascades from a cancelled Order, provider-credit reversal rules,
partial-output handling rules, or cancellation-authorization rules. These
remain deferred.

## Rejected Alternatives

The following are **not** Production Job states:

- `READY` (no distinct gap identified from `QUEUED`)
- `QC`, `QC_PASSED`, `QC_FAILED` (belong to QC Review)
- `CLIENT_PREVIEW`, `REVISION`, `APPROVED`, `DELIVERED` (belong to
  Campaign/Asset-revision-flow/Approval/Delivery)
- `RETRY` (an action that creates a new row, not a state)
- `ARCHIVED` (represented by `status` + `archived_at`)
- Any provider-specific (e.g. Higgsfield) state

## Deferred Items

The following remain explicitly unresolved and must not be treated as
decided:

- Exact Production Job → Asset cardinality.
- Retry/revision lineage model.
- Whether a dedicated lineage/attempt entity is needed later.
- Exact distinction/metadata for retry vs. revision.
- Authorized cancellation actors.
- Parent Order cancellation behavior (cascade or not).
- In-flight provider-call cancellation behavior.
- Partial outputs after cancellation.
- Provider-credit treatment after cancellation.
- Exact cost/usage exposure mechanism toward the financial system.
- Exact database implementation.
- Exact PostgreSQL `CHECK` constraint implementation.
- Exact tenant/RLS implementation.

## Consequences

- The `production_job.status` column (per Decision Record 0002, D8:
  `TEXT` + `CHECK`, no native `ENUM`) will validate against exactly the 5
  values above once the `CHECK` constraint is implemented — implementation
  is not performed by this record.
- Production Job's `archived_at` column (per Decision Record 0002, D5)
  remains fully independent of `status`.
- A retried or revised Production Job is always a new row; no existing
  terminal-state row is ever mutated back to `QUEUED` or `RUNNING`.
- Any future QC Review, Asset, Approval, Delivery, or financial
  implementation must treat Production Job's `status` as informative only
  about execution, never as a proxy for their own respective verdicts or
  truths.

## Consistency with Decision Records 0001–0007

- Consistent with 0001/0002: UUID identity, tenant scoping via
  `organization_id` and the composite-FK pattern (D1), `TEXT`+`CHECK`
  state representation (D8), archive via `status`+`archived_at` (D5), and
  the financial separations (Payment ≠ Revenue, Provider Credit ≠ Cash,
  Order Budget ≠ Profit, Profit ≠ Owner Settlement).
- Consistent with 0003 (Campaign): does not reproduce Campaign's
  `IN_PRODUCTION`/`QC`/`CLIENT_PREVIEW`/`REVISION` states.
- Consistent with 0005 (Quote) and 0006 (Asset): follows the same
  new-row-instead-of-reopening-terminal-state convention for retries and
  revisions that Asset already established for its own versioning.
- Consistent with 0007 (Order): Order → Production Job remains 1:N;
  Production Job state is never mirrored into Order's `ACTIVE`/
  `COMPLETED`/`CANCELLED` status.
- No Decision Record 0001–0007 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume any transition not explicitly listed above is valid.
- Do not assume `COMPLETED`, `FAILED`, or `CANCELLED` can be reopened.
- Do not assume `COMPLETED` implies QC passed, or `FAILED` implies QC
  failed.
- Do not assume Production Job has any QC, Approval, Delivery, Campaign,
  Order, or financial state values.
- Do not assume a lineage/attempt entity has been introduced.
- Do not assume cancellation cascade, provider-credit reversal, or
  partial-output rules have been decided.
- Do not assume the exact Production Job → Asset cardinality has been
  finalized.
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0007 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
