# Decision Record 0001 — Phase 02 Database Architecture

- **Decision Round:** 01
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`

## Scope

This record captures only the decisions explicitly approved in Phase 02 /
Decision Round 01. It records architecture and tooling direction. It does
not implement, install, configure, or provision anything. No database,
migration, dependency, credential, or hosting resource exists as a result
of this record.

## Decisions

1. **Database technology.** PostgreSQL is the approved database technology
   direction for DREXONYX V1. Hosting/provider selection remains deferred.
   No managed database provider (including Supabase) is selected.

2. **ORM / migration tool.** Drizzle is approved as the database
   schema/migration tooling direction for Phase 02. Not installed as part
   of this record.

3. **Money representation.** Financial amounts use exact decimal-compatible
   storage: `NUMERIC(19,4)` for the amount, with currency stored separately
   as an ISO currency code. Not implemented as part of this record.

4. **Tenant isolation.** Backend authorization/scoping plus PostgreSQL
   Row-Level Security (RLS) as defense-in-depth. RLS does not replace
   authentication or backend authorization; the backend remains
   authoritative.

5. **PostgreSQL schema organization.** Namespaced PostgreSQL schemas are
   approved for logical separation. Initial namespaces: `core`, `identity`,
   `commercial`, `production`, `financial`, `system`. Not created as part
   of this record.

6. **Financial Ledger / profit model.** Financial Ledger is the
   authoritative, immutable financial event ledger. There is no separate
   "Profit Ledger" entity. "Distributable Profit" is a computed value, not
   a standalone entity. Conceptual flow: Financial Ledger → Profit
   Calculation → Reserves → Distributable Profit → Owner Settlement. The
   approved separations are maintained: Payment ≠ Revenue, Provider Credit
   ≠ Cash, Order Budget ≠ Profit, Profit ≠ Owner Settlement. Not
   implemented as part of this record.

7. **Generated Asset model.** "Generated Asset" is not a separate entity.
   The existing `Asset` entity is used for generated media, with
   AI-generation provenance preserved through its relationship to AI
   Generation / Production Job. Not implemented as part of this record.

8. **Approval model.** Approval remains a separate entity and is not a
   Boolean field. A generic target model is approved in principle, so an
   approval can represent approval of an applicable DREXONYX
   resource/milestone without forcing the model to a single entity type.
   The exact target relationships and constraints are deferred to the next
   decision round. Not implemented as part of this record.

9. **Local database environment.** Docker PostgreSQL may be used as the
   local development database environment for Phase 02. Development-only.
   No production/shared database is provisioned as part of this decision.

10. **Hosting / backup / restore.** Production database hosting/provider
    selection remains outside Phase 02 at this point. Production backup
    configuration and production restore-test execution remain a later
    pre-production/production-readiness gate. Neither is configured as
    part of this record.

11. **ARCHITECTURE.md.** Not modified as part of this decision record. Any
    future modification to an authoritative architecture document requires
    a separate, explicit approval.

## Deferred / Unresolved Items

The following are explicitly **not decided** by this record and must not be
treated as resolved:

- State-machine values for Order, Campaign, Production Job, QC Review,
  Payment, Approval, Delivery, or any other stateful entity (deferred to
  the next decision round).
- Exact FK/cardinality details where the approved baseline is silent.
- Exact cross-tenant FK enforcement mechanism.
- Exact UUID generation strategy.
- Exact versioning scope for Brand DNA and other entities.
- Exact idempotency implementation details.
- Exact Approval target relationships and constraints.
- Detailed Asset ↔ AI Generation relationship.
- Any other item not explicitly approved in this record.

## Consequences

- Phase 02 schema design work may proceed only within the boundaries set
  by decisions 1–11 above.
- No decision in this record authorizes writing migrations, installing
  Drizzle or any other dependency, provisioning a database, or creating
  credentials/secrets — those remain separately gated.
- Future decision rounds (starting with state machines) build on this
  record without needing to re-litigate decisions 1–11.

## Explicitly Prohibited Assumptions

- Do not assume a managed hosting provider (including Supabase) has been
  selected.
- Do not assume RLS replaces backend authorization.
- Do not assume "Profit Ledger" exists as an entity, or that "Distributable
  Profit" is stored rather than computed.
- Do not assume "Generated Asset" is a distinct entity from `Asset`.
- Do not assume Approval's target relationships/constraints are decided.
- Do not assume any state-machine values for any entity.
- Do not assume this record authorizes implementation, installation,
  migration creation, database creation, or credential creation.
