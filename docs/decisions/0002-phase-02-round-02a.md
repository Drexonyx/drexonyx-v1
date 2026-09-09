# Decision Record 0002 — Phase 02 Round 02A

- **Decision Round:** 02A
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Supersedes/modifies Decision Record 0001:** No. Decision Record 0001
  (Round 01) is authoritative and unchanged. This record adds decisions on
  top of it; it does not reinterpret or revise any Round 01 decision.

## Scope

This record captures the decisions explicitly approved in Phase 02 /
Decision Round 02A: resolutions for D1–D8 (introduced as proposals in
Round 02 planning) and a set of specific relationship cardinalities/
structures. It records architecture direction only. Nothing is
implemented, installed, configured, or provisioned as a result of this
record.

## Approved Decisions D1–D8

**D1 — Cross-tenant FK enforcement.** Use composite foreign keys
containing `(parent_id, organization_id)`, together with backend
organization-scoping/validation and PostgreSQL RLS. A tenant-owned child
must not be able to reference a parent belonging to another Organization.
Every tenant-owned parent participating in such relationships must support
the composite reference through an appropriate uniqueness constraint. Not
implemented as part of this record.

**D2 — UUID generation.** UUID v7. Generated application-side through the
approved Drizzle data layer, not via a PostgreSQL UUID-v7
extension/version. Drizzle is not installed as part of this record; UUID
generation is not implemented.

**D3 — Versioning.** Version Price Configuration and Brand DNA using
historical/effective-dated versions rather than silently mutating the
historical meaning of these records. Exact physical versioning columns and
reference strategy remain later schema-design work. Not implemented.

**D4 — Idempotency.** Use a centralized `system.idempotency_keys`
mechanism, supporting idempotency for: payment webhooks, payment
confirmations, refunds, AI callbacks, delivery confirmations, and financial
events. Exact physical columns/constraints remain schema-design work. Not
implemented.

**D5 — Archive / delete.** For archivable entities, use both a `status`
column and an `archived_at` column — `archived_at` is not a substitute for
every workflow state. Default FK delete behavior is `ON DELETE RESTRICT`;
no cascading deletion unless a later explicit decision approves a specific
exception. Not implemented.

**D6 — Approval.** Approval remains one separate entity. Use a typed
target model with nullable target FK columns and a constraint requiring
exactly one target. **The approvable target set is not yet approved** and
is not invented by this record — it will be decided separately before
physical schema design. Not implemented.

**D7 — Asset ↔ AI Generation.** Generated Asset is the existing `Asset`
entity (per Round 01 D7, unchanged). AI Generation provenance is
represented through a many-to-many join relationship: AI Generation ↔ AI
Generation Asset ↔ Asset. Reason: one generation operation may produce
multiple candidate outputs; this preserves provenance without a separate
"Generated Asset" entity. Not implemented.

**D8 — State representation.** Use `TEXT` + `CHECK` constraints for
state/status representation. Do not use PostgreSQL native `ENUM` types.
The actual state values and transition rules are **not approved yet** and
will be decided in the State Machine decision rounds. No `CHECK`
constraints are created as part of this record.

## Approved Relationships

1. **Organization → User.** Use Organization → Organization Membership →
   User. A User may belong to multiple Organizations through memberships.
   Membership is the tenant membership boundary. Authentication and RBAC
   are not implemented in this round.

2. **Quote → Order.** 1 Quote → 1 Order. An accepted Quote produces at
   most one Order.

3. **Order → Order Budget.** 1 Order → 1 Order Budget. Phased/multiple
   budgets are not modeled in V1.

4. **Order → Expense.** Expense belongs to Order Budget. No second direct
   Order → Expense foreign key is created unless a future explicit
   decision requires it. The Order is derivable through Order → Order
   Budget → Expense, avoiding two competing sources of truth.

5. **Reserve / Owner Settlement.** Reserve and Owner Settlement are
   company/owner financial entities, not client-tenant entities, and must
   not be treated as ordinary Client Organization-owned records. Owner
   Settlement can draw from multiple Reserves, and a Reserve can be
   consumed by multiple Owner Settlements — the eventual physical model
   must support allocation between them rather than a simple one-to-one
   foreign key. Exact allocation-table design is later schema work.

