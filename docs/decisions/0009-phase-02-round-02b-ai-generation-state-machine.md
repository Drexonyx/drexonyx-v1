# Decision Record 0009 — Phase 02 Round 02B: AI Generation State Machine

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0008. All remain authoritative and unchanged.

## Scope

This record captures the Owner-approved AI Generation lifecycle state
machine only: states, transitions, terminal-state behavior, retry
behavior, and the responsibility boundaries against Production Job, QC
Review, Asset, Approval, Delivery, and the financial architecture.
Nothing is implemented, installed, configured, migrated, or provisioned
as a result of this record.

## Context

AI Generation represents **one individual AI generation attempt/call**
within a Production Job (0008: `QUEUED`/`RUNNING`/`COMPLETED`/`FAILED`/
`CANCELLED`, owning the execution-unit lifecycle). AI Generation owns only
the lifecycle of that single generation attempt — a Production Job may
involve zero, one, or multiple AI Generations (0008). This record defines
that narrower scope without duplicating Production Job, QC Review, Asset,
Approval, Delivery, or financial state.

## Decision

AI Generation owns only the lifecycle of one individual generation
attempt.

### Approved States

- `REQUESTED`
- `RUNNING`
- `SUCCEEDED`
- `FAILED`
- `CANCELLED`

### State Definitions

- **REQUESTED** — The generation attempt has been created but has not
  entered active execution.
- **RUNNING** — The generation attempt is actively executing.
- **SUCCEEDED** — The AI generation attempt completed successfully and its
  result is available for downstream handling. **`SUCCEEDED` does not mean
  QC passed.**
- **FAILED** — The individual AI generation attempt failed because of an
  execution/provider/technical failure. **`FAILED` does not mean QC
  failed.**
- **CANCELLED** — The individual generation attempt was intentionally
  cancelled.

### Allowed Transitions

- `REQUESTED` → `RUNNING`
- `REQUESTED` → `CANCELLED`
- `RUNNING` → `SUCCEEDED`
- `RUNNING` → `FAILED`
- `RUNNING` → `CANCELLED`

### Terminal States

`SUCCEEDED`, `FAILED`, `CANCELLED`. No transitions out of any of these.
No reopening.

## Retry Model

Retry does not create a `RETRY` state. A retry creates a **new** AI
Generation record:

```
AI Generation #1 → FAILED
        |
      Retry
        v
AI Generation #2 → REQUESTED
```

The failed generation remains `FAILED`. It is never reopened or mutated
back into `REQUESTED`/`RUNNING`.

## Relationships

- **Production Job → AI Generation:** a Production Job may involve zero,
  one, or multiple AI Generations (per Decision Record 0008, unchanged).
- **Asset ↔ AI Generation:** remains many-to-many as approved in Decision
  Record 0002, D7. Not changed by this record.

## Production Job Separation

Production Job owns the lifecycle of the production work unit. AI
Generation owns the lifecycle of the individual generation attempt. Their
states are not merged.

Valid example: Production Job = `COMPLETED`, AI Generation = `SUCCEEDED`.

Another valid example: Production Job = `COMPLETED`, AI Generation =
`SUCCEEDED`, Asset = `REVISION_REQUIRED`, QC Review = `FAILED`.

## QC Separation

AI Generation does not own QC verdict, QC passed/failed, Asset quality,
client approval, or delivery. Not added to AI Generation: `QC_PENDING`,
`QC_PASSED`, `QC_FAILED`, `APPROVED`, `DELIVERED`.

## Asset Separation

AI Generation does not own the Asset lifecycle; no Asset states are added
to AI Generation. A successful AI Generation may result in an Asset or an
Asset-processing workflow, but Asset state remains owned exclusively by
Asset (Decision Record 0006).

## Financial Separation

AI Generation is not the Financial Ledger, Revenue, Profit, Cash, or Owner
Settlement. Provider Credit remains separate from cash/profit/owner money
per the approved financial architecture. AI Generation may expose
execution usage/cost information needed by the financial system, but it
is not the authoritative financial source of truth.

## Provider Abstraction

