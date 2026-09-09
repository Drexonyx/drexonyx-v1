# Decision Record 0038 — Phase 05: Brand DNA Schema and Client Portal View

- **Decision Round:** Phase 05
- **Phase:** 05 — Client Portal
- **Status:** APPROVED — explicitly approved by Owner on 2026-09-04.
  Option B (dedicated `brand_dna` table in `core` schema) is the approved
  approach. All other options are superseded.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-04
- **Relationship to prior records:** Does not modify Decision Records
  0001–0037. All remain authoritative and unchanged. This record addresses
  the absence of a Brand DNA schema entity, identified as a Phase 05
  implementation blocker.

## Governance Note

No Brand DNA schema entity exists in any approved Decision Record or schema
file. DR 0001 deferred "exact versioning scope for Brand DNA" explicitly.
Every substantive recommendation below is labeled **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REJECTED**. No schema, migration, dependency, or
application-code change is authorized by this record. All items marked
PROPOSED require explicit Owner approval before implementation.

---

## 1. Context

Phase 05 Client Portal includes a Brand DNA view at a route within the
`/portal/*` namespace, intended to allow CLIENT-role users to view brand
identity information associated with their organization.

No Brand DNA schema entity currently exists in any approved schema file.
`db/schema/core.ts` contains only the `organizations` table (id, name, slug,
archived_at, created_at, updated_at). DR 0001 §7 explicitly deferred "exact
versioning scope for Brand DNA" as an unresolved item. No subsequent Decision
Record has approved a Brand DNA entity.

Implementing the Brand DNA portal view requires either:
(a) a database entity to read from, or
(b) removal of the Brand DNA view from Phase 05 scope.

Phase 05 is read-only for CLIENT users. No write capability for Brand DNA is
proposed for Phase 05.

---

## 2. Decision

**What is being decided:**

1. Whether a Brand DNA entity is introduced for Phase 05.
2. If yes: the entity's minimum approved schema, including namespace,
   primary key, fields, types, nullability, foreign keys, tenant isolation,
   archival behavior, and CLIENT read permissions.
3. If no: whether the Brand DNA portal view is removed from Phase 05 scope.

---

## 3. Options

### Option A — Remove Brand DNA View from Phase 05 Scope (PROPOSED)

Remove the Brand DNA route from the Phase 05 Client Portal. No schema
extension is required. Brand DNA remains a future-phase item, consistent with
DR 0001's explicit deferral of "exact versioning scope for Brand DNA."

**Migration impact:** None.
**Schema change:** None.
**Phase 05 scope change:** Brand DNA route is excluded from `/portal/*`
namespace for Phase 05.

### Option B — Minimal Brand DNA Table in `core` Schema (PROPOSED)

Introduce a `brand_dna` table in the `core` PostgreSQL schema namespace,
with a 1:1 relationship to `organizations`. The table stores human-authored,
organization-scoped brand identity fields editable only by internal roles
(not in Phase 05). CLIENT-role users may read the record for their own
organization via the portal in Phase 05 (read-only).

**Proposed minimum fields:**

| Column | Type | Null | Notes |
|---|---|---|---|
| id | uuid | NOT NULL | UUIDv7, primary key — PROPOSED |
| organization_id | uuid | NOT NULL | FK → core.organizations.id — PROPOSED |
| brand_name | text | NULL | Human-readable brand name — PROPOSED |
| brand_voice | text | NULL | Free-text voice/tone description — PROPOSED |
| visual_guidelines_summary | text | NULL | Summary of visual identity — PROPOSED |
| target_audience | text | NULL | Description of target audience — PROPOSED |
| archived_at | timestamptz | NULL | Soft-delete / archival — PROPOSED |
| created_at | timestamptz | NOT NULL | defaultNow() — PROPOSED |
| updated_at | timestamptz | NOT NULL | defaultNow() — PROPOSED |

All fields marked PROPOSED. None are adopted unless the Owner explicitly
approves this option and its field list.

**Constraints (all PROPOSED):**
- `UNIQUE (organization_id)` — one Brand DNA record per organization.
- FK: `organization_id → core.organizations.id`.
- No state machine introduced; no status field.

**Versioning:** Versioning behavior is DEFERRED. This record does not approve
snapshotting, history tables, or event sourcing for Brand DNA. A single
mutable record per organization is proposed for Phase 05 only.

**Audit:** Audit event recording for Brand DNA writes is DEFERRED. Internal
writes are outside Phase 05 scope; no audit requirement is established here.

**CLIENT read permissions:** CLIENT-role user may read the Brand DNA record
for their own organization (tenant-scoped). Server-side authorization via
`assertRole(userId, organizationId, ['CLIENT'])` is mandatory. No field from
Brand DNA may be returned without this check. Cross-tenant access is
prohibited.

**CLIENT write permissions:** None. Read-only for all external roles in
Phase 05.

