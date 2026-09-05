# Decision Record 0071 — Phase 10: Skill Output Persistence Model

- **Decision Round:** Phase 10
- **Phase:** 10 — Skills
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration, or
  implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `c216622`
- **Resolves:** Phase 10 Planning Blocker B2 (no persistence table for skill
  creative outputs — scripts, hooks, strategies, shot lists)
- **Relationship to prior records:** Does not modify Decision Records
  0001–0069. All remain authoritative and unchanged. Depends on DR 0070
  (source content model).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0069.

---

## 1. Context

**FACT (verified schema):** No table currently exists in any pgSchema
namespace for persisting skill-generated creative artifacts. The
`production.assets` table stores binary media assets with a `file_key`; it
is not suited for structured text outputs such as scripts, strategies, or shot
lists. The `system.audit_events` table is append-only and payload-limited; it
is not suited as a primary queryable store for creative content.

**FACT (Phase 10 Planning):** Phase 10 Skills produce structured outputs of
at least three distinct kinds:
1. **Creative text artifacts:** ad scripts, video hooks, voiceover copy, shot
   list descriptions (CREATIVE_PRODUCTION family skills).
2. **Analytical judgments:** QC pass/fail verdicts with reasoning (QC family
   skills — but `production.qc_reviews` already exists for authoritative QC
   verdicts on assets).
3. **Strategic documents:** brand strategy outlines, campaign angle
   recommendations (STRATEGY family skills).

**FACT (verified schema, `production.qcReviews`):** The existing `qc_reviews`
table has columns `verdict`, `notes`, `asset_id`, `reviewer_id`. QC skill
verdicts on assets can be persisted to this table. This record does NOT create
a redundant QC output store; `qc_reviews` remains authoritative for asset
verdicts.

**FACT (Phase 10 Planning):** Strategy and Creative skill outputs have no
existing destination table. A new table is required for these skill output
types.

**FACT (Phase 09, DR 0064, DR 0065):** The Phase 09 agent runtime uses
`actor_id = production_job_id` and `actor_role = 'AGENT'` for audit events.
Human actors use their `user_id` and an `AdminRole`. The invocation actor for
skill outputs must be representable as either a human user or the agent
runtime without requiring a new actor table.

---

## 2. Decision

### 2.1 New Table: `production.skill_outputs`

**APPROVED:** Create a new table `production.skill_outputs` in the
`production` pgSchema:

