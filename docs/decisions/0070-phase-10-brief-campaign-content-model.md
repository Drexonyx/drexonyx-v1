# Decision Record 0070 — Phase 10: Brief and Campaign Content Model

- **Decision Round:** Phase 10
- **Phase:** 10 — Skills
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration, or
  implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `c216622`
- **Resolves:** Phase 10 Planning Blocker B1 (`commercial.briefs` has no
  content fields) and Blocker B7 (`commercial.campaigns` has no content
  fields beyond `name` and `status`)
- **Relationship to prior records:** Does not modify Decision Records
  0001–0069. All remain authoritative and unchanged.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0069. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (verified schema, `commercial.briefs`):** The current `briefs` table
has the following columns:

```
id                UUID PRIMARY KEY
campaign_id       UUID NOT NULL
organization_id   UUID NOT NULL
status            TEXT NOT NULL
archived_at       TIMESTAMP
created_at        TIMESTAMP NOT NULL
updated_at        TIMESTAMP NOT NULL
```

There are no content fields. The table stores lifecycle state only.

**FACT (verified schema, `commercial.campaigns`):** The current `campaigns`
table has the following columns:

```
id                UUID PRIMARY KEY
organization_id   UUID NOT NULL
name              TEXT NOT NULL
status            TEXT NOT NULL
archived_at       TIMESTAMP
created_at        TIMESTAMP NOT NULL
updated_at        TIMESTAMP NOT NULL
```

There are no content fields beyond `name` and `status`.

**FACT (Phase 10 Planning):** Phase 10 Skills include Brief-Analysis skills
and Campaign-Strategy skills. These skills require structured content inputs
from briefs and campaigns respectively. Without content fields on these tables,
Brief-Analysis and Campaign-Strategy skills have no actionable source data to
read.

**FACT (Phase 10 Planning):** Strategy skills (e.g., `strategy.campaign.develop`)
must read campaign objectives and constraints. Brief-Analysis skills (e.g.,
`brief.analyze`) must read client brief text, deliverable specifications, and
timeline expectations.

---

## 2. Decision

### 2.1 Content Fields for `commercial.briefs`

**APPROVED:** Add the following columns to `commercial.briefs`:

```sql
brief_text          TEXT    -- nullable; raw client brief content
deliverables        TEXT    -- nullable; description of requested deliverables
target_audience     TEXT    -- nullable; client-specified audience description
timeline_notes      TEXT    -- nullable; client timeline expectations or constraints
additional_notes    TEXT    -- nullable; supplementary context from client
```

- **Type:** All TEXT. Brief content is unstructured prose; no format assumption
  is imposed.
- **Nullable:** Yes. Briefs may be created before content is entered; content
  may be added incrementally.
- **No financial fields:** Brief content fields are non-financial. Quote and
  pricing data remain in `commercial.quotes` only.

### 2.2 Content Fields for `commercial.campaigns`

**APPROVED:** Add the following columns to `commercial.campaigns`:

```sql
objective           TEXT    -- nullable; campaign objective or goal statement
description         TEXT    -- nullable; campaign description or creative direction
```

- **Type:** TEXT.
- **Nullable:** Yes. Campaigns may be created before full content is available.
- **Rationale for minimal addition:** Campaign identity is captured by `name`;
  deeper creative direction belongs to briefs. Only the fields required by
  Strategy skills are added here.

### 2.3 Skills Are Read-Only Consumers of Brief and Campaign Source Data

**APPROVED:** Phase 10 Skills are read-only consumers of `commercial.briefs`
and `commercial.campaigns` source data. This constraint applies without
exception in V1:

1. **No write-back to source tables.** A skill that generates or improves
   upon brief content produces its result as a skill output (persisted to
   `production.skill_outputs` per DR 0071). The skill MUST NOT write, update,
   or overwrite any field of `commercial.briefs` or `commercial.campaigns`.
   The source tables are input surfaces; they are not destinations for
   skill-generated content.

2. **Skill output is distinct from source content.** If a skill produces an
   improved brief summary, a rewritten objective, or an extracted requirements
   list, that output is a new artifact stored in the skill output store. It
   does not replace or amend the original brief or campaign record.

3. **All reads scoped by `organization_id`.** Skills MUST scope all queries
   against `commercial.briefs` and `commercial.campaigns` by `organization_id`.
   Cross-organization access is prohibited (tenant isolation; all prior records).

4. **No access to `commercial.quotes`.** Skills MUST NOT read or return fields
   from `commercial.quotes` (financial boundary; DR 0002 §D).

### 2.4 Schema Implications (Not Authorized)

**PROPOSED (schema not authorized):** This decision implies the following
schema changes:

1. Add five columns to `commercial.briefs`: `brief_text`, `deliverables`,
   `target_audience`, `timeline_notes`, `additional_notes` (all TEXT nullable,
   no default).
2. Add two columns to `commercial.campaigns`: `objective`, `description`
   (both TEXT nullable, no default).

**No schema change is authorized by this record. Any schema migration requires
separate authorization per CLAUDE.md.**

---

## 3. Explicitly Prohibited Assumptions

- Do not assume `briefs` content fields are populated at brief creation —
  they are nullable.
- Do not assume skills may write to `commercial.briefs` or
  `commercial.campaigns` — skills are read-only consumers of source tables
  (§2.3).
- Do not assume skill-generated content overwrites or amends source records —
  skill output is a separate artifact persisted to the skill output store (§2.3).
- Do not assume financial fields (from `commercial.quotes`) are accessible to
  skills — they are not.
- Do not assume this record authorizes schema changes, migrations, code
  changes, commits, or pushes.
- Do not assume Decision Records 0001–0069 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

1. **Five `briefs` content fields** (`brief_text`, `deliverables`,
   `target_audience`, `timeline_notes`, `additional_notes`) approved exactly
   as defined in §2.1.
2. **Two `campaigns` content fields** (`objective`, `description`) approved
   exactly as defined in §2.2.
3. **Read-only Skill constraint** (§2.3) approved: Skills are read-only
   consumers of source tables; skill-generated content is output to the skill
   output store, never a write-back to source tables.

**No implementation is authorized by approval of this record alone.**