No provider-specific states are introduced (e.g. `HIGGSFIELD_PENDING`,
`HIGGSFIELD_RUNNING`, `PROVIDER_QUEUED`, `PROVIDER_FAILED`). DREXONYX
preserves the provider abstraction at this layer. Provider-specific status
mapping is deferred to the AI Provider Integration phase.

## Cancellation

The internal `CANCELLED` state is approved. Not invented by this record:
provider cancellation API behavior, automatic cancellation cascades,
callback-after-cancellation behavior, partial-output handling, or
provider-credit reversal behavior. These remain deferred until provider
integration is verified.

## Idempotency

External AI callbacks/status updates must be handled idempotently so that
duplicate callbacks do not create duplicate state effects, assets, credit
consumption, or financial side effects. This is recorded as a requirement
only — idempotency is not implemented by this record.

## Rejected Alternatives

- `RETRY` as a state (an action creating a new record instead).
- `QUEUED` as an additional AI Generation state (distinct from
  `REQUESTED`).
- Provider-specific states.
- QC states inside AI Generation.
- Asset lifecycle states inside AI Generation.
- Approval/Delivery states inside AI Generation.
- Reopening `FAILED` generations.
- Reopening `CANCELLED` generations.
- Reopening `SUCCEEDED` generations.
- A separate execution-attempt entity at this stage.

## Deferred Items

The following remain explicitly unresolved and must not be treated as
decided:

1. Exact provider status mapping.
2. Provider cancellation capabilities.
3. Callback/webhook verification mechanism.
4. Callback received after cancellation behavior.
5. Timeout semantics.
6. Exact retry limits.
7. Whether Generation-level retry always creates a new Production Job or
   may occur within a new Generation under an existing Job.
8. Generation lineage schema.
9. Exact physical implementation of Asset ↔ AI Generation many-to-many.
10. Exact AI usage/cost fields.
11. Provider-credit reservation/release mechanics.
12. Exact database implementation.
13. Exact `CHECK` constraints.
14. Tenant/RLS implementation.
15. Higgsfield-specific implementation details.

## Consequences

This design:

- Preserves immutable generation provenance (a `FAILED`/`CANCELLED`
  generation is never rewritten; retries are new records).
- Separates execution from QC.
- Separates AI generation from the Asset lifecycle.
- Preserves provider abstraction (no provider-specific states).
- Supports retries without reopening historical attempts.
- Prevents AI Generation from becoming a financial authority.
- Permits multiple generations within a single Production Job.
- Leaves provider-specific behavior for the later integration phase.

## Consistency with Decision Records 0001–0008

- Consistent with 0001/0002: UUID identity, tenant scoping via
  `organization_id` and the composite-FK pattern (D1), `TEXT`+`CHECK`
  state representation (D8), archive via `status`+`archived_at` (D5), the
  financial separations, and the approved Asset ↔ AI Generation
  many-to-many (D7) — unchanged here.
- Consistent with 0003 (Campaign), 0004 (Brief), 0005 (Quote): does not
  reproduce their state vocabularies or reopen their terminal states.
- Consistent with 0006 (Asset): AI Generation success may feed an Asset,
  but Asset's own state (including its versioning/revision behavior)
  remains entirely Asset's concern.
- Consistent with 0007 (Order): does not surface as an Order state.
- Consistent with 0008 (Production Job): mirrors the same
  new-record-instead-of-reopening-terminal-state convention for retries,
  applied at the individual-generation-attempt level rather than the
  execution-unit level; Production Job and AI Generation states are kept
  independent as shown in the examples above.
- No Decision Record 0001–0008 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume any transition not explicitly listed above is valid.
- Do not assume `SUCCEEDED`, `FAILED`, or `CANCELLED` can be reopened.
- Do not assume `SUCCEEDED` implies QC passed, or `FAILED` implies QC
  failed.
- Do not assume AI Generation has any QC, Asset, Approval, Delivery, or
  financial state values.
- Do not assume any provider-specific state or behavior has been decided.
- Do not assume idempotency has been implemented.
- Do not assume cancellation cascade, provider-credit reversal, or
  partial-output rules have been decided.
- Do not assume the exact Asset ↔ AI Generation physical implementation
  has been finalized.
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0008 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