```sql
CREATE TABLE production.skill_outputs (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES core.organizations(id),
  skill_id          TEXT NOT NULL,          -- e.g., 'brief.analyze'
  skill_version     TEXT NOT NULL,          -- semver string per DR 0074
  entity_type       TEXT NOT NULL,          -- e.g., 'brief', 'campaign', 'asset'
  entity_id         UUID NOT NULL,          -- source entity (polymorphic ref)
  actor_id          UUID NOT NULL,          -- human user_id OR production_job_id (agent)
  actor_type        TEXT NOT NULL,          -- 'USER' | 'AGENT'
  actor_role        TEXT NOT NULL,          -- role at invocation time
  status            TEXT NOT NULL DEFAULT 'PENDING',
  output            JSONB,                  -- structured skill output payload
  error             TEXT,                   -- error message if status = 'FAILED'
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### 2.2 Actor Reference Model

**APPROVED:** The `actor_id`, `actor_type`, and `actor_role` columns together
represent the invocation actor. No new actor table is introduced. This design
is consistent with the polymorphic reference pattern established for
`system.audit_events` in Phase 09 (DR 0064):

- **Human invocation:** `actor_id` = the invoking user's UUID (from
  `identity.users`), `actor_type` = `'USER'`, `actor_role` = the user's role
  in the organization at invocation time (e.g., `'CREATIVE_PRODUCTION'`).
- **Agent invocation (authorized by DR 0075 §2.2, Option B):** `actor_id` =
  the `production_job_id` whose Service Token authorized the invocation,
  `actor_type` = `'AGENT'`, `actor_role` = `'AGENT'`.

**APPROVED:** `actor_id` is a UUID reference. It is NOT declared as a foreign
key at the database level because it is polymorphic (it may reference
`identity.users.id` or `production.production_jobs.id` depending on
`actor_type`). The application layer is responsible for populating it
correctly. This is consistent with the polymorphic reference pattern used in
`system.audit_events`.

**APPROVED:** `actor_id` is NOT NULL. A skill output record MUST always
identify its invoking actor. Anonymous invocation is prohibited.

### 2.3 Status Values

**APPROVED:** `status` values for `skill_outputs`:

```
PENDING     -- skill invocation accepted, not yet complete
RUNNING     -- skill is executing (AI call in flight)
SUCCEEDED   -- skill completed; output populated
FAILED      -- skill failed; error populated
```

### 2.4 Output Field Structure

**APPROVED:** The `output` JSONB field carries a skill-family-specific
structure. Each skill family defines its own output schema (documented in the
skill implementation, authorized per DR 0072). The persistence model does not
enforce a fixed output shape at the database level; shape validation is the
skill's responsibility at the application layer.

Rationale: skill output structures vary significantly across families (a
script differs from a QC judgment differs from a strategy outline). A JSONB
column with application-level validation is appropriate.

### 2.5 Indexes

**APPROVED:**

```sql
INDEX ON (organization_id)
INDEX ON (organization_id, entity_type, entity_id)
INDEX ON (organization_id, skill_id)
INDEX ON (status)
```

### 2.6 QC Skill Output Routing

**APPROVED:** QC skills (family `qc`) that produce an ASSET verdict MUST
write the authoritative verdict to `production.qc_reviews` (not to
`production.skill_outputs`). QC skills MAY additionally write a record to
`production.skill_outputs` for audit trail and output history purposes, but
the authoritative QC result is always in `production.qc_reviews`.

Rationale: `qc_reviews` is the established authoritative store for asset
verdicts. Routing the authoritative verdict there preserves compatibility with
existing downstream workflows that read `qc_reviews`.

### 2.7 Immutability After Success

**APPROVED:** A `skill_outputs` row with `status = 'SUCCEEDED'` is immutable.
No update to `output` is permitted after a row reaches `SUCCEEDED`. A
corrected or improved output requires a new invocation and a new row.

### 2.8 Tenant Isolation

**APPROVED:** All reads and writes to `production.skill_outputs` MUST be
scoped by `organization_id`. Cross-organization access is prohibited.

### 2.9 Schema Implications (Not Authorized)

**PROPOSED (schema not authorized):** This decision implies the following
schema changes:

1. Create table `production.skill_outputs` with columns and constraints as
   specified in §2.1.
2. Create indexes as specified in §2.5.
3. Add a `status` CHECK constraint:
   `status IN ('PENDING','RUNNING','SUCCEEDED','FAILED')`.
4. Add an `actor_type` CHECK constraint:
   `actor_type IN ('USER','AGENT')`.

**No schema change is authorized by this record. Any schema migration requires
separate authorization per CLAUDE.md.**

---

## 3. Explicitly Prohibited Assumptions

- Do not assume QC skill verdicts must be stored exclusively in
  `skill_outputs` — the authoritative verdict goes to `qc_reviews` (§2.6).
- Do not assume `output` has a fixed schema — it is skill-defined JSONB (§2.4).
- Do not assume a `SUCCEEDED` row may be updated — it is immutable (§2.7).
- Do not assume `actor_id` is a declared FK to a single table — it is a
  polymorphic UUID reference resolved by `actor_type` (§2.2).
- Do not assume a new actor table is required — the existing polymorphic
  reference pattern from `system.audit_events` is reused (§2.2).
- Do not assume this record authorizes schema changes, migrations, code
  changes, commits, or pushes.
- Do not assume Decision Records 0001–0069 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

1. **`production.skill_outputs` namespace** approved: skill outputs are
   persisted in the `production` pgSchema, not a new `skills` pgSchema.
2. **Polymorphic actor reference model** approved: `actor_id` + `actor_type`
   + `actor_role`, no new actor table. Pattern consistent with
   `system.audit_events` (DR 0064).
3. **QC routing** approved: `qc_reviews` remains the authoritative store for
   QC asset verdicts; an optional audit copy to `production.skill_outputs` is
   permitted.

**No implementation is authorized by approval of this record alone.**