**Relationship to Organization:** 1:1. One Brand DNA record per organization.
Whether an organization is required to have a Brand DNA record is DEFERRED
(nullable FK or required are both viable; the UNIQUE constraint does not
enforce presence).

**New state machine:** None introduced. No status enum is proposed for
Brand DNA at this time.

**Migration impact:** One new table (`core.brand_dna`) requiring a migration.
Migration must be approved and executed before Phase 05 schema queries can
run against Brand DNA.

### Option C — Store Brand DNA as JSONB Column on `organizations` (PROPOSED)

Add a `brand_dna` column of type `jsonb` (nullable) to the existing
`core.organizations` table. No new table is introduced.

**Migration impact:** One column addition to `core.organizations`.
**Tradeoff:** Schema-less JSON is less structured and harder to validate
server-side. Does not require a join. Structure is not enforced by the
database. This option is lower cost for Phase 05 but degrades the ability
to query or validate Brand DNA fields independently.

All content within the JSON blob is PROPOSED and not defined by this record.

---

## 4. Reason

DR 0001 explicitly deferred the Brand DNA entity. No subsequent Decision
Record approved it. The Phase 05 CLIENT portal scope includes a Brand DNA
view, creating a direct conflict with the absence of any approved schema.

Option A is the lowest-risk choice: it eliminates the blocker by narrowing
Phase 05 scope, consistent with "Do not implement out-of-scope systems"
(CLAUDE.md). Brand DNA can be fully defined and approved in a later phase
with more context about how internal users author and maintain it.

Option B is appropriate if Brand DNA content is already being maintained
elsewhere and needs to be surfaced to CLIENT users in Phase 05. It introduces
the minimum viable table with nullable fields, avoiding enforcement of
structure before the content is fully understood.

Option C minimizes schema migration cost at the expense of structure and
future queryability.

No option is adopted by this record. All require explicit Owner approval.

---

## 5. Impact

**If Option A is approved:**
- Phase 05 scope is reduced by one route.
- No schema change is needed.
- Brand DNA remains a future-phase decision item.

**If Option B is approved:**
- One new table is added to the `core` schema namespace.
- A migration is required before Phase 05 Brand DNA queries can execute.
- CLIENT read authorization must be implemented server-side.
- Internal write capability for Brand DNA is out of Phase 05 scope and must
  be planned separately.

**If Option C is approved:**
- One column addition to `core.organizations` is required.
- Brand DNA field structure is not database-enforced.
- Internal write capability for Brand DNA is still out of Phase 05 scope.

In all cases: CLIENT users see only their own organization's Brand DNA.
Cross-tenant read access is prohibited. No write access is granted to CLIENT
in Phase 05.

---

## 6. Risks

- **Inventing schema without approval:** If Brand DNA is implemented without
  an explicit Owner decision, fields may be added that conflict with the
  eventual approved Brand DNA model. This record guards against that by
  requiring explicit approval of every field.
- **Scope drift:** Adding Brand DNA to Phase 05 increases the scope of the
  schema migration required. If internal write tooling for Brand DNA does not
  exist at Phase 05 launch, the CLIENT view will always show empty or null
  values, providing no user value.
- **Versioning debt:** A mutable single-record-per-organization model (Option B)
  may be incompatible with future Brand DNA versioning requirements. DR 0001
  deferred versioning scope; a Phase 05 model must not foreclose future
  versioning options by establishing a schema that cannot accommodate them.
- **Under-specified fields:** All field names and types in Option B are
  PROPOSED. If approved without careful review, they may not match how DREXONYX
  actually uses Brand DNA operationally.

---

## 7. Status

**APPROVED — Owner explicitly approved Option B on 2026-09-04.**

Approved decisions:
- Dedicated `brand_dna` table in the `core` PostgreSQL schema namespace.
- 1:1 relationship with `organizations` (one Brand DNA record per org).
- Explicit typed fields as proposed in §3 Option B (not JSONB).
- CLIENT access is read-only in Phase 05.
- Tenant isolation must be preserved (server-side authorization required).
- Versioning behavior remains DEFERRED.
- No additional business capabilities beyond the approved proposal are
  authorized.

Options A and C are superseded and not approved.

---

## Deferred Items

- Exact versioning / history model for Brand DNA (DR 0001 explicit deferral).
- Audit requirements for Brand DNA writes.
- Internal write / edit tooling for Brand DNA (out of Phase 05 scope).
- Whether an organization is required to have a Brand DNA record.
- Brand DNA relationship to any future Brand entity distinct from Organization.
- Field-level validation rules.

## Explicitly Prohibited Assumptions

- Do not assume Brand DNA is approved as an entity.
- Do not assume any specific field list for Brand DNA.
- Do not assume a Brand DNA route exists in Phase 05 until Option A or B or C
  is explicitly approved.
- Do not assume this record authorizes implementation, migration creation,
  schema changes, or dependency installation.
- Do not assume Decision Records 0001–0037 are altered by this record.