6. **Audit Event.** Uses a polymorphic reference model: `entity_type`,
   `entity_id`, `organization_id`. Audit Event is cross-cutting and may
   audit many different entity types. It is not forced into the Approval
   target model (D6). Audit Event remains append-only.

7. **Immutability.** Financial/audit history must not be freely mutable.
   At minimum this applies to: Financial Ledger, Audit Event, Owner
   Settlement, Expense, and captured financial Payment history.
   Corrections are represented through controlled new events, never by
   rewriting historical facts. The exact database enforcement mechanism
   (DB role permissions, triggers, or a layered approach) is **not yet
   approved** and remains unresolved until a later decision.

## Approved QC / Production Control Principle

Production → QC → PASS → Client Preview.

If QC fails: QC FAIL → Fix/Revision → Production → QC AGAIN.

A final production workflow must not bypass QC. The exact state-machine
values and transition rules remain unapproved and belong to the next State
Machine decision rounds.

## Deferred Decisions / Explicitly Unresolved Items

The following are explicitly **not decided** by this record and must not
be treated as resolved:

- Order, Campaign, Payment, Production Job, QC Review, Revision, Approval,
  Delivery, User, Organization, Brand, Brief, Asset, and all other entity
  state values.
- Exact Approval target types (the approvable target set).
- Exact UUID helper implementation.
- Exact versioning column design (Price Configuration, Brand DNA).
- Exact idempotency column design (`system.idempotency_keys` schema).
- Exact RLS policy design.
- Exact database immutability enforcement mechanism.
- Exact FK/index implementation.
- Exact audit metadata structure.
- Exact Reserve/Settlement allocation-table design.
- Exact Asset/AI Generation join-table columns.
- Any schema, table, or column implementation whatsoever.

## Architectural Consequences

- Every tenant-owned parent table will need a composite uniqueness
  constraint (D1) to support composite FK references from children.
- UUID generation becomes an application-layer (Drizzle) responsibility,
  not a database default.
- Price Configuration and Brand DNA will require history-preserving
  storage (versioned rows), not simple in-place updates.
- A shared idempotency mechanism centralizes duplicate-operation
  protection across payment, AI callback, delivery, and financial event
  paths, rather than per-table ad hoc uniqueness.
- Archivable entities carry two independent signals (`status`,
  `archived_at`); default delete behavior across the schema is
  restrictive, not cascading.
- Approval's physical shape (nullable-column-per-target) is fixed in
  principle, but cannot be finalized until the approvable target set is
  decided.
- AI Generation provenance requires a join table, not a direct FK, because
  the relationship to Asset is many-to-many.
- No native Postgres `ENUM` types will be introduced anywhere in this
  schema for status/state columns.
- Order's expense trail is single-sourced through Order Budget; no
  parallel direct Order↔Expense link exists.
- Reserve and Owner Settlement sit outside the client-tenant model and
  will need an allocation (many-to-many) structure rather than a simple FK.
- Audit Event's polymorphic design is independent of, and need not mirror,
  Approval's typed-column design.
- Production workflows must route through QC before reaching Client
  Preview; no schema or workflow path should be designed that allows
  bypassing QC.

## Explicitly Prohibited Assumptions

- Do not assume any state/status value for any entity has been decided.
- Do not assume the Approval target set has been decided.
- Do not assume the immutability enforcement mechanism has been decided.
- Do not assume RLS policies, indexes, or FK implementation details have
  been decided.
- Do not assume the idempotency table's columns have been decided.
- Do not assume the versioning column design for Price Configuration or
  Brand DNA has been decided.
- Do not assume the Reserve/Settlement allocation table's design has been
  decided.
- Do not assume the Asset/AI Generation join table's columns have been
  decided.
- Do not assume this record authorizes implementation, dependency
  installation, migration creation, database creation, or credential
  creation.
- Do not assume Decision Record 0001 has been altered, reinterpreted, or
  superseded — it remains authoritative and unchanged.
